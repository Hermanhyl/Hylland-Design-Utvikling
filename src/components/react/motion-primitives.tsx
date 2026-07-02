import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';

/**
 * Shared motion language for the homepage islands.
 * Values mirror the existing vanilla CSS animation system in global.css
 * (600ms / cubic-bezier(0.4,0,0.2,1)) so framer-motion feels cohesive
 * with the [data-reveal] scroll-reveal used across the inner pages.
 *
 * Timings validated against the uipro ui-ux-pro-max skill
 * (hover transitions 150–300ms, transform/opacity only).
 */
export const MOTION = {
	ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
	easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number], // expo-out for entrances
	duration: 0.6,
	durationFast: 0.25,
	stagger: 0.08,
} as const;

/**
 * SSR-safe prefers-reduced-motion boolean for non-framer logic
 * (e.g. gating the WebGL render loop, which CSS cannot stop).
 * Defaults to `false` on the server / first paint, then syncs.
 */
export function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		setReduced(mq.matches);
		const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	return reduced;
}

/**
 * True once the app loading overlay has lifted (it sets `data-app-ready` on
 * <html> and fires a one-shot `app:ready` window event). Used to hold hero
 * entrance animations until the loader is gone, so they play once, in view.
 * Falls back to `true` after a timeout so content can never be stranded hidden.
 */
export function useAppReady(): boolean {
	const [ready, setReady] = useState(
		() => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-app-ready'),
	);

	useEffect(() => {
		if (ready) return;
		if (document.documentElement.hasAttribute('data-app-ready')) {
			setReady(true);
			return;
		}
		const onReady = () => setReady(true);
		window.addEventListener('app:ready', onReady, { once: true });
		const t = window.setTimeout(() => setReady(true), 4000);
		return () => {
			window.removeEventListener('app:ready', onReady);
			window.clearTimeout(t);
		};
	}, [ready]);

	return ready;
}

/** Detect low-power / coarse-pointer devices to scale down WebGL quality. */
export function useIsLowPower(): boolean {
	const [low, setLow] = useState(false);

	useEffect(() => {
		const coarse = window.matchMedia('(pointer: coarse)').matches;
		const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
		const cores = navigator.hardwareConcurrency ?? 8;
		const smallScreen = window.innerWidth < 768;
		setLow(coarse && smallScreen || (typeof mem === 'number' && mem <= 4) || cores <= 4);
	}, []);

	return low;
}

const fadeUpVariants: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: (i: number = 0) => ({
		opacity: 1,
		y: 0,
		transition: { duration: MOTION.duration, ease: MOTION.easeOut, delay: i * MOTION.stagger },
	}),
};

type FadeUpProps = {
	children: React.ReactNode;
	index?: number;
	className?: string;
	as?: 'div' | 'span' | 'p' | 'li';
};

/** Entrance helper: fades + rises into view, respects reduced motion. */
export function FadeUp({ children, index = 0, className, as = 'div' }: FadeUpProps) {
	const reduced = useReducedMotion();
	const Comp = motion[as];

	if (reduced) {
		const Static = as;
		return <Static className={className}>{children}</Static>;
	}

	return (
		<Comp
			className={className}
			custom={index}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: '0px 0px -10% 0px' }}
			variants={fadeUpVariants}
		>
			{children}
		</Comp>
	);
}

/**
 * Word-by-word kinetic heading. Splits children text into words and
 * staggers them in. Falls back to plain text under reduced motion.
 */
export function MotionHeading({
	text,
	className,
	delay = 0,
	play = true,
}: {
	text: string;
	className?: string;
	delay?: number;
	/** Hold in the hidden state until true, then animate in once. */
	play?: boolean;
}) {
	const reduced = useReducedMotion();
	if (reduced) return <span className={className}>{text}</span>;

	const words = text.split(' ');
	return (
		<motion.span
			className={className}
			initial="hidden"
			animate={play ? 'visible' : 'hidden'}
			variants={{
				hidden: {},
				visible: { transition: { staggerChildren: MOTION.stagger, delayChildren: delay } },
			}}
			aria-label={text}
		>
			{words.map((word, i) => (
				<span
					key={`${word}-${i}`}
					style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.18em', marginBottom: '-0.18em' }}
					aria-hidden="true"
				>
					<motion.span
						style={{ display: 'inline-block', willChange: 'transform' }}
						variants={{
							hidden: { y: '110%' },
							visible: { y: 0, transition: { duration: MOTION.duration, ease: MOTION.easeOut } },
						}}
					>
						{word}
						{i < words.length - 1 ? ' ' : ''}
					</motion.span>
				</span>
			))}
		</motion.span>
	);
}
