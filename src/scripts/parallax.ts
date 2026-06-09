/**
 * Generic scroll parallax. Each `[data-parallax]` element is translated on the
 * Y axis proportional to its distance from the viewport centre, times a small
 * speed (`data-parallax-speed`, default 0.08). transform-only + passive scroll.
 * No-ops when there are no `[data-parallax]` elements; disabled under
 * prefers-reduced-motion.
 */
function initParallax() {
	const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
	if (els.length === 0) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	let ticking = false;

	const update = () => {
		const vh = window.innerHeight;
		for (const el of els) {
			const speed = parseFloat(el.dataset.parallaxSpeed || '0.08');
			const rect = el.getBoundingClientRect();
			if (rect.bottom < -200 || rect.top > vh + 200) continue; // skip far-offscreen
			const centre = rect.top + rect.height / 2;
			const offset = (centre - vh / 2) * -speed;
			el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
		}
		ticking = false;
	};

	const onScroll = () => {
		if (ticking) return;
		ticking = true;
		window.requestAnimationFrame(update);
	};

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	update();
}

document.addEventListener('astro:page-load', initParallax);
