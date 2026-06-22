/* ===========================================
   Bellamora Studio — script.js
   =========================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ── Reduced Motion Check ── */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Page Loader ── */
  const loader = document.querySelector('.page-loader');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('loaded'), 600);
    });
    // Fallback if load already fired
    if (document.readyState === 'complete') {
      setTimeout(() => loader.classList.add('loaded'), 600);
    }
  }

  /* ── Custom Cursor ── */
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorOutline = document.querySelector('.cursor-outline');
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  if (cursorDot && cursorOutline && !isTouchDevice) {
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    // Smooth follow for outline
    function animateOutline() {
      outlineX += (mouseX - outlineX) * 0.12;
      outlineY += (mouseY - outlineY) * 0.12;
      cursorOutline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
      requestAnimationFrame(animateOutline);
    }
    animateOutline();

    // Hover effect on interactive elements
    const hoverTargets = document.querySelectorAll('a, button, .gallery-item, .day-btn, .time-btn, input, textarea, .nav-link');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursorOutline.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => cursorOutline.classList.remove('cursor-hover'));
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0';
      cursorOutline.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      cursorDot.style.opacity = '1';
      cursorOutline.style.opacity = '1';
    });
  }

  /* ── Navbar Scroll Effect ── */
  const navbar = document.querySelector('.navbar-bellamora');
  if (navbar) {
    const updateNavbar = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();
  }

  /* ── Smooth Scroll for Anchor Links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile nav if open
        const navCollapse = document.querySelector('.navbar-collapse');
        if (navCollapse && navCollapse.classList.contains('show')) {
          const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
          if (bsCollapse) bsCollapse.hide();
        }
      }
    });
  });

  /* ── Scroll Animations (Intersection Observer) ── */
  if (!prefersReducedMotion) {
    const fadeEls = document.querySelectorAll('.fade-up');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger animation for items in the same section
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeEls.forEach(el => observer.observe(el));
  } else {
    // Show all elements immediately for reduced motion
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
  }

  /* ── Agenda Widget ── */
  initAgendaWidget();
});

/* ── Agenda Widget Logic ── */
function initAgendaWidget() {
  const dayContainer = document.getElementById('agenda-days');
  const timeContainer = document.getElementById('agenda-times');
  const confirmBtn = document.getElementById('agenda-confirm');
  const summaryEl = document.getElementById('agenda-summary');
  const timeStepEl = document.getElementById('agenda-time-step');

  if (!dayContainer || !timeContainer || !confirmBtn) return;

  let selectedDay = null;
  let selectedTime = null;

  // Chilean day and month names
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayFullNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthFullNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Generate next 7 days
  const today = new Date();
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  // Time slots: 09:00 to 19:00 every 30 min
  const timeSlots = [];
  for (let hour = 9; hour <= 19; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 19) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Deterministic "unavailable" slots based on day
  function isSlotUnavailable(dayIndex, slotIndex) {
    const seed = (dayIndex * 7 + slotIndex * 13 + 5) % 11;
    return seed < 3; // ~27% unavailable
  }

  // Render day buttons
  function renderDays() {
    dayContainer.innerHTML = '';
    days.forEach((date, index) => {
      const btn = document.createElement('button');
      btn.className = 'day-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `${dayFullNames[date.getDay()]} ${date.getDate()} de ${monthFullNames[date.getMonth()]}`);

      let label = '';
      if (index === 0) label = 'Hoy';
      else if (index === 1) label = 'Mañana';

      btn.innerHTML = `
        <span class="day-name">${label || dayNames[date.getDay()]}</span>
        <span class="day-num">${date.getDate()}</span>
        <span class="day-month">${monthNames[date.getMonth()]}</span>
      `;

      btn.addEventListener('click', () => selectDay(index, date, btn));
      dayContainer.appendChild(btn);
    });
  }

  // Select day
  function selectDay(index, date, btn) {
    selectedDay = { index, date };
    selectedTime = null;

    // Update UI
    dayContainer.querySelectorAll('.day-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');

    // Show time step
    if (timeStepEl) timeStepEl.style.display = 'block';

    renderTimeSlots(index);
    updateSummary();
    updateConfirmButton();
  }

  // Render time slots
  function renderTimeSlots(dayIndex) {
    timeContainer.innerHTML = '';

    timeSlots.forEach((slot, slotIndex) => {
      const btn = document.createElement('button');
      btn.className = 'time-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = slot;

      const unavailable = isSlotUnavailable(dayIndex, slotIndex);
      if (unavailable) {
        btn.disabled = true;
        btn.setAttribute('aria-label', `${slot} — No disponible`);
      } else {
        btn.setAttribute('aria-label', `${slot} — Disponible`);
        btn.addEventListener('click', () => selectTime(slot, btn));
      }

      timeContainer.appendChild(btn);
    });
  }

  // Select time
  function selectTime(slot, btn) {
    selectedTime = slot;

    timeContainer.querySelectorAll('.time-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');

    updateSummary();
    updateConfirmButton();
  }

  // Update summary text
  function updateSummary() {
    if (!summaryEl) return;

    if (selectedDay && selectedTime) {
      const d = selectedDay.date;
      const formattedDate = `${dayFullNames[d.getDay()]} ${d.getDate()} de ${monthFullNames[d.getMonth()]}`;
      summaryEl.innerHTML = `Tu cita: <strong>${formattedDate}</strong> a las <strong>${selectedTime} hrs</strong>`;
    } else if (selectedDay) {
      const d = selectedDay.date;
      const formattedDate = `${dayFullNames[d.getDay()]} ${d.getDate()} de ${monthFullNames[d.getMonth()]}`;
      summaryEl.innerHTML = `Día seleccionado: <strong>${formattedDate}</strong> — ahora elige tu hora`;
    } else {
      summaryEl.innerHTML = 'Selecciona un día y una hora para agendar';
    }
  }

  // Update confirm button state
  function updateConfirmButton() {
    if (selectedDay && selectedTime) {
      confirmBtn.disabled = false;
      confirmBtn.setAttribute('aria-disabled', 'false');
    } else {
      confirmBtn.disabled = true;
      confirmBtn.setAttribute('aria-disabled', 'true');
    }
  }

  // WhatsApp confirm action
  confirmBtn.addEventListener('click', () => {
    if (!selectedDay || !selectedTime) return;

    const d = selectedDay.date;
    const formattedDate = `${dayFullNames[d.getDay()]} ${d.getDate()} de ${monthFullNames[d.getMonth()]}`;
    const message = encodeURIComponent(
      `Hola Bellamora 💛 Quisiera agendar una cita para el ${formattedDate} a las ${selectedTime} hrs. ¡Gracias!`
    );

    window.open(`https://wa.me/56912345678?text=${message}`, '_blank', 'noopener');
  });

  // Initialize
  renderDays();
  updateSummary();
  updateConfirmButton();
  if (timeStepEl) timeStepEl.style.display = 'none';
}
