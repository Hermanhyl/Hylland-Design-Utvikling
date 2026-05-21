function initScrollReveal() {
	const elements = document.querySelectorAll('[data-reveal]');
	if (elements.length === 0) return;

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) {
		elements.forEach((el) => el.classList.add('is-revealed'));
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-revealed');
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
	);

	elements.forEach((el) => observer.observe(el));
}

document.addEventListener('astro:page-load', initScrollReveal);
