import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const dustVertexShader = `
uniform float time;
attribute float randomId;
attribute float size;

varying float vAlpha;
varying vec3 vColor;

void main() {
    float r = length(position);
    float angle = atan(position.z, position.x);
    
    // Speed based on distance (Keplerian)
    float speed = 15.0 / (sqrt(r) + 0.1);
    float currentAngle = angle - time * speed * 0.05;
    
    // Inward fall (spiraling)
    float fallSpeed = 5.0 / (r * 0.1 + 1.0);
    float currentR = r - time * fallSpeed;
    
    float maxR = 250.0;
    currentR = mod(currentR, maxR);
    if (currentR < 2.0) {
        currentR += maxR; 
    }
    
    // Disk flattening: closer to black hole = flatter
    float diskFlattening = smoothstep(maxR * 0.8, 4.0, currentR);
    float currentY = mix(position.y, position.y * 0.05, diskFlattening);
    
    // Turbulence
    float turb = sin(time * 0.2 + randomId * 100.0) * min(currentR * 0.01, 2.0);
    
    vec3 currentPos = vec3(
        currentR * cos(currentAngle),
        currentY + turb,
        currentR * sin(currentAngle)
    );
    
    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 6.0); // Prevent blocky artifacting
    
    // Fade out based on distance to center to avoid clipping into event horizon safely
    float centerFade = smoothstep(2.0, 8.0, currentR);
    float outerFade = smoothstep(maxR, maxR * 0.5, currentR);
    vAlpha = centerFade * outerFade * 0.5;
    
    vec3 fastColor = vec3(1.0, 0.8, 0.6);
    vec3 slowColor = vec3(0.5, 0.2, 0.1);
    vColor = mix(slowColor, fastColor, smoothstep(50.0, 5.0, currentR));
}
`;

const dustFragmentShader = `
varying float vAlpha;
varying vec3 vColor;

void main() {
    float dist = length(gl_PointCoord.xy - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = pow(1.0 - (dist * 2.0), 2.0) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
}
`;

export const CosmicDust = ({ count = 6000 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, sizes, randomIds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ids = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        // Distribute somewhat parametrically to fill space
        const r = 5 + Math.pow(Math.random(), 2.0) * 240; 
        const theta = Math.random() * Math.PI * 2;
        
        // Voluminous but slightly flattening towards equator
        const ySpread = (Math.random() - 0.5) * 2.0 * (r * 0.4); 
        
        pos[i * 3] = r * Math.cos(theta);
        pos[i * 3 + 1] = ySpread;
        pos[i * 3 + 2] = r * Math.sin(theta);
        
        // Smaller sizes for more realistic dust speckle
        sz[i] = Math.random() * 0.8 + 0.2;
        if (Math.random() > 0.95) sz[i] *= 2.5; // Occasional larger speck
        
        ids[i] = Math.random();
    }
    return [pos, sz, ids];
  }, [count]);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
        shaderRef.current.uniforms.time.value = clock.getElapsedTime() * 0.5; // Global slowdown for cinematic feel
    }
  });

  return (
    <points ref={pointsRef}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
            <bufferAttribute attach="attributes-randomId" count={count} array={randomIds} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial 
            ref={shaderRef}
            vertexShader={dustVertexShader}
            fragmentShader={dustFragmentShader}
            uniforms={{ time: { value: 0 } }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
        />
    </points>
  )
}
