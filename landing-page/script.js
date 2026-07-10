document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  function updateActiveLink() {
    const navHeight = nav.offsetHeight;
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - navHeight - 10;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse.classList.contains('show')) {
          bootstrap.Collapse.getInstance(navbarCollapse).hide();
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  // Dynamic "Days Running" counter
  // First server deployed at 1746401054799 ms (May 2025)
  const FIRST_SERVER_TS = 1746401054799;
  const daysEl = document.getElementById('stat-days');
  const daysDesc = document.getElementById('stat-days-desc');
  if (daysEl) {
    const msPerDay = 86400000;
    const now = Date.now();
    const days = Math.floor((now - FIRST_SERVER_TS) / msPerDay);
    daysEl.textContent = days.toLocaleString();
    if (daysDesc) {
      const startDate = new Date(FIRST_SERVER_TS);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      daysDesc.textContent = 'Since ' + months[startDate.getMonth()] + ' ' + startDate.getFullYear();
    }
  }
});
