function initCounters() {
	const counters = document.querySelectorAll('[data-counter]');
	counters.forEach((el) => {
		const target = parseInt(el.getAttribute('data-target') || '0', 10);
		const obs = new IntersectionObserver(
			(entries, observer) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
					if (reduced) {
						el.textContent = String(target).padStart(2, '0');
						observer.unobserve(el);
						return;
					}
					let current = 0;
					const duration = 500;
					const start = performance.now();
					function tick(now: number) {
						const progress = Math.min((now - start) / duration, 1);
						current = Math.floor(progress * target);
						el.textContent = String(current).padStart(2, '0');
						if (progress < 1) requestAnimationFrame(tick);
						else el.textContent = String(target).padStart(2, '0');
					}
					requestAnimationFrame(tick);
					observer.unobserve(el);
				});
			},
			{ threshold: 0.5 }
		);
		obs.observe(el);
	});
}

document.addEventListener('astro:page-load', initCounters);
