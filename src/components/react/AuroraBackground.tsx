import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion, useIsLowPower } from './motion-primitives';

type Blob = {
	baseX: number;
	baseY: number;
	ampX: number;
	ampY: number;
	speedX: number;
	speedY: number;
	phaseX: number;
	phaseY: number;
	radius: number;
	color: string;
};

/**
 * Flowing copper "aurora" background for a dark hero. Several large soft radial
 * gradients drift on slow sinusoidal paths and glow via additive ('lighter')
 * compositing; one blob eases toward the cursor. Plain canvas2D over the
 * cinema-dark `.page-hero` — no per-frame blur, no WebGL.
 *
 * reduced-motion → one static frame, no loop/pointer. Loop pauses while the host
 * is offscreen; fewer blobs + lower dpr on low-power devices.
 */
export default function AuroraBackground() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const reduced = usePrefersReducedMotion();
	const lowPower = useIsLowPower();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Copper palette (rgb tuples).
		const colors = ['255, 106, 69', '184, 83, 58', '107, 46, 32', '216, 146, 128'];
		const COUNT = lowPower ? 3 : 5;
		const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);

		let w = 0;
		let h = 0;
		const blobs: Blob[] = [];
		const mouse = { x: 0, y: 0, active: false };

		const seed = () => {
			blobs.length = 0;
			for (let i = 0; i < COUNT; i++) {
				blobs.push({
					baseX: (0.2 + Math.random() * 0.6) * w,
					baseY: (0.1 + Math.random() * 0.7) * h,
					ampX: (0.08 + Math.random() * 0.16) * w,
					ampY: (0.06 + Math.random() * 0.14) * h,
					speedX: 0.04 + Math.random() * 0.05,
					speedY: 0.03 + Math.random() * 0.05,
					phaseX: Math.random() * Math.PI * 2,
					phaseY: Math.random() * Math.PI * 2,
					radius: (0.32 + Math.random() * 0.26) * Math.max(w, h),
					color: colors[i % colors.length],
				});
			}
		};

		const resize = () => {
			w = canvas.clientWidth;
			h = canvas.clientHeight;
			canvas.width = Math.max(1, Math.floor(w * dpr));
			canvas.height = Math.max(1, Math.floor(h * dpr));
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			seed();
		};

		const drawBlob = (x: number, y: number, radius: number, color: string, alpha: number) => {
			const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
			g.addColorStop(0, `rgba(${color}, ${alpha})`);
			g.addColorStop(1, `rgba(${color}, 0)`);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, w, h);
		};

		const render = (t: number) => {
			ctx.clearRect(0, 0, w, h);
			ctx.globalCompositeOperation = 'lighter';
			for (let i = 0; i < blobs.length; i++) {
				const b = blobs[i];
				let x = b.baseX + Math.sin(t * b.speedX + b.phaseX) * b.ampX;
				let y = b.baseY + Math.cos(t * b.speedY + b.phaseY) * b.ampY;
				// First blob eases toward the cursor.
				if (i === 0 && mouse.active) {
					x += (mouse.x - x) * 0.25;
					y += (mouse.y - y) * 0.25;
				}
				drawBlob(x, y, b.radius, b.color, 0.2);
			}
			ctx.globalCompositeOperation = 'source-over';
		};

		resize();

		if (reduced) {
			render(0);
			return;
		}

		let raf = 0;
		let running = false;
		let startT = 0;
		const loop = (now: number) => {
			if (!startT) startT = now;
			render((now - startT) / 1000);
			raf = requestAnimationFrame(loop);
		};
		const start = () => {
			if (running) return;
			running = true;
			raf = requestAnimationFrame(loop);
		};
		const stop = () => {
			running = false;
			cancelAnimationFrame(raf);
		};

		const onMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouse.x = e.clientX - rect.left;
			mouse.y = e.clientY - rect.top;
			mouse.active = true;
		};
		const onLeave = () => {
			mouse.active = false;
		};

		const ro = new ResizeObserver(resize);
		ro.observe(canvas);
		const io = new IntersectionObserver(
			([entry]) => (entry.isIntersecting ? start() : stop()),
			{ threshold: 0 },
		);
		io.observe(canvas);
		window.addEventListener('pointermove', onMove, { passive: true });
		window.addEventListener('pointerout', onLeave, { passive: true });

		return () => {
			stop();
			ro.disconnect();
			io.disconnect();
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerout', onLeave);
		};
	}, [reduced, lowPower]);

	return (
		<div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
			<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
		</div>
	);
}
