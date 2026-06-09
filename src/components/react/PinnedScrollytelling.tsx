import { useEffect, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent, useReducedMotion, type MotionValue } from 'framer-motion';

type Stage = {
	num: string;
	title: string;
	body: string;
};

const STAGES: Stage[] = [
	{
		num: '01',
		title: 'Forstå',
		body: 'Jeg starter med research, UX-audit og brukerinnsikt — for å forstå problemet skikkelig før noe bygges.',
	},
	{
		num: '02',
		title: 'Designe',
		body: 'Wireframes, prototyper og designsystem i Figma. Gjennomtenkt, testbart og forankret i ekte brukerbehov.',
	},
	{
		num: '03',
		title: 'Bygge',
		body: 'Rask, tilgjengelig kode med React og Astro. Solid håndverk under panseret — ikke bare pent på overflaten.',
	},
	{
		num: '04',
		title: 'Levere',
		body: 'Testing, lansering og måling. Jeg følger opp etter launch og sørger for at løsningen faktisk leverer.',
	},
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

/**
 * Each panel crossfades + drifts as the section scrolls. Driven imperatively
 * by subscribing to the scroll MotionValue and writing inline styles on a ref —
 * deliberately NOT framer `motion` components, which (framer-motion 12 + React 19
 * + Astro islands) attempt a WAAPI enter-animation on mount that throws
 * "Offsets must be monotonically non-decreasing" and crashes the island.
 */
function Panel({
	stage,
	index,
	total,
	progress,
}: {
	stage: Stage;
	index: number;
	total: number;
	progress: MotionValue<number>;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const seg = 1 / total;
		// Tight crossfades with a clear solo plateau per panel. First panel is
		// anchored visible from the very start; last lingers past the end.
		const in0 = index === 0 ? -1 : (index - 0.15) * seg;
		const in1 = index === 0 ? -0.5 : (index + 0.2) * seg;
		const out0 = (index + 0.8) * seg;
		const out1 = index === total - 1 ? 2 : (index + 1.15) * seg;

		const apply = (p: number) => {
			let opacity: number;
			if (p <= in0) opacity = 0;
			else if (p < in1) opacity = (p - in0) / (in1 - in0);
			else if (p <= out0) opacity = 1;
			else if (p < out1) opacity = 1 - (p - out0) / (out1 - out0);
			else opacity = 0;

			const enterT = (p - in0) / (in1 - in0);
			const exitT = (p - in1) / (out1 - in1);
			const y = p <= in1 ? lerp(50, 0, enterT) : lerp(0, -50, exitT);
			const scale = p <= in1 ? lerp(0.96, 1, enterT) : lerp(1, 1.02, exitT);

			el.style.opacity = clamp01(opacity).toFixed(3);
			el.style.transform = `translateY(${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
		};

		apply(progress.get());
		const unsub = progress.on('change', apply);
		return unsub;
	}, [progress, index, total]);

	return (
		<div ref={ref} className="scrolly-panel" style={{ opacity: index === 0 ? 1 : 0 }}>
			<span className="scrolly-num">{stage.num}</span>
			<h3 className="scrolly-title">{stage.title}</h3>
			<p className="scrolly-body">{stage.body}</p>
		</div>
	);
}

export default function PinnedScrollytelling() {
	const sectionRef = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();
	const [hydrated, setHydrated] = useState(false);
	const [active, setActive] = useState(0);

	useEffect(() => {
		setHydrated(true);
	}, []);

	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ['start start', 'end end'],
	});

	useMotionValueEvent(scrollYProgress, 'change', (v) => {
		const idx = Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length)));
		setActive(idx);
	});

	// sectionRef is always attached (even in the static fallback) so framer's
	// useScroll measures the element from mount.
	const isStatic = !hydrated || reduced;

	if (isStatic) {
		return (
			<section ref={sectionRef} className="scrolly scrolly--static">
				<div className="scrolly-head">
					<p className="scrolly-eyebrow">Prosess</p>
					<h2 className="scrolly-heading">Slik jobber jeg</h2>
				</div>
				<div className="scrolly-stack">
					{STAGES.map((s) => (
						<div className="scrolly-static-item" key={s.num}>
							<span className="scrolly-num">{s.num}</span>
							<h3 className="scrolly-title">{s.title}</h3>
							<p className="scrolly-body">{s.body}</p>
						</div>
					))}
				</div>
			</section>
		);
	}

	return (
		<section ref={sectionRef} className="scrolly">
			<div className="scrolly-stage">
				<div className="scrolly-inner">
					<div className="scrolly-head">
						<p className="scrolly-eyebrow">Prosess</p>
						<h2 className="scrolly-heading">Slik jobber jeg</h2>
					</div>

					<div className="scrolly-rail" aria-hidden="true">
						{STAGES.map((s, i) => (
							<span
								key={s.num}
								className={`scrolly-rail-item${i === active ? ' is-active' : ''}`}
							>
								{s.num}
							</span>
						))}
					</div>

					<div className="scrolly-panels">
						{STAGES.map((s, i) => (
							<Panel
								key={s.num}
								stage={s}
								index={i}
								total={STAGES.length}
								progress={scrollYProgress}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
