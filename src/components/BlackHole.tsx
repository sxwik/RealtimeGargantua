import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform vec3 cameraPos;
uniform float time;
varying vec3 vWorldPosition;

// --- Simplex Noise 3D ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

float fbm_high(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 6; ++i) { // 6 octaves for extreme detail
        v += a * snoise(x);
        x = x * 2.2 + shift;
        a *= 0.5;
    }
    return v;
}

float fbm3(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

float hash12(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 getBackground(vec3 dir) {
    // Continuous noise for galaxy backdrop (avoids grid aliasing when lensed)
    float gasParams = fbm3(dir * 3.0);
    
    // Stars
    float starfield = snoise(dir * 150.0) * snoise(dir * 250.0);
    float star = pow(max(0.0, starfield), 10.0) * 20.0;
    vec3 starColor = vec3(0.8, 0.9, 1.0) * star;
    
    // Galactic Gas / Nebula
    float gas = fbm3(dir * 4.0 + gasParams) * 0.5 + 0.5;
    gas = pow(gas, 1.5); // Increase contrast
    // Focus gas near the galactic equator
    gas *= smoothstep(0.8, 0.0, abs(dir.y + snoise(dir * 2.0) * 0.2)); 
    
    vec3 gasColor = vec3(0.01, 0.04, 0.08) * gas * 1.5;
    vec3 deepGlow = vec3(0.05, 0.01, 0.08) * abs(gasParams);
    
    return starColor + gasColor + deepGlow;
}

vec2 intersectSphere(vec3 ro, vec3 rd, float rad) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - rad * rad;
    float h = b * b - c;
    if(h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

void main() {
    vec3 ro = cameraPos;
    vec3 rd = normalize(vWorldPosition - cameraPos);
    
    // Physics constants
    float EH = 1.0;           // Event horizon radius
    float GM = 0.8;           // Gravitational lensing strength
    float innerR = 2.6;       // Inner edge of accretion disk
    float outerR = 15.0;      // Outer edge of accretion disk
    float thickness = 0.1;    // Disk thickness
    
    float boundR = outerR + 1.0;
    vec2 iSphere = intersectSphere(ro, rd, boundR);
    
    vec3 p = ro;
    vec3 v = rd;
    
    vec3 color = vec3(0.0);
    float alpha = 0.0;
    bool hitBH = false;
    
    if(iSphere.y > 0.0) {
        float dither = hash12(gl_FragCoord.xy) * 0.15;
        if(iSphere.x > 0.0) {
            p += v * (iSphere.x + dither);
        } else {
            p += v * dither;
        }
        
        float dt = 0.015; // Extremely fine initial step
        
        for(int i=0; i<600; i++) { // Massive step count for GPU stress
            float r = length(p);
            
            if(r < EH) {
                hitBH = true;
                break;
            }
            
            if(r > boundR + 1.0 && dot(p, v) > 0.0) {
                break;
            }
            
            vec3 a = -p * (GM / (r * r * r));
            v += a * dt;
            v = normalize(v);
            
            p += v * dt;
            
            if(abs(p.y) < thickness && r > innerR && r < outerR) {
                float pr = length(p.xz);
                float edgeFade = smoothstep(innerR, innerR + 1.2, pr) * smoothstep(outerR, outerR - 4.0, pr);
                edgeFade += smoothstep(innerR + 0.4, innerR, pr) * 2.0; 
                
                float angle = atan(p.z, p.x);
                float speed = 2.0 / sqrt(pr);
                float spiral = angle - time * speed * 0.8;
                
                float warpParams = fbm_high(vec3(pr * 0.5, spiral * 1.5, time * 0.1));
                float prWarped = pr + warpParams * 1.5; 
                float spiralWarped = spiral + warpParams * 0.7;
                
                float blobNoise = fbm_high(vec3(prWarped * 1.5, spiralWarped * 3.5, time * 0.2)) * 0.5 + 0.5;
                float fineNoise = fbm_high(vec3(prWarped * 6.0, spiralWarped * 10.0, time * 0.3)) * 0.5 + 0.5;
                
                float ridge = 1.0 - abs(snoise(vec3(prWarped * 1.8, spiralWarped * 2.5, time * 0.15)));
                ridge = pow(max(0.0, ridge), 1.2);
                
                float localDensity = (blobNoise * 0.5 + fineNoise * 0.4 + 0.1) * edgeFade * 0.7;
                
                float dustCarve = smoothstep(0.05, 0.85, fineNoise * (1.0 - ridge * 0.9));
                localDensity *= mix(1.0, 0.02, dustCarve);
                
                if (pr < innerR + 1.5) {
                    float hotspot = smoothstep(innerR + 1.5, innerR, pr);
                    float furiousPlasma = fbm_high(vec3(spiralWarped * 12.0, prWarped * 12.0, time * 2.0)) * 0.5 + 0.5;
                    localDensity += hotspot * furiousPlasma * 0.8;
                }
                
                localDensity *= smoothstep(thickness, thickness * 0.05, abs(p.y));
                
                vec3 diskVel = normalize(vec3(-p.z, 0.0, p.x)) * speed;
                float doppler = dot(v, diskVel);
                float dopplerFactor = pow(max(0.0, 1.0 + doppler * 0.85), 3.0);
                
                vec3 hot = vec3(1.0, 0.98, 0.9) * 8.0;
                vec3 mid = vec3(1.0, 0.3, 0.02) * 2.2;
                vec3 cold = vec3(0.05, 0.005, 0.0);
                
                float tColor = clamp((pr - innerR) / (outerR - innerR), 0.0, 1.0);
                vec3 diskColor = mix(hot, mid, smoothstep(0.0, 0.25, tColor));
                diskColor = mix(diskColor, cold, smoothstep(0.25, 1.0, tColor));
                
                vec3 stepColor = diskColor * localDensity * dopplerFactor;
                
                color += stepColor * (1.0 - alpha);
                alpha += localDensity * (1.0 - alpha);
                
                if(alpha > 0.99) break;
            }
            
            // Ultra-fine dynamic step size for extreme precision
            dt = max(0.005, min(0.15, r * 0.02));
        }
    }
    
    if(hitBH && alpha < 0.1) {
        color = mix(color, vec3(0.0), 1.0 - alpha);
        alpha = 1.0;
    } else if (alpha < 0.99) {
        vec3 bgColor = getBackground(v);
        color += bgColor * (1.0 - alpha);
        alpha = 1.0;
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

export const BlackHole: React.FC<any> = (props) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = clock.getElapsedTime() * 0.5;
      shaderRef.current.uniforms.cameraPos.value.copy(camera.position);
    }
  });

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      cameraPos: { value: new THREE.Vector3() },
    }),
    []
  );

  return (
    <mesh {...props}>
      <sphereGeometry args={[400, 32, 32]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
};
