import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion, useIsLowPower } from './motion-primitives';

type Point = { x: number; y: number; vx: number; vy: number };

/**
 * Cursor-interactive copper "constellation" background, scoped to a dark hero.
 * Drifting points connected by faint lines; links/points near the pointer
 * brighten and the nearest points ease toward it. Plain canvas2D (no WebGL) —
 * light and reliable, like NoiseBackground.
 *
 * Accessibility/perf: reduced-motion draws a single static frame (no loop, no
 * pointer); the rAF loop pauses while the host is scrolled offscreen; fewer
 * points + lower DPR on low-power devices.
 */
export default function ConstellationBackground() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const reduced = usePrefersReducedMotion();
	const lowPower = useIsLowPower();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const accent = '184, 83, 58'; // --color-accent #B8533A
		const glow = '255, 106, 69'; // --color-accent-glow #FF6A45

		const COUNT = lowPower ? 38 : 90;
		const LINK_DIST = lowPower ? 130 : 160;
		const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);

		let w = 0;
		let h = 0;
		const points: Point[] = [];
		const mouse = { x: -9999, y: -9999, active: false };

		const seed = () => {
			points.length = 0;
			for (let i = 0; i < COUNT; i++) {
				points.push({
					x: Math.random() * w,
					y: Math.random() * h,
					vx: (Math.random() - 0.5) * 0.25,
					vy: (Math.random() - 0.5) * 0.25,
				});
			}
		};

		const resize = () => {
			w = canvas.clientWidth;
			h = canvas.clientHeight;
			canvas.width = Math.max(1, Math.floor(w * dpr));
			canvas.height = Math.max(1, Math.floor(h * dpr));
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (points.length === 0) seed();
		};

		const draw = () => {
			ctx.clearRect(0, 0, w, h);

			for (const p of points) {
				// Cursor pull (subtle) + drift.
				if (mouse.active) {
					const dx = mouse.x - p.x;
					const dy = mouse.y - p.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < 220 * 220) {
						const f = (1 - Math.sqrt(d2) / 220) * 0.06;
						p.vx += dx * f * 0.02;
						p.vy += dy * f * 0.02;
					}
				}
				p.x += p.vx;
				p.y += p.vy;
				p.vx *= 0.99;
				p.vy *= 0.99;
				// gentle constant drift floor
				if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.04;
				if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.04;
				// wrap
				if (p.x < -10) p.x = w + 10;
				if (p.x > w + 10) p.x = -10;
				if (p.y < -10) p.y = h + 10;
				if (p.y > h + 10) p.y = -10;
			}

			// Links
			for (let i = 0; i < points.length; i++) {
				const a = points[i];
				for (let j = i + 1; j < points.length; j++) {
					const b = points[j];
					const dx = a.x - b.x;
					const dy = a.y - b.y;
					const dist = Math.hypot(dx, dy);
					if (dist > LINK_DIST) continue;
					const base = (1 - dist / LINK_DIST) * 0.5;
					// brighten links near the cursor
					let near = 0;
					if (mouse.active) {
						const mx = (a.x + b.x) / 2 - mouse.x;
						const my = (a.y + b.y) / 2 - mouse.y;
						const md = Math.hypot(mx, my);
						if (md < 200) near = (1 - md / 200) * 0.6;
					}
					ctx.strokeStyle = `rgba(${near > 0.15 ? glow : accent}, ${(base + near).toFixed(3)})`;
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}

			// Points
			for (const p of points) {
				let glowAmt = 0;
				if (mouse.active) {
					const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
					if (md < 200) glowAmt = 1 - md / 200;
				}
				ctx.fillStyle = `rgba(${glowAmt > 0.2 ? glow : accent}, ${(0.5 + glowAmt * 0.5).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 1.6 + glowAmt * 1.6, 0, Math.PI * 2);
				ctx.fill();
			}
		};

		resize();

		if (reduced) {
			draw();
			return;
		}

		let raf = 0;
		let running = false;
		const loop = () => {
			draw();
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
			mouse.x = -9999;
			mouse.y = -9999;
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
			{/* Soft copper glow for warmth behind the network. */}
			<div
				className="absolute inset-0"
				style={{
					background:
						'radial-gradient(circle 640px at 70% 12%, color-mix(in srgb, var(--color-accent-glow) 38%, transparent), transparent 70%)',
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					background:
						'radial-gradient(circle 520px at 12% 88%, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent 72%)',
				}}
			/>
			<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
		</div>
	);
}
