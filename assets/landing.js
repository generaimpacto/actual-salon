/* ══════════════════════════════════════════════════════════════
   ACTUAL · Landing pages de servicios
   Navbar, reveals, FAQ y mini formulario de 3 pasos → WhatsApp.

   Cada landing define window.LANDING_CONFIG antes de cargar este
   archivo:
     {
       service: 'Lip Filler',
       phone: '541161581235',
       questions: [ { q: '...', options: ['...', '...'] }, ... ]
     }
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

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
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var answer = item.querySelector('.faq-a');
      var isOpen = item.classList.contains('open');

      // Cierra el resto para que quede uno solo abierto
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ══ Mini formulario de 3 pasos ══
  var config = window.LANDING_CONFIG;
  var form = document.getElementById('leadForm');
  if (!config || !form) return;

  var questions = config.questions;
  var answers = new Array(questions.length).fill(null);
  var current = 0;

  var stepsWrap = form.querySelector('#formSteps');
  var summary = form.querySelector('#formSummary');
  var summaryList = form.querySelector('#summaryList');
  var progress = form.querySelector('#formProgress');
  var waLink = form.querySelector('#waLink');

  // Construye la barra de progreso (un segmento por pregunta)
  questions.forEach(function () {
    progress.appendChild(document.createElement('span'));
  });
  var progressBars = progress.querySelectorAll('span');

  // Construye cada paso
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
        // Pequeña pausa para que se vea la selección antes de avanzar
        setTimeout(function () { goTo(index + 1); }, 220);
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

  var stepEls = stepsWrap.querySelectorAll('.form-step');

  function goTo(index) {
    current = index;
    var done = index >= questions.length;

    stepEls.forEach(function (el, i) { el.classList.toggle('active', !done && i === index); });
    summary.classList.toggle('active', done);

    progressBars.forEach(function (bar, i) {
      bar.classList.toggle('done', done || i <= index);
    });

    if (done) buildSummary();

    // Mantiene la tarjeta a la vista al cambiar de paso
    var card = form.getBoundingClientRect();
    if (card.top < 0) window.scrollTo({ top: window.scrollY + card.top - 100, behavior: 'smooth' });
  }

  function buildSummary() {
    summaryList.innerHTML = '';
    questions.forEach(function (item, index) {
      var li = document.createElement('li');
      var q = document.createElement('span');
      q.className = 'summary-q';
      q.textContent = item.short || item.q;
      var a = document.createElement('span');
      a.className = 'summary-a';
      a.textContent = answers[index] || '—';
      li.appendChild(q);
      li.appendChild(a);
      summaryList.appendChild(li);
    });

    waLink.href = buildWhatsappUrl();
  }

  function buildWhatsappUrl() {
    var lines = ['Hola! Me interesa ' + config.service + '.', ''];
    questions.forEach(function (item, index) {
      lines.push('• ' + (item.short || item.q) + ': ' + (answers[index] || '—'));
    });
    lines.push('', 'Quedo atenta a la info. Gracias!');
    return 'https://wa.me/' + config.phone + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  // Botón "Editar respuestas" del resumen
  var restart = form.querySelector('#formRestart');
  if (restart) {
    restart.addEventListener('click', function () { goTo(0); });
  }

  goTo(0);
})();
