# GARGANTUA

> A real-time Interstellar black hole renderer. Runs in your browser. No libraries. Pure WebGL2.

![WebGL2](https://img.shields.io/badge/WebGL2-Raymarching-orange?style=flat-square)
![GPU](https://img.shields.io/badge/GPU-Required-red?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## what is this

A scientifically-inspired, visually cinematic black hole simulation built entirely in WebGL2 fragment shaders — no Three.js, no external libraries, no pre-baked textures. Every pixel is computed in real time on your GPU.

Inspired by the visual effects of **Gargantua** from Christopher Nolan's *Interstellar* (2014), which was itself based on real astrophysics research by Kip Thorne.

---

## features

- **Gravitational lensing** — rays bend around the singularity using Schwarzschild metric approximation, causing the back of the accretion disk to appear above the shadow as a ghost arc
- **Relativistic Doppler beaming** — the approaching side of the disk is boosted 3-4x brighter using `pow((1 + β·cos φ) / √(1−β²), 4)`
- **Blackbody temperature gradient** — disk color mapped from 50,000K blue-white at the inner edge to 1,500K deep ember-red at the outer edge
- **Turbulent gas bands** — animated domain-warped FBM noise simulating plasma instability in the disk
- **Photon sphere** — razor-thin overbright ring at 1.5 Schwarzschild radii, the last stable photon orbit
- **2-pass HDR bloom** — gaussian blur post-processing on overbright regions only, preserving disk detail
- **ACES filmic tonemapping** — the same tone curve used in film production pipelines
- **300-step symplectic ray integration** — high precision null geodesic tracing around the event horizon
- **Star field with lensing** — 3000+ background stars that bend in arcs around the gravitational field
- **Full camera controls** — orbit, pan, zoom like Blender

---

## controls

| Input | Action |
|-------|--------|
| Left click + drag | Orbit around black hole |
| Right click + drag | Pan camera |
| Scroll wheel | Zoom in / out |

---

## technical details

```
Renderer      WebGL2 fragment shader (GLSL ES 3.0)
Ray steps     300 (symplectic Euler integration)
Post FX       2-pass gaussian bloom, ACES tonemap, film grain
Stars         3000+ procedural via hash functions
Disk model    Flat plane intersection with Schwarzschild lensing
Doppler       Relativistic beaming at β = 0.3c
No deps       Zero external libraries or CDN
```

---

## the physics (simplified)

Light near a black hole doesn't travel in straight lines. The curvature of spacetime bends every ray toward the singularity. This shader approximates those bent paths by numerically integrating the geodesic equations at each step.

The most striking visual consequence: light from the back of the accretion disk — which would normally be hidden — curves over the top of the black hole's shadow and reaches the observer. This creates the iconic bright arc you see above the shadow. It's not an artistic choice. It's just physics.

---

## running it

No build step. No npm install. Just open `index.html` in a browser with WebGL2 support.

```bash
git clone https://github.com/yourusername/gargantua
cd gargantua
# open index.html in Chrome / Firefox / Edge
```

> Recommended: Chrome on a dedicated GPU. The shader is intentionally heavy.

---

## performance

| GPU tier | Expected FPS |
|----------|-------------|
| RTX 3080+ | 60 fps |
| RTX 2060 / RX 6700 | 30-60 fps |
| Integrated graphics | not recommended |

---

## reference

- Kip Thorne — *The Science of Interstellar* (2014)
- James, et al. — *Gravitational lensing by spinning black holes in astrophysics* (2015), used by the Interstellar VFX team
- [Shadertoy — black hole lensing techniques](https://shadertoy.com)

---

## license

MIT — do whatever you want with it.

---

*Built in a browser. Powered by a GPU. Inspired by a dying star.*
