/* ══════════════════════════════════════════════════════════════
   ACTUAL · Landing pages de servicios
   Navbar, reveals, FAQ y mini formulario → WhatsApp.

   Flujo del formulario: 3 preguntas de opción única + un paso de
   contacto (nombre y teléfono). Al completarlo se dispara el evento
   Lead (Meta / GA4 / Google Ads), se postea el lead al webhook de
   GoHighLevel y recién ahí aparece el botón de WhatsApp.

   Cada landing define window.LANDING_CONFIG antes de cargar este
   archivo:
     {
       service: 'Lip Filler',
       phone: '541161581235',
       questions: [ { q: '...', short: '...', options: ['...'] }, ... ]
     }

   El tracking es opcional: si assets/tracking.js no está cargado o
   los IDs no están configurados, el formulario funciona igual.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function api() { return window.ACTUAL_TRACKING_API || null; }

  // ── Navbar: fondo sólido al scrollear ──
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ── Menú mobile ──
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { navLinks.classList.remove('active'); });
    });
  }

  // ── Reveal al scrollear ──
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in').forEach(function (el) { observer.observe(el); });

  // ── FAQ acordeón ──
  // La altura se anima en píxeles, pero al terminar la transición se libera a
  // 'none'. Si se dejara el valor fijo, al rotar el celular o redimensionar la
  // ventana el texto quedaría cortado.
  function collapse(item) {
    var answer = item.querySelector('.faq-a');
    // Volver de 'none' a un valor concreto para que la transición tenga desde dónde salir
    answer.style.maxHeight = answer.scrollHeight + 'px';
    void answer.offsetHeight; // fuerza reflow
    item.classList.remove('open');
    answer.style.maxHeight = null;
    item.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
  }

  function expand(item) {
    var answer = item.querySelector('.faq-a');
    item.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
    item.querySelector('.faq-q').setAttribute('aria-expanded', 'true');

    answer.addEventListener('transitionend', function release(e) {
      if (e.propertyName !== 'max-height') return;
      answer.removeEventListener('transitionend', release);
      if (item.classList.contains('open')) answer.style.maxHeight = 'none';
    });
  }

  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');

      // Deja una sola respuesta abierta a la vez
      document.querySelectorAll('.faq-item.open').forEach(collapse);

      if (!wasOpen) expand(item);
    });
  });

  // ══ Mini formulario: 3 preguntas + contacto ══
  var config = window.LANDING_CONFIG;
  var form = document.getElementById('leadForm');
  if (!config || !form) return;

  // ViewContent de la landing
  if (api()) api().viewContent(config.service);

  var questions = config.questions;
  var answers = new Array(questions.length).fill(null);
  var contact = { name: '', phone: '' };
  var contactIndex = questions.length;      // el paso de contacto va después de las preguntas
  var totalSteps = questions.length + 1;
  var current = 0;
  var formStarted = false;
  var lastLeadKey = null;   // firma del último lead enviado, para no duplicar
  var pendingNav = null;    // timeout de auto-avance, se cancela al navegar

  var stepsWrap = form.querySelector('#formSteps');
  var summary = form.querySelector('#formSummary');
  var summaryList = form.querySelector('#summaryList');
  var progress = form.querySelector('#formProgress');
  var waLink = form.querySelector('#waLink');

  // Barra de progreso: un segmento por pregunta + uno por el contacto
  for (var b = 0; b < totalSteps; b++) {
    progress.appendChild(document.createElement('span'));
  }
  var progressBars = progress.querySelectorAll('span');

  // ── Pasos de preguntas ──
  questions.forEach(function (item, index) {
    var step = document.createElement('div');
    step.className = 'form-step';
    step.dataset.step = String(index);

    var count = document.createElement('p');
    count.className = 'form-step-count';
    count.textContent = 'Pregunta ' + (index + 1) + ' de ' + questions.length;
    step.appendChild(count);

    var question = document.createElement('h3');
    question.className = 'form-question';
    question.textContent = item.q;
    step.appendChild(question);

    var options = document.createElement('div');
    options.className = 'form-options';

    item.options.forEach(function (label) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'form-option';
      option.textContent = label;
      option.addEventListener('click', function () {
        answers[index] = label;
        options.querySelectorAll('.form-option').forEach(function (o) {
          o.classList.toggle('selected', o === option);
        });

        if (api()) {
          if (!formStarted) { formStarted = true; api().track('form_start', { service: config.service }); }
          api().track('form_step', { service: config.service, paso: index + 1, respuesta: label });
        }

        // Pequeña pausa para que se vea la selección antes de avanzar
        pendingNav = setTimeout(function () { goTo(index + 1); }, 220);
      });
      options.appendChild(option);
    });

    step.appendChild(options);

    if (index > 0) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'form-back';
      back.textContent = '← Volver';
      back.addEventListener('click', function () { goTo(index - 1); });
      step.appendChild(back);
    }

    stepsWrap.appendChild(step);
  });

  // ── Paso de contacto ──
  (function buildContactStep() {
    var step = document.createElement('div');
    step.className = 'form-step';
    step.dataset.step = String(contactIndex);

    var count = document.createElement('p');
    count.className = 'form-step-count';
    count.textContent = 'Último paso';
    step.appendChild(count);

    var question = document.createElement('h3');
    question.className = 'form-question';
    question.textContent = '¿A quién le respondemos?';
    step.appendChild(question);

    var nameField = document.createElement('div');
    nameField.className = 'form-field';
    nameField.innerHTML =
      '<label class="form-label" for="leadName">Nombre</label>' +
      '<input class="form-input" id="leadName" type="text" name="name" autocomplete="name" placeholder="Tu nombre">' +
      '<p class="form-error" id="nameError">Contanos tu nombre así sabemos con quién hablamos.</p>';
    step.appendChild(nameField);

    var phoneField = document.createElement('div');
    phoneField.className = 'form-field';
    phoneField.innerHTML =
      '<label class="form-label" for="leadPhone">WhatsApp</label>' +
      '<input class="form-input" id="leadPhone" type="tel" name="phone" autocomplete="tel" inputmode="tel" placeholder="11 2345 6789">' +
      '<p class="form-error" id="phoneError">Ese número no parece válido — probá con código de área, ej: 11 2345 6789.</p>';
    step.appendChild(phoneField);

    var submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'form-submit';
    submit.textContent = 'Ver mi resumen';
    submit.addEventListener('click', submitContact);
    step.appendChild(submit);

    var privacy = document.createElement('p');
    privacy.className = 'form-reassure';
    privacy.textContent = 'Usamos tus datos solo para responderte esta consulta.';
    step.appendChild(privacy);

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'form-back';
    back.textContent = '← Volver';
    back.addEventListener('click', function () { goTo(contactIndex - 1); });
    step.appendChild(back);

    stepsWrap.appendChild(step);

    // Enter en cualquiera de los dos inputs envía el paso; al tipear se
    // limpia el estado de error del campo para que se note la corrección
    step.querySelectorAll('.form-input').forEach(function (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submitContact(); }
      });
      input.addEventListener('input', function () {
        input.classList.remove('invalid');
        var error = input.parentNode.querySelector('.form-error');
        if (error) error.classList.remove('show');
      });
    });
  })();

  var stepEls = stepsWrap.querySelectorAll('.form-step');

  function validPhone(raw) {
    if (api()) return api().normalizePhone(raw) !== '';
    return String(raw || '').replace(/\D/g, '').length >= 8;
  }

  function submitContact() {
    var nameInput = form.querySelector('#leadName');
    var phoneInput = form.querySelector('#leadPhone');
    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();

    var nameOk = name.length >= 2;
    var phoneOk = validPhone(phone);

    nameInput.classList.toggle('invalid', !nameOk);
    form.querySelector('#nameError').classList.toggle('show', !nameOk);
    phoneInput.classList.toggle('invalid', !phoneOk);
    form.querySelector('#phoneError').classList.toggle('show', !phoneOk);

    if (!nameOk) { nameInput.focus(); return; }
    if (!phoneOk) { phoneInput.focus(); return; }

    contact.name = name;
    contact.phone = phone;

    // Lead completo → píxeles + GHL. Solo se envía si algo cambió respecto
    // del último envío (editar respuestas y reenviar sin cambios no duplica;
    // los eventos de píxel además se dedupean por sesión en tracking.js).
    var leadKey = [name, phone].concat(answers).join('|');
    if (api() && leadKey !== lastLeadKey) {
      lastLeadKey = leadKey;
      api().lead({
        service: config.service,
        name: name,
        phone: phone,
        answers: questions.map(function (item, i) {
          return { q: item.short || item.q, a: answers[i] || '—' };
        })
      });
    }

    goTo(totalSteps);
  }

  function goTo(index) {
    // Cancela cualquier auto-avance pendiente: sin esto, tocar una opción y
    // enseguida '← Volver' te retrocede y 220ms después te salta adelante.
    clearTimeout(pendingNav);

    current = index;
    var done = index >= totalSteps;

    stepEls.forEach(function (el, i) { el.classList.toggle('active', !done && i === index); });
    summary.classList.toggle('active', done);

    progressBars.forEach(function (bar, i) {
      bar.classList.toggle('done', done || i <= index);
    });

    if (done) buildSummary();

    // Foco al nombre al llegar al paso de contacto
    if (index === contactIndex) {
      setTimeout(function () {
        var nameInput = form.querySelector('#leadName');
        if (nameInput && !nameInput.value) nameInput.focus();
      }, 100);
    }

    // Mantiene la tarjeta a la vista al cambiar de paso
    var card = form.getBoundingClientRect();
    if (card.top < 0) window.scrollTo({ top: window.scrollY + card.top - 100, behavior: 'smooth' });
  }

  function buildSummary() {
    summaryList.innerHTML = '';

    var rows = questions.map(function (item, i) {
      return { q: item.short || item.q, a: answers[i] || '—' };
    });
    rows.push({ q: 'Nombre', a: contact.name });
    rows.push({ q: 'WhatsApp', a: contact.phone });

    rows.forEach(function (row) {
      var li = document.createElement('li');
      var q = document.createElement('span');
      q.className = 'summary-q';
      q.textContent = row.q;
      var a = document.createElement('span');
      a.className = 'summary-a';
      a.textContent = row.a;
      li.appendChild(q);
      li.appendChild(a);
      summaryList.appendChild(li);
    });

    waLink.href = buildWhatsappUrl();
  }

  function buildWhatsappUrl() {
    var firstName = contact.name.split(' ')[0];
    var lines = ['Hola! Soy ' + firstName + '. Me interesa ' + config.service + '.', ''];
    questions.forEach(function (item, index) {
      lines.push('• ' + (item.short || item.q) + ': ' + (answers[index] || '—'));
    });
    lines.push('', 'Espero la info. Gracias!');
    return 'https://wa.me/' + config.phone + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  // Clic en el botón de WhatsApp del resumen
  waLink.addEventListener('click', function () {
    if (api()) api().whatsappClick({ origen: 'formulario', service: config.service });
  });

  // Botón "Editar respuestas" del resumen
  var restart = form.querySelector('#formRestart');
  if (restart) {
    restart.addEventListener('click', function () { goTo(0); });
  }

  goTo(0);
})();
