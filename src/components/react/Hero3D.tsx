import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion, useIsLowPower } from './motion-primitives';

/**
 * "Anomalous matter" hero scene — a wireframe icosahedron displaced by Perlin
 * noise, with a fresnel rim glow and a point light that follows the cursor.
 * Raw three.js (no r3f) in a single effect. Coloured in the site's copper/rust
 * palette rather than the original blue.
 *
 * Reuses the existing hero contract: receives the scroll progress MotionValue
 * (drives a camera dolly so the scroll-zoom still works) and a className for
 * the absolutely-positioned mount.
 */

const COPPER = new THREE.Color('#B8533A');
const ORANGE = new THREE.Color('#FF6A45');

const vertexShader = `
	uniform float uTime;
	uniform float uScroll;
	varying vec3 vNormal;
	varying vec3 vPosition;

	vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
	vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
	float snoise(vec3 v) {
		const vec2 C = vec2(1.0/6.0, 1.0/3.0);
		const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
		vec3 i = floor(v + dot(v, C.yyy));
		vec3 x0 = v - i + dot(i, C.xxx);
		vec3 g = step(x0.yzx, x0.xyz);
		vec3 l = 1.0 - g;
		vec3 i1 = min(g.xyz, l.zxy);
		vec3 i2 = max(g.xyz, l.zxy);
		vec3 x1 = x0 - i1 + C.xxx;
		vec3 x2 = x0 - i2 + C.yyy;
		vec3 x3 = x0 - D.yyy;
		i = mod289(i);
		vec4 p = permute(permute(permute(
					i.z + vec4(0.0, i1.z, i2.z, 1.0))
				+ i.y + vec4(0.0, i1.y, i2.y, 1.0))
				+ i.x + vec4(0.0, i1.x, i2.x, 1.0));
		float n_ = 0.142857142857;
		vec3 ns = n_ * D.wyz - D.xzx;
		vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
		vec4 x_ = floor(j * ns.z);
		vec4 y_ = floor(j - 7.0 * x_);
		vec4 x = x_ * ns.x + ns.yyyy;
		vec4 y = y_ * ns.x + ns.yyyy;
		vec4 h = 1.0 - abs(x) - abs(y);
		vec4 b0 = vec4(x.xy, y.xy);
		vec4 b1 = vec4(x.zw, y.zw);
		vec4 s0 = floor(b0) * 2.0 + 1.0;
		vec4 s1 = floor(b1) * 2.0 + 1.0;
		vec4 sh = -step(h, vec4(0.0));
		vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
		vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
		vec3 p0 = vec3(a0.xy, h.x);
		vec3 p1 = vec3(a0.zw, h.y);
		vec3 p2 = vec3(a1.xy, h.z);
		vec3 p3 = vec3(a1.zw, h.w);
		vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
		p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
		vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
		m = m * m;
		return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
	}

	void main() {
		vNormal = normal;
		vPosition = position;
		float amp = 0.18 + uScroll * 0.22;
		float displacement = snoise(position * 2.0 + uTime * 0.5) * amp;
		vec3 newPosition = position + normal * displacement;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
	}
`;

const fragmentShader = `
	uniform vec3 uColor;
	uniform vec3 uGlow;
	uniform vec3 uLightPos;
	varying vec3 vNormal;
	varying vec3 vPosition;

	void main() {
		vec3 normal = normalize(vNormal);
		vec3 lightDir = normalize(uLightPos - vPosition);
		float diffuse = max(dot(normal, lightDir), 0.0);

		// Fresnel rim glow.
		float fresnel = 1.0 - dot(normal, vec3(0.0, 0.0, 1.0));
		fresnel = pow(fresnel, 2.0);

		vec3 finalColor = uColor * (0.25 + diffuse) + uGlow * fresnel * 0.9;
		gl_FragColor = vec4(finalColor, 1.0);
	}
`;

export type Hero3DProps = {
	scrollProgress?: MotionValue<number>;
	className?: string;
};

export default function Hero3D({ scrollProgress, className }: Hero3DProps) {
	const mountRef = useRef<HTMLDivElement>(null);
	const reduced = usePrefersReducedMotion();
	const lowPower = useIsLowPower();

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(
			75,
			mount.clientWidth / mount.clientHeight || 1,
			0.1,
			1000,
		);
		camera.position.z = 3.2;

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(mount.clientWidth, mount.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
		mount.appendChild(renderer.domElement);

		// Wireframe detail: kept moderate so the per-frame line draw doesn't
		// contend with the hero text entrance animation on load.
		const detail = lowPower ? 6 : 14;
		const geometry = new THREE.IcosahedronGeometry(1.3, detail);
		const material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uScroll: { value: 0 },
				uLightPos: { value: new THREE.Vector3(0, 0, 5) },
				uColor: { value: COPPER.clone() },
				uGlow: { value: ORANGE.clone() },
			},
			vertexShader,
			fragmentShader,
			wireframe: true,
			transparent: true,
		});

		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		const tmpVec = new THREE.Vector3();
		const targetLight = new THREE.Vector3(0, 0, 5);

		let frameId = 0;
		let camZ = 3.2;

		const renderOnce = () => renderer.render(scene, camera);

		const animate = (t: number) => {
			material.uniforms.uTime.value = t * 0.0003;

			const p = scrollProgress ? scrollProgress.get() : 0;
			material.uniforms.uScroll.value = p;
			// Scroll dolly (the scroll-zoom): ease the camera in.
			camZ += (THREE.MathUtils.lerp(3.2, 1.7, p) - camZ) * 0.06;
			camera.position.z = camZ;

			// Ease the light toward the cursor target (magnetic glow).
			material.uniforms.uLightPos.value.lerp(targetLight, 0.08);

			mesh.rotation.y += 0.0011;
			mesh.rotation.x += 0.0005;
			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		};

		if (reduced) {
			renderOnce();
		} else {
			frameId = requestAnimationFrame(animate);
		}

		const handleResize = () => {
			const w = mount.clientWidth;
			const h = mount.clientHeight;
			if (!w || !h) return;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
			if (reduced) renderOnce();
		};

		const handleMouseMove = (e: MouseEvent) => {
			const x = (e.clientX / window.innerWidth) * 2 - 1;
			const y = -(e.clientY / window.innerHeight) * 2 + 1;
			tmpVec.set(x, y, 0.5).unproject(camera);
			const dir = tmpVec.sub(camera.position).normalize();
			const dist = -camera.position.z / dir.z;
			targetLight.copy(camera.position).add(dir.multiplyScalar(dist));
		};

		const ro = new ResizeObserver(handleResize);
		ro.observe(mount);
		if (!reduced) window.addEventListener('mousemove', handleMouseMove);

		return () => {
			cancelAnimationFrame(frameId);
			ro.disconnect();
			window.removeEventListener('mousemove', handleMouseMove);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
			if (renderer.domElement.parentNode === mount) {
				mount.removeChild(renderer.domElement);
			}
		};
	}, [reduced, lowPower, scrollProgress]);

	return <div ref={mountRef} className={className} />;
}
