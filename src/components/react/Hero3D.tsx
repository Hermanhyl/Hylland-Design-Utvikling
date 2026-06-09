import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { type MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { usePrefersReducedMotion, useIsLowPower } from './motion-primitives';

/** Brand colours pulled from global.css tokens. */
const ACCENT = '#B8533A';
const ACCENT_GLOW = '#FF6A45';

type Quality = 'glass' | 'gem';

type SceneProps = {
	scrollProgress?: MotionValue<number>;
	reduced: boolean;
	quality: Quality;
};

/** The signature object: a slowly drifting refractive crystal (or faceted gem). */
function HeroObject({ scrollProgress, reduced, quality }: SceneProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	// drei material instance — we mutate its distortion uniforms per-frame.
	const matRef = useRef<{ distortion?: number; temporalDistortion?: number } | null>(null);

	useFrame((state, delta) => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const p = scrollProgress ? scrollProgress.get() : 0;

		// Dolly the camera in as the user scrolls through the hero runway.
		const targetZ = THREE.MathUtils.lerp(6, 2.4, p);
		state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, 4, delta);
		state.camera.lookAt(0, 0, 0);

		if (!reduced) {
			mesh.rotation.y += delta * 0.16;
			mesh.rotation.x = Math.sin(state.clock.elapsedTime * 0.14) * 0.14;
		}

		const scale = 1 + p * 0.65;
		mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, scale, 4, delta));

		// Glass: morph the refraction as you scroll for a liquid-crystal feel.
		const mat = matRef.current;
		if (mat && typeof mat.distortion === 'number') {
			mat.distortion = 0.25 + p * 0.35;
			mat.temporalDistortion = 0.1 + p * 0.15;
		}
	});

	const detail = quality === 'glass' ? (reduced ? 4 : 6) : 0;

	return (
		<Float speed={reduced ? 0 : 1.3} rotationIntensity={reduced ? 0 : 0.35} floatIntensity={reduced ? 0 : 0.7}>
			<mesh ref={meshRef}>
				<icosahedronGeometry args={[1.4, detail]} />
				{quality === 'glass' ? (
					<MeshTransmissionMaterial
						ref={matRef as never}
						samples={6}
						resolution={512}
						thickness={1.2}
						roughness={0.08}
						transmission={1}
						ior={1.45}
						chromaticAberration={0.05}
						anisotropy={0.3}
						distortion={0.25}
						distortionScale={0.4}
						temporalDistortion={0.1}
						color="#F4E8E2"
						attenuationColor={ACCENT}
						attenuationDistance={0.85}
						clearcoat={1}
						clearcoatRoughness={0.15}
					/>
				) : (
					<meshStandardMaterial
						color={ACCENT}
						emissive={ACCENT}
						emissiveIntensity={0.18}
						flatShading
						metalness={0.35}
						roughness={0.38}
					/>
				)}
			</mesh>
		</Float>
	);
}

function Lights({ quality }: { quality: Quality }) {
	// Glass reads best with softer rim light + the environment doing the work;
	// the gem wants a touch more direct light to catch its facets.
	const rim = quality === 'glass' ? 1.6 : 2.4;
	return (
		<>
			<ambientLight intensity={0.4} />
			<directionalLight position={[4, 5, 3]} intensity={rim} color={ACCENT_GLOW} />
			<pointLight position={[-5, -2, -4]} intensity={26} color={ACCENT} distance={20} decay={2} />
			<pointLight position={[3, -3, 2]} intensity={16} color={ACCENT_GLOW} distance={15} decay={2} />
			{/* Warm core glow that reads through the glass body. */}
			<pointLight position={[0, 0, 0]} intensity={6} color={ACCENT_GLOW} distance={5} decay={2} />
		</>
	);
}

export type Hero3DProps = {
	scrollProgress?: MotionValue<number>;
	className?: string;
};

export default function Hero3D({ scrollProgress, className }: Hero3DProps) {
	const reduced = usePrefersReducedMotion();
	const lowPower = useIsLowPower();
	// Refractive glass on capable devices; crisp faceted gem on low-power
	// (transmission renders an extra buffer that can tank mobile).
	const quality: Quality = lowPower ? 'gem' : 'glass';
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
				<Lights quality={quality} />
				<HeroObject scrollProgress={scrollProgress} reduced={reduced} quality={quality} />
				<Environment preset="studio" />
				{usePost && (
					<EffectComposer>
						<Bloom intensity={0.6} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur />
						<Vignette eskil={false} offset={0.25} darkness={0.8} />
					</EffectComposer>
				)}
			</Suspense>
		</Canvas>
	);
}
