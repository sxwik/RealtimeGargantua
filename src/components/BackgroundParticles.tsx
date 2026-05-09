import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function BackgroundParticles({ count = 2000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  const particles = useRef(
    Array.from({ length: count }, () => {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 10 + Math.random() * 30;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      return {
        position: new THREE.Vector3(x, y, z),
        speed: 0.01 + Math.random() * 0.03,
        offset: Math.random() * Math.PI * 2,
      };
    })
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    particles.current.forEach((particle, i) => {
      dummy.position.copy(particle.position);
      // Slight floating motion
      dummy.position.y += Math.sin(t * particle.speed + particle.offset) * 0.5;
      dummy.position.x += Math.cos(t * particle.speed + particle.offset) * 0.5;

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.rotation.y = t * 0.05;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
    </instancedMesh>
  );
}
