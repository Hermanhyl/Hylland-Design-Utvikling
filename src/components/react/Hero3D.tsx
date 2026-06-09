import { Suspense, useRef } from 'react';
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Environment, MeshDistortMaterial, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { type MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { usePrefersReducedMotion, useIsLowPower } from './motion-primitives';

/** Brand colours pulled from global.css tokens. */
const ACCENT = '#B8533A';
const ACCENT_GLOW = '#FF6A45';
const ACCENT_DEEP = '#6B2E20';

type SceneProps = {
	scrollProgress?: MotionValue<number>;
	reduced: boolean;
};

/** The signature object: a slowly drifting, refractive distorted shape. */
function HeroObject({ scrollProgress, reduced }: SceneProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const matRef = useRef<ThreeElements['meshStandardMaterial'] & { distort?: number }>(null);

	useFrame((state, delta) => {
		const mesh = meshRef.current;
		if (!mesh) return;

		// Scroll progress drives camera dolly + object scale/morph.
		const p = scrollProgress ? scrollProgress.get() : 0;

		// Dolly the camera in as the user scrolls through the hero runway.
		const targetZ = THREE.MathUtils.lerp(6, 2.4, p);
		state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, 4, delta);
		state.camera.lookAt(0, 0, 0);

		if (!reduced) {
			mesh.rotation.y += delta * 0.18;
			mesh.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.15;
		}

		const scale = 1 + p * 0.65;
		mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, scale, 4, delta));

		const mat = matRef.current as unknown as { distort?: number } | null;
		if (mat && typeof mat.distort === 'number') {
			mat.distort = 0.3 + p * 0.35;
		}
	});

	const detail = reduced ? 6 : 12;

	return (
		<Float speed={reduced ? 0 : 1.4} rotationIntensity={reduced ? 0 : 0.4} floatIntensity={reduced ? 0 : 0.8}>
			<mesh ref={meshRef} castShadow receiveShadow>
				<icosahedronGeometry args={[1.4, detail]} />
				{/* MeshDistortMaterial exposes a mutable `distort` uniform we drive per-frame. */}
				<MeshDistortMaterial
					ref={matRef as never}
					color={ACCENT}
					emissive={ACCENT_DEEP}
					emissiveIntensity={0.35}
					roughness={0.15}
					metalness={0.6}
					clearcoat={1}
					clearcoatRoughness={0.2}
					distort={0.3}
					speed={reduced ? 0 : 1.6}
				/>
			</mesh>
		</Float>
	);
}

function Lights() {
	return (
		<>
			<ambientLight intensity={0.35} />
			{/* Rust rim/glow lights — the single hero colour signature. */}
			<directionalLight position={[4, 5, 3]} intensity={2.2} color={ACCENT_GLOW} />
			<pointLight position={[-5, -2, -4]} intensity={40} color={ACCENT} distance={20} decay={2} />
			<pointLight position={[3, -3, 2]} intensity={18} color={ACCENT_GLOW} distance={15} decay={2} />
		</>
	);
}

export type Hero3DProps = {
	scrollProgress?: MotionValue<number>;
	/** Disable postprocessing/heavy work on low-end devices. */
	className?: string;
};

export default function Hero3D({ scrollProgress, className }: Hero3DProps) {
	const reduced = usePrefersReducedMotion();
	const lowPower = useIsLowPower();
	const usePost = !reduced && !lowPower;

	return (
		<Canvas
			className={className}
			dpr={lowPower ? [1, 1.5] : [1, 2]}
			gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
			camera={{ position: [0, 0, 6], fov: 42 }}
			frameloop={reduced ? 'demand' : 'always'}
			style={{ position: 'absolute', inset: 0 }}
		>
			<Suspense fallback={null}>
				<Lights />
				<HeroObject scrollProgress={scrollProgress} reduced={reduced} />
				<Environment preset="city" />
				{usePost && (
					<EffectComposer>
						<Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
						<Vignette eskil={false} offset={0.25} darkness={0.85} />
					</EffectComposer>
				)}
			</Suspense>
		</Canvas>
	);
}
