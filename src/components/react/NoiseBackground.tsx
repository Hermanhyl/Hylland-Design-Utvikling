import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './motion-primitives';

type NoiseProps = {
	/** rAF frames between grain redraws (higher = cheaper). */
	patternRefreshInterval?: number;
	/** Grain alpha, 0–255. */
	patternAlpha?: number;
};

/**
 * Contained "noise + copper spotlight" background for a dark hero band.
 * Adapted from a supplied full-viewport component: scoped to its parent
 * (absolute inset-0, NOT fixed) and recoloured to the brand palette
 * (cinema-dark base + copper-glow radial spotlight instead of slate/orange).
 *
 * Performance/accessibility:
 *  - reduced-motion → draws the grain once, no rAF loop, no listeners.
 *  - pauses the rAF loop while the host is scrolled offscreen (IntersectionObserver).
 */
function Noise({ patternRefreshInterval = 3, patternAlpha = 16 }: NoiseProps) {
	const grainRef = useRef<HTMLCanvasElement | null>(null);
	const reduced = usePrefersReducedMotion();

	useEffect(() => {
		const canvas = grainRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) return;

		const canvasSize = 1024;
		canvas.width = canvasSize;
		canvas.height = canvasSize;

		const drawGrain = () => {
			const imageData = ctx.createImageData(canvasSize, canvasSize);
			const data = imageData.data;
			for (let i = 0; i < data.length; i += 4) {
				const value = Math.random() * 255;
				data[i] = value;
				data[i + 1] = value;
				data[i + 2] = value;
				data[i + 3] = patternAlpha;
			}
			ctx.putImageData(imageData, 0, 0);
		};

		// Reduced motion: a single static grain frame, no animation.
		if (reduced) {
			drawGrain();
			return;
		}

		let frame = 0;
		let animationId = 0;
		let running = true;

		const loop = () => {
			if (frame % patternRefreshInterval === 0) drawGrain();
			frame++;
			animationId = window.requestAnimationFrame(loop);
		};

		const start = () => {
			if (running) return;
			running = true;
			animationId = window.requestAnimationFrame(loop);
		};
		const stop = () => {
			running = false;
			window.cancelAnimationFrame(animationId);
		};

		// Pause the redraw loop while the host element is offscreen.
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) start();
				else stop();
			},
			{ threshold: 0 },
		);
		io.observe(canvas);

		running = false;
		start();

		return () => {
			window.cancelAnimationFrame(animationId);
			io.disconnect();
		};
	}, [patternRefreshInterval, patternAlpha, reduced]);

	return (
		<canvas
			ref={grainRef}
			className="pointer-events-none absolute inset-0 h-full w-full"
			style={{ imageRendering: 'pixelated' }}
		/>
	);
}

export default function NoiseBackground() {
	return (
		<div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
			{/* Copper radial spotlight near the top, on the cinema-dark base. */}
			<div
				className="absolute inset-0"
				style={{
					background:
						'radial-gradient(circle 620px at 50% 8%, color-mix(in srgb, var(--color-accent-glow) 55%, transparent), transparent 70%)',
				}}
			/>
			{/* A second deeper copper pool lower-left for warmth. */}
			<div
				className="absolute inset-0"
				style={{
					background:
						'radial-gradient(circle 480px at 18% 85%, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 72%)',
				}}
			/>
			<Noise patternRefreshInterval={3} patternAlpha={16} />
		</div>
	);
}
