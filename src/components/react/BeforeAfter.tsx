import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export type BeforeAfterProps = {
	before: string;
	after: string;
	beforeAlt: string;
	afterAlt: string;
	/** Short context for the slider's accessible name, e.g. "forsiden". */
	label?: string;
};

const clamp = (v: number) => (v < 0 ? 0 : v > 100 ? 100 : v);

/**
 * Drag-to-compare before/after slider. The ETTER image sits underneath (full),
 * the FØR image is layered on top and clipped to the left of a draggable handle
 * so the left side shows FØR and the right side shows ETTER.
 *
 * Built on the codebase's imperative conventions: the handle position lives in a
 * ref and is written straight to a CSS custom property (`--pos`) on pointer/
 * keyboard input — no React re-render per frame, no scroll-linked motion.*.
 *
 * The frame keeps `touch-action: pan-y` (CSS) so a vertical swipe still scrolls
 * the page; only horizontal drags move the handle. Pre-hydration and
 * prefers-reduced-motion fall back to a static side-by-side view (also the
 * SEO / no-JS view), so every image is reachable without interaction.
 */
export default function BeforeAfter({ before, after, beforeAlt, afterAlt, label }: BeforeAfterProps) {
	const frameRef = useRef<HTMLDivElement>(null);
	const knobRef = useRef<HTMLButtonElement>(null);
	const posRef = useRef(50);
	const draggingRef = useRef(false);
	const reduced = useReducedMotion();
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => setHydrated(true), []);

	const interactive = hydrated && !reduced;

	const writePos = (p: number) => {
		const v = clamp(p);
		posRef.current = v;
		frameRef.current?.style.setProperty('--pos', `${v.toFixed(2)}%`);
		knobRef.current?.setAttribute('aria-valuenow', String(Math.round(v)));
	};

	// Pointer drag (mouse + touch). Attached imperatively so we control capture.
	useEffect(() => {
		if (!interactive) return;
		const frame = frameRef.current;
		if (!frame) return;

		writePos(50);

		const posFromX = (clientX: number) => {
			const rect = frame.getBoundingClientRect();
			return rect.width ? ((clientX - rect.left) / rect.width) * 100 : 50;
		};

		const onDown = (e: PointerEvent) => {
			draggingRef.current = true;
			frame.setPointerCapture?.(e.pointerId);
			writePos(posFromX(e.clientX));
		};
		const onMove = (e: PointerEvent) => {
			if (!draggingRef.current) return;
			writePos(posFromX(e.clientX));
		};
		const onUp = (e: PointerEvent) => {
			draggingRef.current = false;
			frame.releasePointerCapture?.(e.pointerId);
		};
		const onCancel = () => {
			draggingRef.current = false;
		};

		frame.addEventListener('pointerdown', onDown);
		frame.addEventListener('pointermove', onMove);
		frame.addEventListener('pointerup', onUp);
		frame.addEventListener('pointercancel', onCancel);
		return () => {
			frame.removeEventListener('pointerdown', onDown);
			frame.removeEventListener('pointermove', onMove);
			frame.removeEventListener('pointerup', onUp);
			frame.removeEventListener('pointercancel', onCancel);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [interactive]);

	const onKeyDown = (e: React.KeyboardEvent) => {
		const step = e.shiftKey ? 10 : 2;
		let next = posRef.current;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next -= step;
		else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next += step;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = 100;
		else return;
		e.preventDefault();
		writePos(next);
	};

	// Static fallback: side-by-side (stacks on mobile), labelled, no interaction.
	if (!interactive) {
		return (
			<div className="cmp-fallback">
				<figure className="cmp-fallback-item">
					<img src={before} alt={beforeAlt} loading="lazy" decoding="async" />
					<figcaption className="cmp-pill cmp-pill--before">FØR</figcaption>
				</figure>
				<figure className="cmp-fallback-item">
					<img src={after} alt={afterAlt} loading="lazy" decoding="async" />
					<figcaption className="cmp-pill cmp-pill--after">ETTER</figcaption>
				</figure>
			</div>
		);
	}

	return (
		<div ref={frameRef} className="cmp-frame" style={{ '--pos': '50%' } as React.CSSProperties}>
			{/* ETTER underneath (always full) */}
			<img className="cmp-img" src={after} alt={afterAlt} loading="lazy" decoding="async" draggable={false} />
			{/* FØR on top, clipped to the left of the handle */}
			<div className="cmp-before-wrap">
				<img className="cmp-img" src={before} alt={beforeAlt} loading="lazy" decoding="async" draggable={false} />
			</div>

			<span className="cmp-pill cmp-pill--before" aria-hidden="true">FØR</span>
			<span className="cmp-pill cmp-pill--after" aria-hidden="true">ETTER</span>

			<button
				ref={knobRef}
				type="button"
				className="cmp-handle"
				role="slider"
				aria-label={label ? `Dra for å sammenligne før og etter: ${label}` : 'Dra for å sammenligne før og etter'}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={50}
				aria-orientation="horizontal"
				onKeyDown={onKeyDown}
			>
				<span className="cmp-handle-line" aria-hidden="true" />
				<span className="cmp-handle-knob" aria-hidden="true">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
						<path
							d="M9 7l-5 5 5 5M15 7l5 5-5 5"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
			</button>
		</div>
	);
}
