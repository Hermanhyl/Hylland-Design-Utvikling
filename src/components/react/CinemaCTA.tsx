import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Dark cinematic finale that echoes the hero (cinema-dark + rust glow), closing
 * the journey loop. Content is server-rendered (SEO / no-JS friendly); a plain
 * IntersectionObserver adds [data-inview] to trigger a CSS "zoom-in" reveal on
 * arrival. No framer motion.* components (crash-safe). The drifting rust glow is
 * decorative CSS, disabled under prefers-reduced-motion by the global block.
 */
export default function CinemaCTA() {
	const ref = useRef<HTMLElement>(null);
	const reduced = useReducedMotion();
	const [anim, setAnim] = useState(false);

	useEffect(() => {
		if (reduced) return; // leave content statically visible
		const el = ref.current;
		if (!el) return;
		setAnim(true); // opt into the hidden initial state now that JS is present
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) {
						el.setAttribute('data-inview', 'true');
						io.disconnect();
					}
				});
			},
			{ threshold: 0.3 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [reduced]);

	return (
		<section ref={ref} className="cinema-cta" data-anim={anim ? 'true' : undefined}>
			<div className="cinema-cta-glow" aria-hidden="true" />
			<div className="cinema-cta-content">
				<p className="cinema-cta-eyebrow">Kontakt</p>
				<h2 className="cinema-cta-title">Har du et prosjekt?</h2>
				<p className="cinema-cta-lede">
					Jeg er alltid interessert i nye samarbeid. Ta gjerne kontakt for en uforpliktende prat — så
					tar vi en titt på hva vi kan bygge sammen.
				</p>
				<div className="cinema-cta-actions">
					<a href="/kontakt" className="cinema-cta-btn">Ta kontakt</a>
					<a href="/tjenester" className="link-animated cinema-cta-secondary">Se tjenester →</a>
				</div>
			</div>
		</section>
	);
}
