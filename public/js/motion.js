// KINETIC_DL motion layer: scroll reveals, staggered entrances and small
// transition hooks. Purely presentational; the page works without it.
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('kdl-motion');

  function setupReveal() {
    const targets = document.querySelectorAll(
      'main > header, main > section, main > div > section, main > div > aside, main > div > div, footer'
    );
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach((el, i) => {
      el.classList.add('kdl-reveal');
      el.style.setProperty('--kdl-delay', `${Math.min(i, 6) * 70}ms`);
      observer.observe(el);
    });
    // Never leave content hidden if an observer callback is missed
    setTimeout(() => targets.forEach(el => el.classList.add('is-visible')), 2500);
  }

  // Stagger children that get (re)inserted into these containers
  function staggerChildren(container) {
    if (!container) return;
    const apply = () => {
      Array.from(container.children).forEach((child, i) => {
        child.style.setProperty('--kdl-delay', `${i * 70}ms`);
      });
    };
    new MutationObserver(apply).observe(container, { childList: true });
    apply();
  }

  // Re-trigger a short fade whenever a readout's text changes
  function tickOnChange(el) {
    if (!el) return;
    let last = el.textContent;
    new MutationObserver(() => {
      if (el.textContent === last) return;
      last = el.textContent;
      el.classList.remove('kdl-tick');
      void el.offsetWidth;
      el.classList.add('kdl-tick');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  function watchModal() {
    const modal = document.getElementById('video-player-modal');
    if (!modal) return;
    new MutationObserver(() => {
      modal.classList.toggle('is-open', modal.style.display !== 'none' && modal.style.opacity === '1');
    }).observe(modal, { attributes: true, attributeFilter: ['style'] });
  }

  function watchPreview() {
    const img = document.getElementById('preview-img');
    if (!img) return;
    new MutationObserver(() => {
      img.classList.remove('kdl-swap');
      void img.offsetWidth;
      img.classList.add('kdl-swap');
    }).observe(img, { attributes: true, attributeFilter: ['src'] });
  }

  function watchProgress() {
    const panel = document.getElementById('progress-panel');
    const status = document.getElementById('progress-status');
    if (!panel || !status) return;
    const update = () => {
      panel.dataset.active = String(/DOWNLOADING|PROCESSING|QUEUED/.test(status.textContent));
    };
    new MutationObserver(update).observe(status, { childList: true, characterData: true, subtree: true });
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupReveal();
    staggerChildren(document.getElementById('quality-grid'));
    staggerChildren(document.getElementById('history-container'));
    tickOnChange(document.getElementById('status-display'));
    tickOnChange(document.getElementById('preview-title'));
    watchModal();
    watchPreview();
    watchProgress();
  });
})();
