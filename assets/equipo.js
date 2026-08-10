/* ══════════════════════════════════════════════════════════════
   ACTUAL · Sección Equipo (dinámica)

   Trae el equipo desde la app (app.actualnails.com) y arma las
   tarjetas. Dar de alta o de baja a alguien en la app se refleja
   acá solo, sin tocar el HTML.

   Si la API no responde, la sección entera se oculta: es preferible
   que no aparezca a mostrar un bloque vacío o desactualizado.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var API = 'https://app.actualnails.com/api/publico/profesionales';
  var RESERVA = 'https://app.actualnails.com/reserva/';

  var seccion = document.getElementById('equipo');
  var grid = document.getElementById('equipoGrid');
  if (!seccion || !grid) return;

  // Iniciales para la tarjeta cuando no hay foto cargada
  function iniciales(nombre) {
    var partes = nombre.replace(/^(Dra?\.|Lic\.)\s*/i, '').trim().split(/\s+/);
    var a = (partes[0] || '')[0] || '';
    var b = (partes[1] || '')[0] || '';
    return (a + b).toUpperCase();
  }

  // Segunda línea de la tarjeta: especialidad y años, lo que haya
  function detalle(p) {
    var partes = [];
    if (p.especialidad) partes.push(p.especialidad);
    if (p.aniosExperiencia) partes.push(p.aniosExperiencia + ' años');
    return partes.join(' · ');
  }

  function tarjeta(p) {
    // Con slug la tarjeta entera es el link de reserva con esa persona;
    // sin slug queda como tarjeta informativa.
    var card = document.createElement(p.slug ? 'a' : 'div');
    card.className = 'team-card';
    if (p.slug) {
      card.href = RESERVA + encodeURIComponent(p.slug);
      card.target = '_blank';
      card.rel = 'noopener';
    }

    var foto = document.createElement('div');
    foto.className = 'team-photo';
    if (p.fotoUrl) {
      var img = document.createElement('img');
      img.src = p.fotoUrl;
      img.alt = p.nombre;
      img.loading = 'lazy';
      // Si la URL de la foto está rota, cae a las iniciales
      img.addEventListener('error', function () {
        foto.removeChild(img);
        foto.classList.add('sin-foto');
        foto.textContent = iniciales(p.nombre);
      });
      foto.appendChild(img);
    } else {
      foto.classList.add('sin-foto');
      foto.textContent = iniciales(p.nombre);
    }
    card.appendChild(foto);

    var nombre = document.createElement('h3');
    nombre.className = 'team-name';
    nombre.textContent = p.nombre;
    card.appendChild(nombre);

    var d = detalle(p);
    if (d) {
      var rol = document.createElement('p');
      rol.className = 'team-role';
      rol.textContent = d;
      card.appendChild(rol);
    }

    if (p.slug) {
      var cta = document.createElement('span');
      cta.className = 'team-cta';
      cta.textContent = 'Reservar →';
      card.appendChild(cta);
    }

    return card;
  }

  fetch(API, { headers: { Accept: 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var equipo = (data && data.equipo) || [];
      if (!equipo.length) throw new Error('sin equipo');

      var frag = document.createDocumentFragment();
      equipo.forEach(function (p) {
        if (p && p.nombre) frag.appendChild(tarjeta(p));
      });

      grid.innerHTML = '';
      grid.appendChild(frag);
      seccion.classList.add('cargado');

      // Las tarjetas entran con el mismo reveal que el resto del sitio
      if (window.IntersectionObserver) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.1 });
        grid.querySelectorAll('.team-card').forEach(function (el) {
          el.classList.add('fade-in');
          obs.observe(el);
        });
      }
    })
    .catch(function (err) {
      console.warn('ACTUAL: no se pudo cargar el equipo —', err.message);
      seccion.remove();
    });
})();
