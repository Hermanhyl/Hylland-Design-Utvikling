import { useEffect, useRef, useState } from 'react';
import { useScroll, useReducedMotion } from 'framer-motion';

export type Project = {
	title: string;
	client?: string;
	year: string;
	type: string;
	description: string;
	contribution: string;
	href?: string;
	linkLabel?: string;
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Pinned horizontal-pan projects gallery. As the user scrolls vertically the
 * section pins and a horizontal track of large panels translates right→left.
 * Driven imperatively (subscribe to scrollYProgress, write track transform) —
 * NOT motion.* components (WAAPI crash). Vertical page scroll is never trapped:
 * the pinned stage keeps default touch-action; only the static fallback track
 * is user-draggable (touch-action: pan-x).
 *
 * Fallbacks: pre-hydration / reduced-motion / coarse-pointer → a static track
 * (native horizontal scroll-snap on fine pointer; vertical stack under
 * prefers-reduced-motion) so all content is reachable with no scroll coupling.
 */
export default function HorizontalProjects({ projects }: { projects: Project[] }) {
	const sectionRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const progressRef = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();

	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setHydrated(true);
	}, []);

	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ['start start', 'end end'],
	});

	// The scroll-driven pan runs on touch too (vertical scroll drives the
	// horizontal translate — it never traps the page scroll). Only reduced
	// motion / pre-hydration falls back to the static stack.
	const useDynamic = hydrated && !reduced;

	// Imperative pan: translate the track by scroll progress.
	useEffect(() => {
		if (!useDynamic) return;
		const stage = stageRef.current;
		const track = trackRef.current;
		const bar = progressRef.current;
		if (!stage || !track) return;

		// Pre-measured geometry (never read layout in the hot path).
		const geom = { maxX: 0, stageW: 0, panels: [] as { center: number; w: number }[] };
		const measure = () => {
			geom.stageW = stage.clientWidth;
			geom.maxX = Math.max(0, track.scrollWidth - stage.clientWidth);
			geom.panels = Array.from(track.children).map((c) => {
				const el = c as HTMLElement;
				return { center: el.offsetLeft + el.offsetWidth / 2, w: el.offsetWidth };
			});
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(stage);
		ro.observe(track);

		const apply = (p: number) => {
			const x = -p * geom.maxX;
			track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
			if (bar) bar.style.transform = `scaleX(${clamp(p, 0, 1).toFixed(4)})`;

			// Per-panel focus: center panel sits still + full opacity; off-center
			// panels drift slightly and dim — gives depth without disorientation.
			const children = track.children;
			for (let i = 0; i < geom.panels.length; i++) {
				const panel = children[i] as HTMLElement | undefined;
				const meta = geom.panels[i];
				if (!panel || !meta) continue;
				const screenCenter = meta.center + x;
				const norm = (screenCenter - geom.stageW / 2) / geom.stageW;
				const inner = panel.firstElementChild as HTMLElement | null;
				if (inner) {
					inner.style.transform = `translateX(${(-norm * 28).toFixed(1)}px)`;
					inner.style.opacity = clamp(1 - Math.abs(norm) * 0.7, 0.25, 1).toFixed(3);
				}
			}
		};

		apply(scrollYProgress.get());
		const unsub = scrollYProgress.on('change', apply);
		return () => {
			unsub();
			ro.disconnect();
		};
	}, [useDynamic, scrollYProgress, projects.length]);

	const panels = (
		<>
			{/* Intro panel */}
			<div className="hpan-panel hpan-panel--intro">
				<div className="hpan-card">
					<p className="hpan-eyebrow">Portefølje</p>
					<h2 className="hpan-introtitle">Utvalgte prosjekter</h2>
					<p className="hpan-introlede">
						Et utvalg av arbeid fra de siste årene: egne produkter, klientarbeid og prosjekter
						underveis i studiene.
					</p>
					{useDynamic && <p className="hpan-hint">Bla nedover for å utforske →</p>}
				</div>
			</div>

			{/* Project panels */}
			{projects.map((p, i) => (
				<div className="hpan-panel" key={p.title}>
					<div className="hpan-card">
						<span className="hpan-index">{String(i + 1).padStart(2, '0')}</span>
						<p className="hpan-meta">
							{p.type} · {p.year}
							{p.client ? ` · ${p.client}` : ''}
						</p>
						<h3 className="hpan-title">{p.title}</h3>
						<p className="hpan-desc">{p.description}</p>
						<p className="hpan-contrib">{p.contribution}</p>
						{p.href && (
							<a
								href={p.href}
								className="link-animated hpan-link"
								target="_blank"
								rel="noopener noreferrer"
							>
								{p.linkLabel ?? p.href} ↗
							</a>
						)}
					</div>
				</div>
			))}

			{/* Outro panel */}
			<div className="hpan-panel hpan-panel--outro">
				<div className="hpan-card">
					<h3 className="hpan-outrotitle">Vil du se mer?</h3>
					<a href="/portefolje" className="link-animated hpan-outrolink">
						Se hele porteføljen →
					</a>
				</div>
			</div>
		</>
	);

	// sectionRef is always attached (even in the static fallback) so framer's
	// useScroll measures the element from mount — otherwise the ref attaches on
	// the dynamic re-render after useScroll already ran, and scroll never tracks.
	return (
		<section
			ref={sectionRef}
			className={useDynamic ? 'hpan' : `hpan hpan--static${reduced ? ' hpan--stack' : ''}`}
			style={useDynamic ? { height: `calc(100svh + ${projects.length + 1} * 72svh)` } : undefined}
		>
			{useDynamic ? (
				<div ref={stageRef} className="hpan-stage">
					<div ref={trackRef} className="hpan-track">
						{panels}
					</div>
					<div className="hpan-progress-wrap" aria-hidden="true">
						<div ref={progressRef} className="hpan-progress" />
					</div>
				</div>
			) : (
				<div className="hpan-track">{panels}</div>
			)}
		</section>
	);
}
