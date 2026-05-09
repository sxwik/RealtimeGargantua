import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Tesseract() {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const spheresRef = useRef<THREE.InstancedMesh>(null);

  const { vertices, edges } = useMemo(() => {
    let v: number[][] = [];
    for (let i = 0; i < 16; i++) {
      v.push([
        (i & 1) === 0 ? -1 : 1,
        (i & 2) === 0 ? -1 : 1,
        (i & 4) === 0 ? -1 : 1,
        (i & 8) === 0 ? -1 : 1,
      ]);
    }
    let e: number[][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 4; j++) {
        let neighbor = i ^ (1 << j);
        if (i < neighbor) {
          e.push([i, neighbor]);
        }
      }
    }
    return { vertices: v, edges: e };
  }, []);

  const points = useMemo(() => new Float32Array(edges.length * 2 * 3), [edges]);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(points, 3));
    return geo;
  }, [points]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.4; // Base speed

    // 4D Rotation angles
    const angleXY = t * 0.5;
    const angleZW = t * 0.8;
    const angleXW = t * 0.3;
    const angleYZ = t * 0.4;

    const projected = vertices.map(v => {
      let [x, y, z, w] = v;

      // Rotate XY
      let nx = x * Math.cos(angleXY) - y * Math.sin(angleXY);
      let ny = x * Math.sin(angleXY) + y * Math.cos(angleXY);
      x = nx; y = ny;

      // Rotate YZ
      ny = y * Math.cos(angleYZ) - z * Math.sin(angleYZ);
      let nz = y * Math.sin(angleYZ) + z * Math.cos(angleYZ);
      y = ny; z = nz;

      // Rotate ZW
      nz = z * Math.cos(angleZW) - w * Math.sin(angleZW);
      let nw = z * Math.sin(angleZW) + w * Math.cos(angleZW);
      z = nz; w = nw;

      // Rotate XW
      nx = x * Math.cos(angleXW) - w * Math.sin(angleXW);
      nw = x * Math.sin(angleXW) + w * Math.cos(angleXW);
      x = nx; w = nw;

      // Stereographic projection from 4D to 3D
      const distance = 3.0; // Distance from 4D to camera
      const w_factor = 1.0 / (distance - w);
      return new THREE.Vector3(x * w_factor, y * w_factor, z * w_factor);
    });

    // Update lines
    let idx = 0;
    edges.forEach(([i, j]) => {
      const p1 = projected[i];
      const p2 = projected[j];
      points[idx++] = p1.x; points[idx++] = p1.y; points[idx++] = p1.z;
      points[idx++] = p2.x; points[idx++] = p2.y; points[idx++] = p2.z;
    });
    if (linesRef.current) {
        linesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Update spheres
    if (spheresRef.current) {
        projected.forEach((p, index) => {
          dummy.position.copy(p);
          // Scale spheres based on their 'depth' projected from 4D (size perspective)
          const depthScale = 0.5 + (0.5 * p.length());
          dummy.scale.set(depthScale, depthScale, depthScale);
          dummy.updateMatrix();
          spheresRef.current!.setMatrixAt(index, dummy.matrix);
        });
        spheresRef.current.instanceMatrix.needsUpdate = true;
    }

    if (groupRef.current) {
        // Slow overall 3D rotation
        groupRef.current.rotation.y = t * 0.1;
        groupRef.current.rotation.x = t * 0.05;
    }
  });

  return (
    <group ref={groupRef} scale={1.5}>
      <lineSegments ref={linesRef} geometry={geometry}>
        <lineBasicMaterial color="#00ffff" transparent opacity={0.6} linewidth={2} />
      </lineSegments>
      <instancedMesh ref={spheresRef} args={[null as any, null as any, 16]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#00ffff" emissiveIntensity={2} metalness={1} roughness={0.1} />
      </instancedMesh>
    </group>
  );
}
