import React, { Suspense, Component, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Preload } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, DepthOfField, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { BlackHole } from './components/BlackHole';
import { CosmicDust } from './components/CosmicDust';
import * as THREE from 'three';

class ErrorBoundary extends Component<any, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 20, whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: 'black', height: '100vh', width: '100vw' }}>
        <h2>Core System Failure</h2>
        <p>{this.state.error?.toString()}</p>
        <p>{this.state.error?.stack}</p>
      </div>;
    }
    return this.props.children;
  }
}

const TelemetryHUD = () => {
  const [frame, setFrame] = useState(0);
  
  useEffect(() => {
    let animationFrame: number;
    const updateTelemtry = () => {
      setFrame(prev => prev + 1);
      animationFrame = requestAnimationFrame(updateTelemtry);
    };
    animationFrame = requestAnimationFrame(updateTelemtry);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 text-neutral-400 font-mono text-xs uppercase tracking-widest select-none">
      {/* Top telemetry */}
      <div className="flex justify-between items-start opacity-70">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 animate-pulse" />
            <span className="text-white">OBSERVATION MATRIX_ACTIVE</span>
          </div>
          <div>FRAME_INTEGRATION: {(frame % 1000).toString().padStart(4, '0')}</div>
          <div>LENSING_MAGNITUDE: GRAV_EXTREME</div>
        </div>
        <div className="text-right flex flex-col gap-2">
          <div>DATA_STREAM: {Math.random().toFixed(4)} TB/s</div>
          <div>THERMAL_PEAK: {(4000 + Math.sin(frame * 0.1) * 200).toFixed(0)} K</div>
          <div className="text-amber-500 font-bold">WARNING: HIGH X-RAY EMISSION</div>
        </div>
      </div>

      {/* Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 flex items-center justify-center">
        <div className="w-[1px] h-[400px] bg-neutral-600" />
        <div className="h-[1px] w-[400px] bg-neutral-600 absolute" />
        <div className="w-[200px] h-[200px] border border-neutral-600 rounded-full absolute" />
        <div className="w-[100px] h-[100px] border border-dashed border-neutral-600 rounded-full absolute animate-[spin_60s_linear_infinite]" />
      </div>

      {/* Bottom telemetry */}
      <div className="flex justify-between items-end opacity-70">
        <div className="flex flex-col gap-1 w-64">
          <div className="flex justify-between"><span>MASS</span> <span>4.31M M☉</span></div>
          <div className="flex justify-between"><span>SPIN</span> <span>0.98a</span></div>
          <div className="flex justify-between"><span>HORIZON</span> <span>2.6 R_s</span></div>
          <div className="w-full h-[2px] bg-neutral-800 mt-2">
            <div className="h-full bg-white opacity-80" style={{ width: `${(Math.sin(frame * 0.05) * 0.5 + 0.5) * 100}%` }} />
          </div>
        </div>
        <div className="text-right">
          <div className="tracking-[0.5em] opacity-50 mb-2">SYSTEM_09::VOID</div>
          <div className="text-3xl font-light tracking-tight text-white mix-blend-overlay opacity-80">
            SAGITTARIUS A*
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="relative bg-[#000000] overflow-hidden font-sans text-white w-full h-screen">
        <TelemetryHUD />
        
        <div className="absolute inset-0 z-0">
          <ErrorBoundary>
            <Canvas camera={{ position: [0, 2, 25], fov: 40, near: 0.1, far: 500 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
              <color attach="background" args={['#000000']} />
              
              <Suspense fallback={null}>
                {/* The Central Black Hole Raymarcher */}
                <BlackHole />
                
                {/* Foreground / Background Dynamic Cosmic Dust */}
                <CosmicDust count={3000} />
                
                <OrbitControls 
                  makeDefault
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  enableDamping={true}
                  dampingFactor={0.01} // Heavy cinematic inertia
                  rotateSpeed={0.3} // Heavier, more deliberate rotation
                  zoomSpeed={0.3} // Smoother dolly zoom
                  panSpeed={0.3} // Weighty panning
                  minDistance={4}
                  maxDistance={120}
                  autoRotate={true}
                  autoRotateSpeed={0.05} // Extremely slow cinematic drift
                  mouseButtons={{
                    LEFT: THREE.MOUSE.NONE, // Disable left click for camera, maybe used for selection later
                    MIDDLE: THREE.MOUSE.ROTATE,
                    RIGHT: THREE.MOUSE.PAN
                  }}
                />
                
                <EffectComposer multisampling={0} disableNormalPass>
                  <DepthOfField 
                    focusDistance={0.05} 
                    focalLength={0.1} 
                    bokehScale={3.0} 
                    height={480} 
                  />
                  <Bloom 
                    intensity={0.4} 
                    luminanceThreshold={0.5} 
                    luminanceSmoothing={0.9} 
                    mipmapBlur 
                  />
                  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                  <ChromaticAberration
                    blendFunction={BlendFunction.NORMAL}
                    offset={new THREE.Vector2(0.004, 0.004)}
                    radialModulation={true}
                    modulationOffset={0.6}
                  />
                  <Noise
                    premultiply
                    blendFunction={BlendFunction.ADD}
                    opacity={0.25}
                  />
                  <Vignette
                    eskil={false}
                    offset={0.4}
                    darkness={1.2}
                    blendFunction={BlendFunction.NORMAL}
                  />
                </EffectComposer>
                <Preload all />
              </Suspense>
            </Canvas>
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}
