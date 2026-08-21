document.documentElement.classList.remove('no-js');

(function initMobileNav() {
  var header = document.querySelector('[data-header]');
  if (!header) return;

  var toggle = header.querySelector('[data-header-toggle]');
  var closeBtn = header.querySelector('[data-header-close]');
  var drawer = header.querySelector('[data-header-drawer]');
  var overlay = header.querySelector('[data-header-overlay]');

  if (!toggle || !drawer || !overlay) return;

  function openDrawer() {
    drawer.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(function () {
      drawer.setAttribute('data-open', '');
    });
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    var firstLink = drawer.querySelector('a, button');
    if (firstLink) firstLink.focus();

    document.addEventListener('keydown', onKeydown);
  }

  function closeDrawer() {
    drawer.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);

    window.setTimeout(function () {
      drawer.hidden = true;
      overlay.hidden = true;
    }, 250);

    toggle.focus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  }

  toggle.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
})();

(function initHeaderScrollState() {
  var header = document.querySelector('[data-header]');
  if (!header) return;

  var ticking = false;

  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 4);
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );

  update();
})();
