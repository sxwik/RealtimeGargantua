import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Text, Float, MeshReflectorMaterial, Instance, Instances, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Tesseract } from './Tesseract';
import { BackgroundParticles } from './BackgroundParticles';
import { AudioController } from './AudioController';
import { BlackHole } from './BlackHole';

function CameraController() {
  const scroll = useScroll();
  const { camera } = useThree();

  useFrame((state) => {
    const offset = scroll.offset; // 0 to 1
    
    // Total journey depth into the structure
    // We want to pass through everything and end up plunging into the black hole at -400
    const targetZ = -offset * 410; 
    
    // Smooth cinematic path
    // Weave the camera horizontally and vertically through massive structures
    const targetX = Math.sin(offset * Math.PI * 6) * 15 * (1 - offset * 0.8); // Narrow down as we approach the hole
    const targetY = Math.cos(offset * Math.PI * 4) * 8 * (1 - offset * 0.8);

    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);

    // LookTarget shifts towards the black hole
    const lookAtX = Math.sin((offset + 0.05) * Math.PI * 6) * 15 * (1 - offset) * 0.2;
    const lookAtY = Math.cos((offset + 0.05) * Math.PI * 4) * 8 * (1 - offset) * 0.2;
    
    // As offset -> 1, lock onto the black hole center
    const lockOnStrength = Math.pow(offset, 3); // sharply increases near the end
    const finalLookAtX = THREE.MathUtils.lerp(lookAtX, 0, lockOnStrength);
    const finalLookAtY = THREE.MathUtils.lerp(lookAtY, 0, lockOnStrength);
    const finalLookAtZ = camera.position.z - 30 - (offset * 100);

    // Camera roll (banking) during turns, increasing as gravitation pulls
    const baseRoll = Math.sin(offset * Math.PI * 6) * 0.15;
    const gravitationalRoll = offset * offset * Math.PI; // Full barrel roll at the event horizon
    const roll = baseRoll + gravitationalRoll;
    
    const targetLookAt = new THREE.Vector3(finalLookAtX, finalLookAtY, finalLookAtZ);
    
    // Smooth lookat
    const currentLookAt = new THREE.Vector3(0, 0, -1);
    currentLookAt.applyQuaternion(camera.quaternion);
    currentLookAt.add(camera.position);
    currentLookAt.lerp(targetLookAt, 0.05);
    
    camera.lookAt(currentLookAt);
    
    // Apply roll by explicitly modifying quaternion after lookAt
    camera.rotateZ(roll);

    // FOV distortion as we get deeper and accelerate into the void
    // Extreme lensing FOV as we enter the hole
    const targetFov = 60 + Math.pow(offset, 4) * 100; 
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function Megastructures() {
  const count = 300;
  const blocks = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      // Keep clear path in middle for the camera
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (Math.random() * 80 + 20); // Wider spread
      const z = -Math.random() * 350; // Deeper spread
      const y = (Math.random() - 0.5) * 150;
      
      // Rotate fragments based on distance to core (simulate gravitational pull)
      const distanceToCore = Math.abs(z - (-400));
      const distortion = Math.max(0, 150 - distanceToCore) / 150; // 0 to 1 closer to core
      
      return {
        key: i,
        position: [x, y, z] as [number, number, number],
        scale: [
          (Math.random() * 10 + 5) * (1 + distortion * 2), // Stretch near hole
          (Math.random() * 100 + 30) * (1 + distortion * 5),
          (Math.random() * 10 + 5) * (1 + distortion * 2)
        ] as [number, number, number],
        rotationParams: { speed: 0.05 + distortion * 0.2, offset: i },
        initialDistortion: distortion
      };
    });
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
        const t = clock.getElapsedTime();
        groupRef.current.children.forEach((child, i) => {
            const data = blocks[i];
            // Impossibly slow, grinding architectural drift
            child.position.y += Math.sin(t * data.rotationParams.speed + data.rotationParams.offset) * 0.05;
            child.rotation.x = Math.sin(t * 0.1 + i) * 0.005;
            
            // If very close to the black hole, orbit it
            if (data.initialDistortion > 0.2) {
              const angle = t * 0.1 * data.initialDistortion;
              const radius = 50 + data.initialDistortion * 50;
              // Add a slight orbital wobble
              // child.position.x = Math.cos(angle + i) * radius;
              child.rotation.y = angle;
            }
        });
    }
  });

  return (
    <group ref={groupRef}>
      <Instances range={count} limit={count}>
        <boxGeometry />
        {/* Deep, highly reflective brutalist material */}
        <meshStandardMaterial color="#050508" metalness={1} roughness={0.05} envMapIntensity={2} />
        {blocks.map((props) => (
          <Instance key={props.key} position={props.position} scale={props.scale} />
        ))}
      </Instances>
    </group>
  );
}

