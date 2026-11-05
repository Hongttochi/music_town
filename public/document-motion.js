const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sections = [...document.querySelectorAll('.terms-section, .safety-card')];
let observer;

function configureMotion() {
  observer?.disconnect();
  sections.forEach((section) => section.classList.remove('reveal-pending'));
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('reveal-pending');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

  for (const section of sections) {
    // Keep initially visible content and direct anchor targets immediately readable.
    if (section.getBoundingClientRect().top < window.innerHeight) continue;
    section.classList.add('reveal-pending');
    observer.observe(section);
  }
}

configureMotion();
reducedMotion.addEventListener('change', configureMotion);
window.addEventListener('pageshow', configureMotion);
window.addEventListener('hashchange', () => {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  target?.closest('.terms-section')?.classList.remove('reveal-pending');
});
