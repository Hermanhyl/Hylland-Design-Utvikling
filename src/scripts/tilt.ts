/**
 * Subtle 3D cursor tilt for `[data-tilt]` elements (rotate toward the pointer).
 * Fine-pointer only; disabled under prefers-reduced-motion; no-op when none
 * exist. Optional `data-tilt="<maxDeg>"` (default 6).
 */
function initTilt() {
	if (window.matchMedia('(pointer: coarse)').matches) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const els = Array.from(document.querySelectorAll<HTMLElement>('[data-tilt]'));
	if (els.length === 0) return;

	els.forEach((el) => {
		if (el.dataset.tiltBound) return;
		el.dataset.tiltBound = 'true';
		const max = parseFloat(el.dataset.tilt || '6');
		let raf = 0;

		const onMove = (e: PointerEvent) => {
			const r = el.getBoundingClientRect();
			const px = (e.clientX - r.left) / r.width - 0.5;
			const py = (e.clientY - r.top) / r.height - 0.5;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
			});
		};
		const onEnter = () => {
			el.style.transition = 'transform 120ms ease-out';
		};
		const onLeave = () => {
			cancelAnimationFrame(raf);
			el.style.transition = 'transform 450ms var(--ease-out)';
			el.style.transform = '';
		};

		el.addEventListener('pointerenter', onEnter);
		el.addEventListener('pointermove', onMove);
		el.addEventListener('pointerleave', onLeave);
	});
}

document.addEventListener('astro:page-load', initTilt);