function RecursiveGates() {
    const groupRef = useRef<THREE.Group>(null);
    useFrame(({clock}) => {
        if(!groupRef.current) return;
        const t = clock.getElapsedTime() * 0.3;
        groupRef.current.children.forEach((child, i) => {
            child.rotation.z = Math.sin(t + i * 0.1) * Math.PI;
            // Pulsating scaling effect
            child.scale.setScalar(1 + Math.sin(t * 1.5 + i * 0.5) * 0.1);
            
            // Give them a slight spin towards the singularity
            child.rotation.x = -Math.PI / 16;
        });
    });

    // We put these gates closer to the middle of the journey
    return (
        <group ref={groupRef} position={[0, 0, -180]}>
            {Array.from({length: 30}).map((_, i) => (
                <group key={i} position={[0, 0, -i * 8]}>
                    <mesh position={[0, 25, 0]}>
                        <boxGeometry args={[52, 2, 2]} />
                        <meshStandardMaterial color={i % 3 === 0 ? "#ffffff" : "#020204"} emissive={i % 3 === 0 ? "#00aaff" : "#000"} emissiveIntensity={1} metalness={0.9} roughness={0.1} />
                    </mesh>
                    <mesh position={[0, -25, 0]}>
                        <boxGeometry args={[52, 2, 2]} />
                        <meshStandardMaterial color="#020204" metalness={1} roughness={0.05} />
                    </mesh>
                    <mesh position={[-25, 0, 0]}>
                        <boxGeometry args={[2, 52, 2]} />
                        <meshStandardMaterial color="#020204" metalness={1} roughness={0.05} />
                    </mesh>
                    <mesh position={[25, 0, 0]}>
                        <boxGeometry args={[2, 52, 2]} />
                        <meshStandardMaterial color="#020204" metalness={1} roughness={0.05} />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

function GroundReflection() {
    return (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -40, -200]}>
            <planeGeometry args={[300, 800]} />
            <MeshReflectorMaterial 
                blur={[400, 100]}
                resolution={1024}
                mixBlur={1}
                mixStrength={150}
                roughness={0.05}
                depthScale={1.5}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#020204"
                metalness={0.9}
                mirror={1}
            />
        </mesh>
    )
}

function DimensionalText({ position, title, subtitle, size = 2 }: any) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera, clock }) => {
    if (ref.current) {
      ref.current.quaternion.slerp(camera.quaternion, 0.05);
      ref.current.position.y += Math.sin(clock.getElapsedTime() + position[2]) * 0.005;
    }
  });

  return (
    <group position={position} ref={ref}>
      <Text
        position={[0, 1.5, 0]}
        fontSize={size}
        color="#ffffff"
        letterSpacing={0.1}
        font="https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYpntP.woff"
        material-transparent
        material-opacity={0.9}
      >
        {title}
      </Text>
      <Text
        position={[0, 0, 0]}
        fontSize={size * 0.15}
        color="#00ffff"
        letterSpacing={0.4}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        material-transparent
        material-opacity={0.7}
      >
        {subtitle}
      </Text>
    </group>
  );
}

export function CinematicScene() {
  return (
    <group>
      <Environment preset="city" />
      <CameraController />
      <AudioController />
      
      {/* Intense Cinematic Lighting */}
      <ambientLight intensity={0.1} color="#ffffff" />
      
      {/* Directional light casting distinct shadows from above */}
      <directionalLight position={[20, 50, 20]} intensity={2} color="#ffffff" />
      
      {/* A warm accent light to break the monochrome slightly */}
      <spotLight position={[-30, 20, -50]} intensity={300} angle={0.5} penumbra={1} color="#aaccff" distance={150} />
      
      {/* Piercing focal lights cutting through the fog */}
      <pointLight position={[0, 0, -40]} intensity={50} color="#00aaff" distance={80} />
      <pointLight position={[0, 20, -140]} intensity={100} color="#ffffff" distance={150} />
      
      {/* Infinite reflection layer mapping the space */}
      <GroundReflection />

      {/* Megastructures defining the world borders */}
      <Megastructures />

      {/* Atmospheric Particles */}
      <group scale={[8, 8, 40]} position={[0, 0, -200]}>
        <BackgroundParticles count={8000} />
      </group>

      {/* --- SCENE MILESTONES --- */}

      <DimensionalText 
        position={[0, 0, -10]} 
        title="VOID RECEPTION" 
        subtitle="EUCLIDEAN LAW SUSPENDED"
        size={1.5}
      />

      {/* 4D Core Projection */}
      <group position={[0, 10, -90]}>
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
          <group scale={8}>
            <Tesseract />
          </group>
        </Float>
        <DimensionalText 
          position={[-15, -8, 10]} 
          title="HYPERCUBE" 
          subtitle="4D PROJECTION IN REAL TIME"
          size={3}
        />
      </group>

      {/* Recursive Gates / Corridors */}
      <RecursiveGates />
      <DimensionalText 
        position={[12, 10, -160]} 
        title="RECURSION" 
        subtitle="SPATIAL LOOP ITERATION 9,492"
        size={2.5}
      />

      <DimensionalText 
        position={[-15, -10, -280]} 
        title="EVENT HORIZON" 
        subtitle="RELATIVISTIC DISTORTION CRITICAL"
        size={4}
      />

      {/* The Central Black Hole */}
      <BlackHole position={[0, 0, -420]} scale={35} />
      
      {/* Backlight behind the black hole for silhouette contrast */}
      <pointLight position={[0, 0, -450]} intensity={300} color="#ff8844" distance={200} />

    </group>
  );
}
