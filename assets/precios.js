/* ══════════════════════════════════════════════════════════════
   ACTUAL · Lista de precios (dinámica)

   Reemplaza las pestañas y precios estáticos por lo que devuelve la
   app. Cambiar un precio o destildar "mostrar en web" en el sistema
   se refleja acá sin tocar el HTML.

   Si la API no responde, se deja intacta la lista que ya está en el
   HTML: precios viejos son mejores que ningún precio.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var API = 'https://app.actualnails.com/api/publico/precios';
  var RESERVA = 'https://app.actualnails.com/reserva/';

  var seccion = document.getElementById('precios');
  // En las landings no hay lista de precios, pero sí montos sueltos marcados con
  // data-precio-slug. Si no hay ninguna de las dos cosas, no hay nada que hacer.
  var sueltos = document.querySelectorAll('[data-precio-slug]');
  if (!seccion && !sueltos.length) return;

  var tabsArriba = seccion && seccion.querySelector('.price-tabs:not(.price-tabs-bottom)');
  var tabsAbajo = seccion && seccion.querySelector('.price-tabs-bottom');
  var panels = seccion && seccion.querySelector('.price-panels');
  var puedeArmarLista = !!(tabsArriba && panels);

  // Imágenes de portada por pestaña: las editoriales (negro + dorado) hechas para
  // la web. Tienen prioridad sobre la imagen de la categoría en el sistema, que es
  // una foto operativa pensada para la reserva y rompe la estética del sitio.
  // Para una pestaña nueva sin imagen acá, se usa la del sistema como respaldo.
  var IMAGENES = {
    manos: '/categorias/manos.jpg',
    pies: '/categorias/pies.jpg',
    eyes: '/categorias/cejas.jpg',
    facial: '/categorias/facial.jpg',
    odonto: '/categorias/odonto.jpg',
    labios: '/categorias/labios.jpg'
  };

  // Bajada que va sobre la imagen de cada pestaña. Son las mismas que tenía el
  // HTML estático: viven acá porque son copy de la web, no dato del sistema.
  var KICKERS = {
    manos: 'Comenzamos por el cuidado de tus uñas',
    pies: 'Cuidado integral para tus pies',
    eyes: 'Realza tu mirada',
    facial: 'Rejuvenecimiento facial',
    odonto: 'Y ahora sí, tu sonrisa',
    labios: 'Armonización orofacial'
  };

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }

  function fila(servicio) {
    var row = crear('div', 'price-row');

    var nombre = crear('span', 'price-name');
    nombre.appendChild(document.createTextNode(servicio.nombre));
    if (servicio.detalle) {
      nombre.appendChild(crear('span', null, ' · ' + servicio.detalle));
    }
    row.appendChild(nombre);

    row.appendChild(crear('span', 'price-leader'));

    // "desde $90.000" cuando el precio es un piso
    var valor = servicio.desde ? 'desde ' + servicio.precio : servicio.precio;
    row.appendChild(crear('span', 'price-val', valor));

    return row;
  }

  // Notas al pie de cada pestaña que ya vienen en el HTML: matrícula de la
  // profesional a cargo, aclaraciones de qué incluye cada servicio. Son datos que
  // el sistema no tiene, así que se rescatan ANTES de reconstruir y se vuelven a
  // poner. Sin esto el rebuild las borraba (y con ellas la matrícula, que en
  // servicios de salud tiene que estar publicada).
  var notasPrevias = {};
  if (panels) {
    panels.querySelectorAll('.price-panel').forEach(function (p) {
      var notas = p.querySelectorAll('.price-note');
      if (notas.length) notasPrevias[p.dataset.cat] = [].map.call(notas, function (n) { return n.cloneNode(true); });
    });
  }

  function panel(pestana, activo) {
    var div = crear('div', 'price-panel' + (activo ? ' active' : ''));
    div.dataset.cat = pestana.slug;

    var visual = crear('div', 'price-visual');
    var img = IMAGENES[pestana.slug] || pestana.imagenUrl;
    if (img) visual.style.backgroundImage = "url('" + img + "')";
    var overlay = crear('div', 'price-visual-overlay');
    if (KICKERS[pestana.slug]) {
      overlay.appendChild(crear('span', 'price-visual-kicker', KICKERS[pestana.slug]));
    }
    overlay.appendChild(crear('h3', null, pestana.nombre));
    visual.appendChild(overlay);
    div.appendChild(visual);

    var lista = crear('div', 'price-list');
    pestana.grupos.forEach(function (grupo) {
      if (grupo.subtitulo) lista.appendChild(crear('p', 'price-subhead', grupo.subtitulo));
      grupo.servicios.forEach(function (s) { lista.appendChild(fila(s)); });
    });

    // Se reponen las notas al pie que tenía esta pestaña en el HTML.
    (notasPrevias[pestana.slug] || []).forEach(function (n) { lista.appendChild(n); });

    div.appendChild(lista);

    return div;
  }

  function tab(pestana, activo) {
    var btn = crear('button', 'price-tab' + (activo ? ' active' : ''), pestana.nombre);
    btn.type = 'button';
    btn.dataset.cat = pestana.slug;
    return btn;
  }

  fetch(API, { headers: { Accept: 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var pestanas = (data && data.pestanas) || [];
      if (!pestanas.length) throw new Error('sin precios');

      // Montos sueltos de las landings: se buscan por slug en todas las pestañas.
      if (sueltos.length) {
        var porSlug = {};
        pestanas.forEach(function (p) {
          p.grupos.forEach(function (g) {
            g.servicios.forEach(function (s) { if (s.slug) porSlug[s.slug] = s; });
          });
        });
        sueltos.forEach(function (el) {
          var s = porSlug[el.dataset.precioSlug];
          if (!s) return; // servicio despublicado: se deja el texto que ya estaba
          el.textContent = s.desde ? 'desde ' + s.precio : s.precio;
        });
      }

      // Sección Combos de la home: se rearma con los combos marcados "en la web" en el
      // sistema. Si el sistema no manda ninguno se deja el HTML tal cual, por la misma
      // razón que la lista: una sección vacía es peor que una desactualizada.
      var combos = (data && data.combos) || [];
      if (combos.length) armarCombos(combos);

      if (!puedeArmarLista) return;

      // Se conserva la pestaña que el visitante tenga abierta (por si ya tocó una).
      var activaPrevia = seccion.querySelector('.price-tab.active');
      var slugActivo = activaPrevia ? activaPrevia.dataset.cat : pestanas[0].slug;
      if (!pestanas.some(function (p) { return p.slug === slugActivo; })) {
        slugActivo = pestanas[0].slug;
      }

      var fragTabs = document.createDocumentFragment();
      var fragTabs2 = document.createDocumentFragment();
      var fragPanels = document.createDocumentFragment();

      pestanas.forEach(function (p) {
        var activo = p.slug === slugActivo;
        fragTabs.appendChild(tab(p, activo));
        if (tabsAbajo) fragTabs2.appendChild(tab(p, activo));
        fragPanels.appendChild(panel(p, activo));
      });

      tabsArriba.innerHTML = '';
      tabsArriba.appendChild(fragTabs);
      if (tabsAbajo) {
        tabsAbajo.innerHTML = '';
        tabsAbajo.appendChild(fragTabs2);
      }
      panels.innerHTML = '';
      panels.appendChild(fragPanels);

      // El listener de tabs del HTML se enganchó a los botones viejos, que ya no
      // existen. Se vuelve a cablear sobre los nuevos con la misma lógica.
      cablearTabs();
    })
    .catch(function (err) {
      console.warn('ACTUAL: no se pudo cargar la lista de precios —', err.message);
      // El HTML de respaldo lista los servicios pero SIN montos (dicen
      // "Consultanos"): publicar precios viejos es peor que no publicarlos.
      // Se agrega un aviso para que la clienta sepa por dónde preguntar.
      if (seccion && !seccion.querySelector('.price-fallback-aviso')) {
        var aviso = document.createElement('p');
        aviso.className = 'price-fallback-aviso';
        aviso.style.cssText = 'color:var(--gold);font-size:0.8rem;margin-top:24px;font-weight:300;';
        aviso.textContent = 'No pudimos cargar los precios actualizados. Escribinos por WhatsApp y te los pasamos al toque.';
        var cont = seccion.querySelector('.container');
        if (cont) cont.appendChild(aviso);
      }
    });

  function tarjetaCombo(c) {
    var card = crear('div', 'combo-card');
    card.appendChild(crear('h3', 'combo-name', c.nombre));
    if (c.descripcion) card.appendChild(crear('p', 'combo-tagline', c.descripcion));
    if (c.servicios) card.appendChild(crear('p', 'combo-services', c.servicios));

    var precios = crear('div', 'combo-prices');
    precios.appendChild(crear('span', 'combo-special-label', 'Valor especial'));
    precios.appendChild(crear('span', 'combo-special-val', c.precio));
    if (c.precioEfectivo && c.precioEfectivo !== c.precio) {
      var cash = crear('span', 'combo-cash', 'o ');
      cash.appendChild(crear('strong', null, c.precioEfectivo));
      cash.appendChild(document.createTextNode(' en efectivo'));
      precios.appendChild(cash);
    }
    card.appendChild(precios);
    return card;
  }

  function armarCombos(combos) {
    var grid = document.querySelector('#combos .combos-grid');
    if (!grid) return;
    var frag = document.createDocumentFragment();
    combos.forEach(function (c) { frag.appendChild(tarjetaCombo(c)); });
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  function cablearTabs() {
    var tabs = seccion.querySelectorAll('.price-tab');
    var paneles = seccion.querySelectorAll('.price-panel');

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var cat = t.dataset.cat;
        tabs.forEach(function (o) { o.classList.toggle('active', o.dataset.cat === cat); });
        paneles.forEach(function (p) { p.classList.toggle('active', p.dataset.cat === cat); });

        // Igual que antes: si se usó el set de abajo (mobile), subir a los de arriba.
        if (t.closest('.price-tabs-bottom') && tabsArriba) {
          var destino = tabsArriba.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: destino, behavior: 'smooth' });
        }
      });
    });
  }
})();
