function initScrollReveal() {
	const elements = document.querySelectorAll('[data-reveal]');
	if (elements.length === 0) return;

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) {
		elements.forEach((el) => el.classList.add('is-revealed'));
		return;
	}

	// Reveal as soon as an element crosses into the viewport (threshold 0 + a
	// bottom rootMargin), NOT when 15% of its area is visible: a section taller
	// than viewport / 0.15 can never reach a 15% ratio, so it would otherwise
	// stay hidden forever and take all its children with it.
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-revealed');
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0, rootMargin: '0px 0px -12% 0px' }
	);

	elements.forEach((el) => observer.observe(el));
}

document.addEventListener('astro:page-load', initScrollReveal);
