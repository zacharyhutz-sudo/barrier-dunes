const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = document.querySelectorAll('[data-scroll-reveal]');
let observer;
let firstScroll;

function startReveals() {
  observer?.disconnect();
  firstScroll?.abort();
  if (motion.matches || !('IntersectionObserver' in window)) return;

  // Use pixels because percentage root margins are calculated from the viewport width.
  const inset = Math.round(window.innerHeight * 0.18);
  const entryLine = window.innerHeight - inset;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const block = entry.target;
      observer.unobserve(block);
      block.dataset.revealSeen = '';
      const anchor = document.querySelector(':target');
      if (block.matches(':focus-within') || (anchor && (anchor.contains(block) || block.contains(anchor)))) continue;
      block.classList.add('is-revealing');
    }
  }, { rootMargin: `0px 0px -${inset}px 0px` });

  const alreadyAtEntry = [];
  for (const block of targets) {
    if (block.hasAttribute('data-reveal-seen')) continue;
    const box = block.getBoundingClientRect();
    if (box.top < 0 || box.bottom <= window.innerHeight) {
      block.dataset.revealSeen = '';
    } else if (box.top < entryLine) {
      alreadyAtEntry.push(block);
    } else {
      observer.observe(block);
    }
  }
  // A section peeking above the entry line gets its entrance on the first scroll.
  if (alreadyAtEntry.length) {
    firstScroll = new AbortController();
    window.addEventListener('scroll', () => {
      for (const block of alreadyAtEntry) observer.observe(block);
    }, { once: true, passive: true, signal: firstScroll.signal });
  }
}

document.addEventListener('animationend', ({ target, animationName }) => {
  if (animationName === 'scroll-reveal') target.classList.remove('is-revealing');
});
motion.addEventListener('change', () => {
  for (const block of targets) block.classList.remove('is-revealing');
  startReveals();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) startReveals();
});
startReveals();
