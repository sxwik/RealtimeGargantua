import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function AudioController() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillator1Ref = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  
  const initialized = useRef(false);

  useEffect(() => {
    const initAudio = () => {
      if (initialized.current) return;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Master Gain
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.08; // Base cinematic roar
      gainNodeRef.current = gainNode;

      // Lowpass Filter for that deep muffled bass feeling
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400; // Open a bit for the accretion disk roar
      filter.Q.value = 1;
      filterRef.current = filter;

      // Drone 1 - Deep sub-bass
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 40; 
      oscillator1Ref.current = osc1;

      // Drone 2 - Slight detune for beating effect
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 42; 
      oscillator2Ref.current = osc2;

      // Routing
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      initialized.current = true;
    };

    // Auto-init on first interaction
    const handleInteraction = () => {
      initAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('wheel', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('pointerdown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      
      if (oscillator1Ref.current) oscillator1Ref.current.stop();
      if (oscillator2Ref.current) oscillator2Ref.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  useFrame((state) => {
    if (!initialized.current || !filterRef.current || !gainNodeRef.current || !oscillator1Ref.current) return;
    
    // Simulate low frequency oscillation based on time to give it a "breathing" roar
    const t = state.clock.getElapsedTime();
    
    // Pulse the filter slowly
    filterRef.current.frequency.setTargetAtTime(
      300 + Math.sin(t * 0.5) * 100, 
      audioCtxRef.current!.currentTime,
      0.1
    );

    // Dynamic volume pulsing
    const targetGain = 0.06 + Math.sin(t * 0.2) * 0.02;
    gainNodeRef.current.gain.setTargetAtTime(
      targetGain,
      audioCtxRef.current!.currentTime,
      0.5
    );
  });

  return null;
}
