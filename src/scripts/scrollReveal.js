const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);

      const anchor = document.querySelector(':target');
      if (reducedMotion.matches || entry.target.matches(':focus-within')) continue;
      if (anchor && (anchor.contains(entry.target) || entry.target.contains(anchor))) continue;

      entry.target.classList.add('is-revealing');

      const listeners = new AbortController();
      const finish = (event) => {
        if (event.target !== entry.target || event.animationName !== 'scroll-reveal') return;
        entry.target.classList.remove('is-revealing');
        listeners.abort();
      };
      entry.target.addEventListener('animationend', finish, { signal: listeners.signal });
      entry.target.addEventListener('animationcancel', finish, { signal: listeners.signal });
    }
  }, { rootMargin: '0px 0px -18px 0px' });

  for (const block of document.querySelectorAll('[data-scroll-reveal]')) {
    // Content visible on first paint stays still, including restored scroll positions.
    if (block.getBoundingClientRect().top >= window.innerHeight) observer.observe(block);
  }
}
