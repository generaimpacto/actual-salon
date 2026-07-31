/* ══════════════════════════════════════════════════════════════
   ACTUAL · Motor de tracking
   Carga Meta Pixel, GA4 y Google Ads según assets/tracking-config.js,
   captura UTMs/click IDs y expone una API para las landings:

     ACTUAL_TRACKING_API.track(nombre, params)  → evento a todas las plataformas
     ACTUAL_TRACKING_API.lead(datos)            → evento Lead + POST a GHL
     ACTUAL_TRACKING_API.whatsappClick(params)  → evento Contact / conversión

   No hay que editar este archivo para activar los píxeles: los IDs
   viven en tracking-config.js.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var config = window.ACTUAL_TRACKING || {};

  // ── Atribución: UTMs y click IDs ──
  // Se capturan de la URL en cada visita y se guardan 30 días, así el
  // lead conserva de qué campaña vino aunque navegue entre páginas.
  var ATTR_KEY = 'actual_attribution';
  var ATTR_TTL = 30 * 24 * 60 * 60 * 1000;
  var ATTR_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

  function readAttribution() {
    try {
      var stored = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
      if (stored && Date.now() - stored.ts < ATTR_TTL) return stored.data;
    } catch (e) { /* localStorage bloqueado o corrupto: seguimos sin atribución */ }
    return {};
  }

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var any = false;
    ATTR_PARAMS.forEach(function (key) {
      if (params.get(key)) { found[key] = params.get(key); any = true; }
    });
    if (!any) return readAttribution();

    // Una visita nueva con UTMs pisa la atribución anterior (last click)
    var merged = found;
    try { localStorage.setItem(ATTR_KEY, JSON.stringify({ ts: Date.now(), data: merged })); } catch (e) {}
    return merged;
  }

  var attribution = captureAttribution();

  // ── Meta Pixel ──
  if (config.metaPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', config.metaPixelId);
    window.fbq('track', 'PageView');
  }

  // ── gtag: GA4 + Google Ads ──
  var hasGtag = config.ga4Id || config.googleAdsId;
  if (hasGtag) {
    var gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + (config.ga4Id || config.googleAdsId);
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    if (config.ga4Id) window.gtag('config', config.ga4Id);
    if (config.googleAdsId) window.gtag('config', config.googleAdsId);
  }

  // ── Helpers internos ──
  function metaTrack(event, params, standard) {
    if (!config.metaPixelId || !window.fbq) return;
    window.fbq(standard ? 'track' : 'trackCustom', event, params || {});
  }

  function ga4Track(event, params) {
    if (!config.ga4Id || !window.gtag) return;
    window.gtag('event', event, params || {});
  }

  function adsConversion(label, params) {
    if (!config.googleAdsId || !label || !window.gtag) return;
    var payload = Object.assign({ send_to: config.googleAdsId + '/' + label }, params || {});
    window.gtag('event', 'conversion', payload);
  }

  // Teléfono argentino a formato internacional (+549 + área + número, 10 dígitos
  // nacionales) para GHL / advanced matching. Devuelve '' si no parece válido.
  // Limitación conocida: un fijo escrito con área (011 4225-1234) es
  // indistinguible de un celular y queda con el 9 de móvil; por eso el payload
  // a GHL también lleva phone_raw con lo que tipeó el usuario.
  function normalizePhone(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 6) return '';

    // Prefijo internacional: solo tratar 549/54 como código de país si el
    // largo da para un número completo (si no, es un local que empieza en 54)
    if (digits.indexOf('00') === 0) digits = digits.slice(2);
    if (digits.indexOf('549') === 0 && digits.length >= 13) digits = digits.slice(3);
    else if (digits.indexOf('54') === 0 && digits.length >= 12) digits = digits.slice(2);

    // 0 de discado nacional (011..., 0299...)
    if (digits.indexOf('0') === 0) digits = digits.slice(1);

    // 15 de celular: al inicio (sin código de área)...
    if (digits.indexOf('15') === 0 && digits.length === 10) {
      digits = digits.slice(2);
    } else if (digits.length === 12) {
      // ...o intercalado después del área de 2-4 dígitos (011 15 2345-6789)
      digits = digits.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    }

    // Local de 8 dígitos sin área: asumimos 11 — el salón está en Lanús (AMBA)
    if (digits.length === 8) digits = '11' + digits;

    if (digits.length !== 10) return '';
    return '+549' + digits;
  }

  // ── Envío del lead a GoHighLevel ──
  function sendToGhl(payload) {
    if (!config.ghlWebhookUrl) return;

    var body = JSON.stringify(payload);

    // Reintento en no-cors: el navegador lo manda igual aunque no pueda leer
    // la respuesta. Con .catch propio para no dejar un unhandled rejection
    // (ad-blocker o sin red). Nunca bloqueamos el paso a WhatsApp.
    function fallback() {
      try {
        fetch(config.ghlWebhookUrl, { method: 'POST', mode: 'no-cors', body: body, keepalive: true })
          .catch(function () { console.warn('ACTUAL: no se pudo enviar el lead a GHL'); });
      } catch (e) { /* sin fetch disponible */ }
    }

    // Intento 1: POST JSON normal (el inbound webhook de GHL responde CORS).
    // Un 4xx/5xx NO rechaza la promesa, así que se chequea res.ok a mano:
    // sin esto, un webhook mal pegado o un workflow despublicado en GHL
    // perdería leads en silencio.
    try {
      fetch(config.ghlWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).then(function (res) {
        if (!res.ok) {
          console.warn('ACTUAL: GHL respondió HTTP ' + res.status);
          fallback();
        }
      }).catch(fallback);
    } catch (e) { fallback(); }
  }

  // ID de lead único por carga de página: permite dedupear en GHL si el
  // usuario edita y reenvía, y viaja como eventID del Lead de Meta (útil si
  // después se suma CAPI desde GHL).
  var leadId = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  var leadPixelsFired = false;

  // ── API pública ──
  window.ACTUAL_TRACKING_API = {

    attribution: function () { return attribution; },

    normalizePhone: normalizePhone,

    // Evento genérico (pasos del formulario, FAQs, etc.)
    track: function (name, params) {
      ga4Track(name, params);
      metaTrack(name, params, false);
    },

    // ViewContent de la landing (Meta) + GA4
    viewContent: function (service) {
      metaTrack('ViewContent', { content_name: service, content_category: 'servicio' }, true);
      // GA4 pide el array items[] para poblar los reportes de ítems
      ga4Track('view_item', { items: [{ item_name: service, item_category: 'servicio' }] });
    },

    // Lead completo: formulario terminado con nombre y teléfono.
    // Los eventos de píxel/conversión se disparan UNA sola vez por carga de
    // página aunque el usuario edite y reenvíe (eso inflaría Meta y Ads);
    // el POST a GHL sí se repite con datos actualizados y el mismo lead_id.
    lead: function (data) {
      var phone = normalizePhone(data.phone);

      if (!leadPixelsFired) {
        leadPixelsFired = true;

        // Advanced matching de Meta con los datos que acaba de dejar
        if (config.metaPixelId && window.fbq && (phone || data.name)) {
          window.fbq('init', config.metaPixelId, {
            ph: phone.replace('+', ''),
            fn: (data.name || '').trim().split(' ')[0].toLowerCase()
          });
        }

        if (config.metaPixelId && window.fbq) {
          window.fbq('track', 'Lead', { content_name: data.service }, { eventID: leadId });
        }
        ga4Track('generate_lead', { service: data.service });
        adsConversion(config.googleAdsLeadLabel);
      }

      var payload = {
        source: 'landing_web',
        lead_id: leadId,
        service: data.service,
        page: window.location.pathname,
        url: window.location.href,
        full_name: (data.name || '').trim(),
        phone: phone || data.phone,
        phone_raw: data.phone
      };

      (data.answers || []).forEach(function (item, i) {
        payload['pregunta_' + (i + 1)] = item.q;
        payload['respuesta_' + (i + 1)] = item.a;
      });

      ATTR_PARAMS.forEach(function (key) {
        if (attribution[key]) payload[key] = attribution[key];
      });

      payload.fecha = new Date().toISOString();
      payload.user_agent = navigator.userAgent;

      sendToGhl(payload);
    },

    // Clic en cualquier botón de WhatsApp
    whatsappClick: function (params) {
      metaTrack('Contact', params || {}, true);
      ga4Track('whatsapp_click', params || {});
      adsConversion(config.googleAdsWhatsappLabel);
    }
  };

  // ── Auto-tracking del botón flotante de WhatsApp (todas las páginas) ──
  document.addEventListener('click', function (e) {
    var float = e.target.closest && e.target.closest('.whatsapp-float');
    if (float) window.ACTUAL_TRACKING_API.whatsappClick({ origen: 'boton_flotante', page: window.location.pathname });
  });
})();
