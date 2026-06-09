/**
 * Active-service emphasis for the Tjenester service blocks.
 * Marks whichever [data-service] block is crossing the viewport centre as
 * `.is-active` (copper left bar + brighter number) and dims the rest
 * (`.is-dimmed`). No-op on pages without [data-service]. Reduced-motion shows
 * all blocks active with no dimming.
 */
function initServiceMotion() {
	const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-service]'));
	if (blocks.length === 0) return;

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) {
		blocks.forEach((b) => b.classList.add('is-active'));
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				blocks.forEach((b) => {
					const active = b === entry.target;
					b.classList.toggle('is-active', active);
					b.classList.toggle('is-dimmed', !active);
				});
			});
		},
		// Narrow centre band: the block at mid-screen is the active one; the
		// previous stays active until the next reaches centre (no gap flicker).
		{ rootMargin: '-45% 0px -45% 0px', threshold: 0 },
	);

	blocks.forEach((b) => observer.observe(b));
}

document.addEventListener('astro:page-load', initServiceMotion);
