/**
 * Scroll-fill timeline. Each `[data-timeline]` has a `[data-timeline-fill]`
 * element (a copper line) whose height tracks how far the viewport has scrolled
 * through the timeline, and `.timeline-dot`s that light up (`.is-lit`) as the
 * fill passes them. transform/height-only, passive scroll, no-op when absent.
 * Reduced-motion → line full + all dots lit.
 */
function initTimeline() {
	const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline]'));
	if (lines.length === 0) return;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	lines.forEach((tl) => {
		const fill = tl.querySelector<HTMLElement>('[data-timeline-fill]');
		const dots = Array.from(tl.querySelectorAll<HTMLElement>('.timeline-dot'));

		if (reduced) {
			if (fill) fill.style.height = '100%';
			dots.forEach((d) => d.classList.add('is-lit'));
			return;
		}

		let ticking = false;
		const update = () => {
			const r = tl.getBoundingClientRect();
			const total = r.height || 1;
			const p = Math.max(0, Math.min(1, (window.innerHeight * 0.55 - r.top) / total));
			const fillPx = p * total;
			if (fill) fill.style.height = `${(p * 100).toFixed(2)}%`;
			// Dot position relative to the timeline top (offsetTop is relative to
			// each item's offsetParent, so use measured rects instead).
			dots.forEach((d) => {
				const dotY = d.getBoundingClientRect().top - r.top;
				d.classList.toggle('is-lit', dotY <= fillPx + 6);
			});
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
	});
}

document.addEventListener('astro:page-load', initTimeline);
