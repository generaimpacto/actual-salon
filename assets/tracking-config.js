/* ══════════════════════════════════════════════════════════════
   ACTUAL · Configuración de tracking
   ÚNICO archivo que hay que tocar para activar los píxeles.

   Pegá cada ID entre las comillas. Si un campo queda vacío (''),
   esa plataforma simplemente no se carga — no rompe nada.
   ══════════════════════════════════════════════════════════════ */

window.ACTUAL_TRACKING = {

  // Meta Pixel — Administrador de eventos → Orígenes de datos → ID del píxel
  // Ejemplo: '1234567890123456'
  metaPixelId: '',

  // GA4 — Administración → Flujos de datos → ID de medición
  // Ejemplo: 'G-XXXXXXXXXX'
  ga4Id: '',

  // Google Ads — ID de conversión de la cuenta
  // Ejemplo: 'AW-123456789'
  googleAdsId: '',

  // Google Ads — Etiqueta de la conversión "Lead" (formulario completado)
  // Ejemplo: 'AbCdEfGhIjK-1LmNoPqRsT'
  googleAdsLeadLabel: '',

  // Google Ads — Etiqueta de la conversión "Contacto WhatsApp" (clic en el botón)
  // Puede quedar vacía si solo medís la conversión de lead.
  googleAdsWhatsappLabel: '',

  // GoHighLevel — URL del Inbound Webhook del workflow de la subcuenta
  // Workflow → Trigger "Inbound Webhook" → copiar URL
  // Ejemplo: 'https://services.leadconnectorhq.com/hooks/XXXX/webhook-trigger/YYYY'
  ghlWebhookUrl: ''
};
