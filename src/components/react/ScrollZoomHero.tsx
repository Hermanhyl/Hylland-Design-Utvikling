import { useEffect, useRef } from 'react';
import { motion, useScroll, useReducedMotion } from 'framer-motion';
import Hero3D from './Hero3D';
import { MotionHeading, MOTION } from './motion-primitives';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

/**
 * Scroll-zoom hero. Owns the scroll progress source of truth and drives:
 *  - the WebGL camera dolly / object morph (Hero3D reads the scrollYProgress
 *    MotionValue imperatively in its useFrame — no React re-renders)
 *  - the foreground headline scale + fade, and the stage fade-out
 *
 * Scroll-linked styling is applied IMPERATIVELY (subscribe to the MotionValue,
 * write inline styles on refs) — NOT via motion.* components, which crash on
 * mount in this stack (framer-motion 12 + React 19 + Astro → WAAPI offsets
 * error). motion.* is used only for literal-value mount entrances (safe).
 *
 * Native position:sticky + a tall runway (no scroll-jacking), so it coexists
 * with the Nav scroll listener and Astro view transitions. Mounted as
 * client:only="react"; the server-rendered .hero-poster supplies the SEO/no-JS
 * headline and is hidden once this island sets [data-hydrated] on the shell.
 */
export default function ScrollZoomHero() {
	const heroRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();

	const { scrollYProgress } = useScroll({
		target: heroRef,
		offset: ['start start', 'end start'],
	});

	// Hide the static SEO poster once the island has mounted.
	useEffect(() => {
		const shell = document.querySelector<HTMLElement>('[data-hero]');
		if (shell) shell.setAttribute('data-hydrated', 'true');
		return () => {
			shell?.removeAttribute('data-hydrated');
		};
	}, []);

	// Imperative scroll-linked transforms (crash-safe).
	useEffect(() => {
		if (reduced) return;
		const stage = stageRef.current;
		const overlay = overlayRef.current;
		if (!stage || !overlay) return;

		const apply = (p: number) => {
			// Stage fades out near the very end as we hand off to the next section.
			const stageOpacity = p <= 0.85 ? 1 : 1 - (p - 0.85) / 0.15;
			stage.style.opacity = clamp01(stageOpacity).toFixed(3);

			// Foreground text grows slightly, drifts up, and fades out.
			const scale = lerp(1, 1.22, p);
			const y = lerp(0, -60, p);
			const textOpacity = p <= 0.55 ? 1 : p >= 0.9 ? 0 : 1 - (p - 0.55) / 0.35;
			overlay.style.transform = `translateY(${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
			overlay.style.opacity = clamp01(textOpacity).toFixed(3);
		};

		apply(scrollYProgress.get());
		const unsub = scrollYProgress.on('change', apply);
		return unsub;
	}, [scrollYProgress, reduced]);

	const Foreground = (
		<div className="hero-content">
			<p className="hero-eyebrow">Frilans · Drammen · 2026</p>
			<h1 className="hero-title">
				<MotionHeading text="Frontend-utvikling og UX-design" />{' '}
				<span className="hero-title-accent italic">
					<MotionHeading text="fra Drammen." delay={0.35} />
				</span>
			</h1>
			<motion.p
				className="hero-lede"
				initial={reduced ? false : { opacity: 0, y: 16 }}
				animate={reduced ? undefined : { opacity: 1, y: 0 }}
				transition={{ duration: MOTION.duration, ease: MOTION.easeOut, delay: 0.6 }}
			>
				Jeg hjelper bedrifter med å bygge nettløsninger som er raske, tydelige og lette å bruke.
			</motion.p>
			<motion.div
				className="hero-cta"
				initial={reduced ? false : { opacity: 0, y: 16 }}
				animate={reduced ? undefined : { opacity: 1, y: 0 }}
				transition={{ duration: MOTION.duration, ease: MOTION.easeOut, delay: 0.75 }}
			>
				<a href="/tjenester" className="hero-btn">Se tjenester →</a>
				<a href="/kontakt" className="hero-btn-ghost">Ta kontakt →</a>
			</motion.div>
		</div>
	);

	// Reduced motion: a single static viewport, no runway, no scroll coupling.
	if (reduced) {
		return (
			<div className="hero-runway hero-runway--static">
				<div className="hero-stage">
					<Hero3D className="hero-canvas" />
					<div className="hero-overlay">{Foreground}</div>
				</div>
			</div>
		);
	}

	return (
		<div ref={heroRef} className="hero-runway">
			<div ref={stageRef} className="hero-stage">
				<Hero3D className="hero-canvas" scrollProgress={scrollYProgress} />
				<div ref={overlayRef} className="hero-overlay">
					{Foreground}
				</div>
			</div>
		</div>
	);
}
