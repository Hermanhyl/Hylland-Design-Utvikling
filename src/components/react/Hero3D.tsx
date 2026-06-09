import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial, Float } from '@react-three/drei';
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

const damp = THREE.MathUtils.damp;

/** The signature object: a slowly drifting refractive crystal (or faceted gem). */
function HeroObject({ scrollProgress, reduced, quality }: SceneProps) {
	const groupRef = useRef<THREE.Group>(null); // magnetic-to-cursor wrapper
	const meshRef = useRef<THREE.Mesh>(null); // continuous spin
	const matRef = useRef<{ distortion?: number; temporalDistortion?: number } | null>(null);

	useFrame((state, delta) => {
		const group = groupRef.current;
		const mesh = meshRef.current;
		if (!group || !mesh) return;

		const p = scrollProgress ? scrollProgress.get() : 0;

		// Dolly the camera in as the user scrolls through the hero runway.
		const targetZ = damp(state.camera.position.z, THREE.MathUtils.lerp(6, 2.4, p), 4, delta);
		state.camera.position.z = targetZ;
		state.camera.lookAt(0, 0, 0);

		if (!reduced) {
			// Magnetic: the whole object eases toward the cursor (NDC -1..1).
			const px = state.pointer.x;
			const py = state.pointer.y;
			group.rotation.y = damp(group.rotation.y, px * 0.45, 3, delta);
			group.rotation.x = damp(group.rotation.x, -py * 0.32, 3, delta);
			group.position.x = damp(group.position.x, px * 0.4, 3, delta);
			group.position.y = damp(group.position.y, py * 0.28, 3, delta);

			// Continuous slow spin on top of the magnetic tilt.
			mesh.rotation.y += delta * 0.22;
		}

		const scale = 1 + p * 0.65;
		mesh.scale.setScalar(damp(mesh.scale.x, scale, 4, delta));

		const mat = matRef.current;
		if (mat && typeof mat.distortion === 'number') {
			mat.distortion = 0.28 + p * 0.32;
			mat.temporalDistortion = 0.12 + p * 0.15;
		}
	});

	const detail = quality === 'glass' ? (reduced ? 4 : 8) : 0;

	return (
		<group ref={groupRef}>
			<Float speed={reduced ? 0 : 1.6} rotationIntensity={reduced ? 0 : 0.5} floatIntensity={reduced ? 0 : 1}>
				<mesh ref={meshRef}>
					<icosahedronGeometry args={[1.4, detail]} />
					{quality === 'glass' ? (
						<MeshTransmissionMaterial
							ref={matRef as never}
							samples={6}
							resolution={512}
							thickness={1.4}
							roughness={0.06}
							transmission={1}
							ior={1.5}
							chromaticAberration={0.06}
							anisotropy={0.2}
							distortion={0.28}
							distortionScale={0.4}
							temporalDistortion={0.12}
							color="#F4E8E2"
							attenuationColor={ACCENT}
							attenuationDistance={0.7}
							clearcoat={1}
							clearcoatRoughness={0.2}
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
		</group>
	);
}

/**
 * Soft, broad lighting via an inline environment of area lights (Lightformers)
 * instead of discrete point lights — this makes the rust read as smooth,
 * integrated reflection/refraction across the glass rather than three hot dots.
 */
function Lights() {
	return (
		<>
			<ambientLight intensity={0.5} />
			<Environment resolution={256}>
				{/* Broad rust glow filling most of the frame from the right. */}
				<Lightformer
					form="rect"
					intensity={2.2}
					color={ACCENT_GLOW}
					position={[3.5, 1, 3]}
					scale={[7, 7, 1]}
				/>
				{/* Deeper rust from below-left for warmth in the body of the glass. */}
				<Lightformer
					form="circle"
					intensity={1.6}
					color={ACCENT}
					position={[-3, -2.5, 2]}
					scale={5}
				/>
				{/* A single soft, cool key so it still reads as glass — kept dim and
				    off to the right so it doesn't blow out the headline on the left. */}
				<Lightformer
					form="rect"
					intensity={1.1}
					color="#dfe3ea"
					position={[4, 3, 1]}
					scale={[3, 3, 1]}
				/>
			</Environment>
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
				<Lights />
				<HeroObject scrollProgress={scrollProgress} reduced={reduced} quality={quality} />
				{usePost && (
					<EffectComposer>
						{/* Lower, higher-threshold bloom: only the very brightest glints
						    bloom, so highlights no longer wash over the headline. */}
						<Bloom intensity={0.4} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
						<Vignette eskil={false} offset={0.3} darkness={0.7} />
					</EffectComposer>
				)}
			</Suspense>
		</Canvas>
	);
}
