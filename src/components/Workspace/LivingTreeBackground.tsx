/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Cinematic Living Particle Tree Background
 * 
 * Photorealistic, mature celestial tree suspended in pure darkness:
 * - Post-login organic entrance reveal (2.8s fade-in & stardust assembly from blackness)
 * - Grounded trunk firmly anchored to the bottom edge of the viewport with natural spreading roots
 * - Natural botanical branching hierarchy: tapered solid trunk, thick primary limbs, secondary branches, fine twigs
 * - Eliminated twisted ropes/braids; replaced with realistic mature tree anatomy and dark negative space
 * - Broad, rounded, full canopy with fine outer foliage particles
 * - Warm directional cinematic lighting: cool silver-white on left/outer canopy, rich muted gold (#D6A45B),
 *   amber (#C88A3D), and pale gold (#F4D7A0) on right side and inner illuminated branches
 * - Subtle living wind sway, starlight shimmer, and sparse falling leaves
 * - Smooth 360-degree interactive camera orbit with gentle damping
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Deterministic PRNG for reproducible botanical tree structure
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Vertex shader with organic assembly, hierarchical wind physics, and distance attenuation
const treeVertexShader = `
  uniform float uTime;
  uniform vec2 uWind;
  uniform float uWindStrength;
  uniform float uDpr;
  uniform float uEntranceProgress;

  attribute float aFlexibility;
  attribute float aPhase;
  attribute float aSize;
  attribute vec3 aColor;
  attribute vec3 aScatter;
  attribute float aGoldWeight;

  varying vec3 vColor;
  varying float vPhase;
  varying float vFlexibility;
  varying float vGoldWeight;
  varying float vDistAlpha;

  void main() {
    vColor = aColor;
    vPhase = aPhase;
    vFlexibility = aFlexibility;
    vGoldWeight = aGoldWeight;

    vec3 pos = position;

    // 1. Post-Login Stardust Assembly
    // Particles start with faint organic dispersion and smoothly coalesce into the tree structure
    float assembleT = clamp((uEntranceProgress - aFlexibility * 0.35) / 0.65, 0.0, 1.0);
    float smoothAssemble = smoothstep(0.0, 1.0, assembleT);
    vec3 scatterOffset = aScatter * pow(1.0 - smoothAssemble, 1.8) * 2.2;
    pos += scatterOffset;

    // 2. Natural Hierarchical Wind Sway
    // Grounded trunk base (y < -3.5) remains completely anchored
    float heightFactor = clamp((pos.y + 4.9) / 9.5, 0.0, 1.0);
    float trunkSway = pow(heightFactor, 2.6) * 0.045 * sin(uTime * 0.45 + pos.y * 0.18);

    // Branch and canopy sway with natural multi-frequency oscillation
    float branchSwayX = sin(uTime * 0.95 + aPhase * 2.8 + pos.y * 0.48 + pos.z * 0.22) * 0.10 * aFlexibility;
    float branchSwayZ = cos(uTime * 0.78 + aPhase * 2.5 + pos.x * 0.38 + pos.y * 0.28) * 0.08 * aFlexibility;

    // Independent leaf flutter via 3D spatial coordinate noise
    float leafNoise = sin(pos.x * 4.2 + pos.y * 2.8 + pos.z * 4.5 + aPhase * 6.28);
    float localFlutterX = sin(uTime * (2.2 + aPhase * 1.4) + leafNoise * 3.14) * 0.032 * pow(aFlexibility, 1.35);
    float localFlutterY = cos(uTime * (1.9 + aPhase * 1.6) + leafNoise * 2.4) * 0.022 * pow(aFlexibility, 1.35);
    float localFlutterZ = sin(uTime * (2.4 + aPhase * 1.3) + leafNoise * 3.4) * 0.028 * pow(aFlexibility, 1.35);

    pos.x += (uWind.x * trunkSway + branchSwayX + localFlutterX) * uWindStrength;
    pos.z += (uWind.y * trunkSway + branchSwayZ + localFlutterZ) * uWindStrength;
    pos.y += (localFlutterY + sin(uTime * 1.1 + aPhase * 3.4) * 0.014 * aFlexibility) * uWindStrength;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Crisp starlight particle point sizing
    float pSize = aSize * uDpr * (17.5 / -mvPosition.z) * (0.6 + 0.4 * smoothAssemble);
    gl_PointSize = clamp(pSize, 0.8, 36.0);

    // Distance attenuation
    vDistAlpha = clamp((-mvPosition.z - 2.0) / 28.0, 0.45, 1.0) * smoothAssemble;
  }
`;

// Fragment shader for soft starlight, gradual golden illumination, and deep black contrast
const treeFragmentShader = `
  uniform float uTime;
  uniform float uEntranceProgress;
  uniform float uGoldIntensity;

  varying vec3 vColor;
  varying float vPhase;
  varying float vFlexibility;
  varying float vGoldWeight;
  varying float vDistAlpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft gaussian-style starlight core & halo
    float glow = smoothstep(0.5, 0.035, dist);
    float core = smoothstep(0.18, 0.0, dist) * 0.45;

    // Gentle shimmer (subtle, slow, organic)
    float twinkle = 0.88 + 0.12 * sin(uTime * 1.8 + vPhase * 6.28318);
    twinkle += 0.05 * vFlexibility * sin(uTime * 3.2 + vPhase * 10.5);

    // Blend in the rich golden and amber illumination as the tree awakens
    // Silver-white baseline is present early; warm gold swells smoothly
    vec3 baseCol = vColor;
    float goldBoost = (1.0 + 0.25 * uGoldIntensity) * (1.0 + 0.22 * vGoldWeight * sin(uTime * 1.4 + vPhase * 6.28));
    vec3 finalColor = baseCol * (1.0 + core * 0.35) * goldBoost;

    // Overall entrance opacity curve (2.5 - 3.0s smooth awakening from blackness)
    float entranceAlpha = smoothstep(0.05, 0.95, uEntranceProgress);
    float finalAlpha = (glow * 0.84 + core * 0.28) * twinkle * vDistAlpha * entranceAlpha;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

// Falling Leaves Shaders
const leafVertexShader = `
  uniform float uDpr;
  uniform float uEntranceProgress;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha * smoothstep(0.6, 1.0, uEntranceProgress);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float pSize = aSize * uDpr * (18.0 / -mvPosition.z);
    gl_PointSize = clamp(pSize, 1.5, 28.0);
  }
`;

const leafFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    float shape = smoothstep(0.5, 0.06, dist);
    float core = smoothstep(0.2, 0.0, dist) * 0.35;

    gl_FragColor = vec4(vColor * (1.0 + core * 0.25), (shape * 0.82 + core) * vAlpha);
  }
`;

interface LeafParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  phase: number;
  flutterFreq: number;
  flutterRadius: number;
}

export const LivingTreeBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Hardware & Performance Detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Density balanced for silky 60fps across devices
    const structuralParticleTarget = isSoftwareGl || isMobile ? 48000 : 96000;
    const fallingLeafCount = isSoftwareGl || isMobile ? 40 : 80; // Sparse and elegant falling leaves
    const dustMoteCount = isSoftwareGl || isMobile ? 50 : 100;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 2. Scene & Perspective Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);

    // Calculate camera position so the root base (-4.95) aligns directly with the bottom edge of the viewport
    const updateCameraFraming = (aspect: number) => {
      // In PerspectiveCamera: visible half-height at z = 0 is tan(fov / 2) * cameraZ
      const fovRad = (44 * Math.PI) / 360; // 22 degrees
      const tanHalfFov = Math.tan(fovRad); // ~0.404

      // On desktop, distance ~13.8 gives visible height ~11.15.
      // With camera Y = 0.55, the bottom of the viewport at z = 0 is 0.55 - (13.8 * 0.404) = -5.02.
      // This grounds the roots at -4.95 perfectly against the bottom edge of the screen!
      let camZ = 13.8;
      let camY = 0.55;

      if (aspect < 1.0) {
        // Narrow portrait mobile screens: move camera back and adjust Y so canopy stays within bounds
        camZ = 13.8 / Math.max(0.60, aspect * 0.88);
        camY = 0.45;
      } else if (aspect < 1.4) {
        camZ = 14.6;
        camY = 0.50;
      }

      camera.position.set(0, camY, camZ);
      camera.lookAt(0, 0.50, 0);
    };

    updateCameraFraming(width / height);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls (Full 360-degree Interactive Navigation)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.052;
    controls.target.set(0, 0.50, 0);
    controls.enablePan = false;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.72;
    controls.minDistance = 7.2;
    controls.maxDistance = 22.0;
    controls.minPolarAngle = 0.15; // ~8.5° from overhead
    controls.maxPolarAngle = Math.PI / 2 + 0.08; // Anchored floor limit
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    let isOrbiting = false;
    controls.addEventListener('start', () => {
      isOrbiting = true;
      if (container) container.style.cursor = 'grabbing';
    });
    controls.addEventListener('end', () => {
      isOrbiting = false;
      if (container) container.style.cursor = 'grab';
    });

    // 5. Seeded Botanical Procedural Architecture
    const rng = createPRNG(7821943);

    // Warm, Cinematic Palette (from reference image):
    // Cool/neutral silver-white foundation
    const softIvoryWhite = new THREE.Color(0xF5F7FA);
    const champagneSilver = new THREE.Color(0xE4EAF0);
    const coolSilver = new THREE.Color(0xD4DEE8);
    const dimSilver = new THREE.Color(0x9AA8B6);

    // Rich muted gold & amber highlights
    const richMutedGold = new THREE.Color(0xD6A45B); // Primary warm gold
    const warmAmber = new THREE.Color(0xC88A3D);     // Deep amber accents
    const softPaleGold = new THREE.Color(0xF4D7A0);  // Delicate pale gold
    const warmIvory = new THREE.Color(0xFFF6E8);     // Warm starlight glint

    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const flexibilities: number[] = [];
    const phases: number[] = [];
    const scatters: number[] = [];
    const goldWeights: number[] = [];

    const canopySpawnPoints: THREE.Vector3[] = [];

    const addParticle = (
      pos: THREE.Vector3,
      col: THREE.Color,
      size: number,
      flex: number,
      phase: number,
      goldWeight = 0.0
    ) => {
      positions.push(pos.x, pos.y, pos.z);
      colors.push(col.r, col.g, col.b);
      sizes.push(size);
      flexibilities.push(flex);
      phases.push(phase);
      goldWeights.push(goldWeight);

      // Random dispersion vector for the post-login stardust assembly
      const sRadius = 0.8 + rng() * 2.0;
      const sTheta = rng() * Math.PI * 2;
      const sPhi = rng() * Math.PI;
      scatters.push(
        sRadius * Math.sin(sPhi) * Math.cos(sTheta),
        sRadius * Math.sin(sPhi) * Math.sin(sTheta) * 0.7,
        sRadius * Math.cos(sPhi)
      );
    };

    // A. Anchor Roots directly to the Viewport Bottom Edge (y = -4.95)
    // 16 natural buttress roots creeping across the ground plane
    const rootCount = 16;
    for (let r = 0; r < rootCount; r++) {
      const angle = (r / rootCount) * Math.PI * 2 + (rng() - 0.5) * 0.22;
      const rootLength = 2.4 + rng() * 2.2;
      const rootSteps = 30;

      for (let s = 0; s < rootSteps; s++) {
        const segFrac = s / rootSteps;
        const spreadR = Math.sin(segFrac * Math.PI * 0.5) * rootLength;
        const taper = 1.0 - segFrac;

        // Curve root along ground from -4.1 down to -4.95 at viewport bottom
        const rx = Math.cos(angle) * (0.85 + spreadR) + (rng() - 0.5) * 0.12;
        const ry = -4.1 - Math.sin(segFrac * Math.PI * 0.5) * 0.85 + (rng() - 0.5) * 0.05;
        const rz = Math.sin(angle) * (0.85 + spreadR) + (rng() - 0.5) * 0.12;

        const count = Math.floor(20 * taper) + 4;
        for (let p = 0; p < count; p++) {
          const jitterR = (0.22 * taper + 0.03) * rng();
          const jTheta = rng() * Math.PI * 2;
          const px = rx + Math.cos(jTheta) * jitterR;
          const py = ry + (rng() - 0.5) * 0.04;
          const pz = rz + Math.sin(jTheta) * jitterR;

          // Lighting distribution: right side gets warm gold/amber, left side gets silver/dim bronze
          const isRightSide = px > 0.1;
          const pick = rng();
          let c = champagneSilver;
          let gWeight = 0.0;

          if (isRightSide && pick < 0.28) {
            c = pick < 0.12 ? warmAmber : richMutedGold;
            gWeight = 1.0;
          } else if (pick < 0.20) {
            c = softPaleGold;
            gWeight = 0.6;
          } else if (pick < 0.65) {
            c = softIvoryWhite;
          } else {
            c = dimSilver;
          }

          addParticle(new THREE.Vector3(px, py, pz), c, 1.0 + rng() * 1.3, 0.02, rng(), gWeight);
        }
      }
    }

    // Subtle ground stardust particles extending along the base
    const baseDustCount = 650;
    for (let i = 0; i < baseDustCount; i++) {
      const dist = 0.8 + Math.pow(rng(), 0.7) * 4.4;
      const theta = rng() * Math.PI * 2;
      const fx = Math.cos(theta) * dist;
      const fz = Math.sin(theta) * dist;
      const fy = -4.95 + (rng() - 0.5) * 0.12;

      const isRightSide = fx > 0.0;
      const pick = rng();
      const c = isRightSide && pick < 0.22 ? softPaleGold : dimSilver.clone().multiplyScalar(0.4);
      addParticle(new THREE.Vector3(fx, fy, fz), c, 0.85 + rng() * 0.9, 0.01, rng(), isRightSide ? 0.5 : 0.0);
    }

    // B. Substantial, Naturally Tapered Solid Trunk (NO twisted ropes or braids)
    // Realistic mature tree trunk with gentle curvature and organic bark fissures
    const trunkHeight = 4.2;
    const trunkLayers = 220;

    for (let l = 0; l < trunkLayers; l++) {
      const frac = l / trunkLayers;
      const y = -4.2 + frac * trunkHeight;

      // Realistic botanical tapering: flared base collar (1.25) tapering to (0.52) at bifurcation
      const baseRadius = 0.68 * (1.0 - frac * 0.38) + Math.pow(1.0 - frac, 2.0) * 0.52;

      // Gentle natural tree bend (organic S-curve, max 0.14 units, NOT a spiral)
      const centerOffsetX = Math.sin(frac * 1.6) * 0.12;
      const centerOffsetZ = Math.cos(frac * 1.4) * 0.08;

      // Dense solid volume of particles (both surface and core)
      const ringCount = Math.floor(58 * (1.0 - frac * 0.22));
      for (let p = 0; p < ringCount; p++) {
        const theta = (p / ringCount) * Math.PI * 2;

        // Subtle longitudinal bark texture grooves (NOT twisting coils)
        const barkGroove = 1.0 + 0.08 * Math.sin(theta * 6.0) + 0.04 * Math.sin(theta * 12.0);
        // Vary radius from core (0.2) to bark surface (1.0) for solid volume
        const radialFrac = 0.25 + 0.75 * Math.pow(rng(), 0.65);
        const r = baseRadius * barkGroove * radialFrac;

        const px = centerOffsetX + Math.cos(theta) * r;
        const py = y + (rng() - 0.5) * 0.035;
        const pz = centerOffsetZ + Math.sin(theta) * r;

        // Directional Cinematic Lighting:
        // Right side (px > 0) receives warm gold & amber illumination.
        // Left side (px < 0) stays cool silver-white.
        // Select inner fissures carry glowing golden sap veins.
        const isRightLit = px > -0.05 && Math.cos(theta) > -0.2;
        const isInnerGlow = Math.sin(theta * 4.0 + y * 2.0) > 0.65;
        const pick = rng();

        let c = softIvoryWhite;
        let gWeight = 0.0;

        if (isRightLit) {
          if (pick < 0.25) {
            c = richMutedGold;
            gWeight = 1.0;
          } else if (pick < 0.45) {
            c = softPaleGold;
            gWeight = 0.8;
          } else if (pick < 0.60) {
            c = warmIvory;
            gWeight = 0.5;
          } else {
            c = champagneSilver;
          }
        } else {
          if (isInnerGlow && pick < 0.20) {
            c = warmAmber;
            gWeight = 0.9;
          } else if (pick < 0.40) {
            c = softIvoryWhite;
          } else if (pick < 0.75) {
            c = champagneSilver;
          } else {
            c = coolSilver;
          }
        }

        const flex = 0.02 + frac * 0.10;
        addParticle(new THREE.Vector3(px, py, pz), c, 1.1 + rng() * 1.35, flex, rng(), gWeight);
      }
    }

    // C. Realistic Botanical Branching Hierarchy
    // Thick primary limbs gradually dividing into secondary branches and fine twigs
    interface BranchNode {
      start: THREE.Vector3;
      dir: THREE.Vector3;
      length: number;
      radius: number;
      depth: number;
      flexibility: number;
      warmLighting: boolean;
    }

    const branchQueue: BranchNode[] = [];

    // 1. Primary Limbs (4 Asymmetric Major Boughs)
    // Limb A: Right lower bough (rich warm gold light, sweeping out and up)
    branchQueue.push({
      start: new THREE.Vector3(0.18, -0.7, 0.05),
      dir: new THREE.Vector3(0.82, 0.45, 0.15).normalize(),
      length: 2.6,
      radius: 0.26,
      depth: 0,
      flexibility: 0.20,
      warmLighting: true,
    });

    // Limb B: Left major bough (cool silver-white, sweeping out left and arching)
    branchQueue.push({
      start: new THREE.Vector3(-0.16, -0.3, -0.05),
      dir: new THREE.Vector3(-0.80, 0.52, -0.10).normalize(),
      length: 2.7,
      radius: 0.27,
      depth: 0,
      flexibility: 0.20,
      warmLighting: false,
    });

    // Limb C: Central upward trunk continuation (splitting into crown apex)
    branchQueue.push({
      start: new THREE.Vector3(0.04, 0.0, 0.0),
      dir: new THREE.Vector3(0.15, 0.95, 0.12).normalize(),
      length: 2.8,
      radius: 0.28,
      depth: 0,
      flexibility: 0.22,
      warmLighting: true,
    });

    // Limb D: Rear-right scaffold bough (for rich 3D volumetric depth)
    branchQueue.push({
      start: new THREE.Vector3(0.08, -0.1, -0.12),
      dir: new THREE.Vector3(0.45, 0.75, -0.45).normalize(),
      length: 2.4,
      radius: 0.24,
      depth: 0,
      flexibility: 0.20,
      warmLighting: false,
    });

    // Helper: Add organic botanical leaf spray / cluster
    const addFoliageCluster = (
      center: THREE.Vector3,
      particleCount: number,
      radius: number,
      flexibility: number,
      isWarm: boolean
    ) => {
      if (canopySpawnPoints.length < 500) {
        canopySpawnPoints.push(center.clone());
      }

      for (let f = 0; f < particleCount; f++) {
        // Natural flattened ellipsoidal distribution
        const u = rng();
        const v = rng();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.pow(rng(), 0.62) * radius;

        const fx = center.x + r * Math.sin(phi) * Math.cos(theta);
        const fy = center.y + r * Math.sin(phi) * Math.sin(theta) * 0.62;
        const fz = center.z + r * Math.cos(phi);

        // Directional illumination:
        // Right side and designated warm boughs receive rich gold/amber
        // Left side and upper outer canopy stay soft ivory-white and cool silver
        const isRight = fx > -0.2 || isWarm;
        const pick = rng();

        let col = softIvoryWhite;
        let gWeight = 0.0;

        if (isRight) {
          if (pick < 0.26) {
            col = richMutedGold;
            gWeight = 1.0;
          } else if (pick < 0.44) {
            col = softPaleGold;
            gWeight = 0.8;
          } else if (pick < 0.58) {
            col = warmAmber;
            gWeight = 0.9;
          } else if (pick < 0.85) {
            col = softIvoryWhite;
          } else {
            col = warmIvory;
            gWeight = 0.4;
          }
        } else {
          if (pick < 0.08) {
            col = softPaleGold;
            gWeight = 0.5;
          } else if (pick < 0.48) {
            col = softIvoryWhite;
          } else if (pick < 0.78) {
            col = champagneSilver;
          } else {
            col = coolSilver;
          }
        }

        const size = 0.95 + rng() * 1.55;
        const flex = Math.min(1.0, flexibility + (r / radius) * 0.18);
        addParticle(new THREE.Vector3(fx, fy, fz), col, size, flex, rng(), gWeight);
      }
    };

    // Recursive Subdivision with Natural Botanical Branching
    const maxDepth = 4;
    while (branchQueue.length > 0) {
      const node = branchQueue.shift()!;
      const end = node.start.clone().add(node.dir.clone().multiplyScalar(node.length));

      // 1. Draw Branch Skeletal Particles with Natural Sag and Curvature
      const steps = Math.floor(node.length * 32);
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const currentCenter = node.start.clone().lerp(end, t);

        // Realistic catenary branch sag (droop under weight, then upward reach)
        const sag = Math.sin(t * Math.PI) * 0.07 * (1.0 - node.depth * 0.2);
        currentCenter.y -= sag;

        const currRadius = node.radius * (1.0 - t * 0.52);
        const count = Math.max(4, Math.floor(18 * (1.0 - t * 0.40) * (1.0 - node.depth * 0.16)));

        for (let p = 0; p < count; p++) {
          const theta = rng() * Math.PI * 2;
          const r = Math.pow(rng(), 0.55) * currRadius;
          const bx = currentCenter.x + Math.cos(theta) * r;
          const by = currentCenter.y + Math.sin(theta) * r;
          const bz = currentCenter.z + (rng() - 0.5) * currRadius * 0.7;

          const isRight = bx > -0.2 || node.warmLighting;
          const pick = rng();
          let c = softIvoryWhite;
          let gWeight = 0.0;

          if (isRight) {
            if (pick < 0.28) {
              c = richMutedGold;
              gWeight = 1.0;
            } else if (pick < 0.46) {
              c = softPaleGold;
              gWeight = 0.7;
            } else if (pick < 0.56) {
              c = warmAmber;
              gWeight = 0.9;
            } else {
              c = softIvoryWhite;
            }
          } else {
            if (pick < 0.08) {
              c = softPaleGold;
              gWeight = 0.4;
            } else if (pick < 0.55) {
              c = softIvoryWhite;
            } else {
              c = champagneSilver;
            }
          }

          const flex = node.flexibility + t * 0.14;
          addParticle(new THREE.Vector3(bx, by, bz), c, 1.05 + rng() * 1.3, flex, rng(), gWeight);
        }

        // 2. Intermediate Foliage Tufts along secondary and tertiary branches
        // Fills the canopy volume while preserving dark negative space between primary boughs
        if (node.depth >= 1 && s % 6 === 0 && rng() < 0.82) {
          const tuftCenter = currentCenter.clone();
          tuftCenter.x += (rng() - 0.5) * 0.40;
          tuftCenter.y += (rng() - 0.5) * 0.30;
          tuftCenter.z += (rng() - 0.5) * 0.40;
          addFoliageCluster(
            tuftCenter,
            30 + Math.floor(rng() * 26),
            0.85 + rng() * 0.42,
            node.flexibility + 0.22,
            node.warmLighting
          );
        }
      }

      // 3. Branch Subdivision (Natural Asymmetric Lateral Splitting)
      if (node.depth < maxDepth) {
        const subCount = node.depth === 0 ? 3 : (rng() < 0.65 ? 2 : 3);
        for (let c = 0; c < subCount; c++) {
          const spreadAngle = 0.42 + rng() * 0.38;
          const rotAngle = (c / subCount) * Math.PI * 2 + (rng() - 0.5) * 0.8;

          const up = Math.abs(node.dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
          const right = new THREE.Vector3().crossVectors(node.dir, up).normalize();
          const normal = new THREE.Vector3().crossVectors(node.dir, right).normalize();

          const newDir = node.dir.clone()
            .add(right.clone().multiplyScalar(Math.cos(rotAngle) * spreadAngle))
            .add(normal.clone().multiplyScalar(Math.sin(rotAngle) * spreadAngle))
            .normalize();

          // Natural phototropic upward arch
          newDir.y += 0.16 * (1.0 - node.depth * 0.22);
          newDir.normalize();

          branchQueue.push({
            start: end.clone(),
            dir: newDir,
            length: node.length * (0.72 + rng() * 0.15),
            radius: node.radius * 0.58,
            depth: node.depth + 1,
            flexibility: Math.min(0.92, node.flexibility + 0.16),
            warmLighting: node.warmLighting || (newDir.x > 0.1),
          });
        }
      } else {
        // Terminal twig: build rich foliage cloud pad around the branch tip
        const tipCount = Math.floor(85 + rng() * 55);
        const tipRadius = 1.25 + rng() * 0.55;
        addFoliageCluster(end, tipCount, tipRadius, 0.88, node.warmLighting);
      }
    }

    // D. 42 Asymmetric Foliage Volume Clouds (Broad, mature canopy with organic contours & skylight openings)
    const volumeLobeCount = 42;
    for (let v = 0; v < volumeLobeCount; v++) {
      const angle = (v / volumeLobeCount) * Math.PI * 2 + (rng() - 0.5) * 0.40;
      const height = 0.6 + rng() * 3.7; // From mid canopy to upper crown
      const asymmetry = 1.0 + 0.22 * Math.sin(angle * 2.0);
      const radiusDist = (1.2 + Math.sin((height - 0.6) / 3.7 * Math.PI) * (2.8 + rng() * 1.2)) * asymmetry;

      const lobeCenter = new THREE.Vector3(
        Math.cos(angle) * radiusDist + (rng() - 0.5) * 0.55,
        height + (rng() - 0.5) * 0.40,
        Math.sin(angle) * radiusDist + (rng() - 0.5) * 0.55
      );

      const lobeCount = Math.floor(110 + rng() * 80);
      const isWarm = lobeCenter.x > -0.2;
      addFoliageCluster(lobeCenter, lobeCount, 1.30 + rng() * 0.60, 0.86, isWarm);
    }

    // E. Atmospheric Edge Stardust Halo (Thousands of fine particles extending beyond branches)
    const haloCount = Math.floor(structuralParticleTarget * 0.10);
    for (let h = 0; h < haloCount; h++) {
      if (canopySpawnPoints.length === 0) break;
      const anchor = canopySpawnPoints[Math.floor(rng() * canopySpawnPoints.length)];

      const haloDist = 0.8 + rng() * 1.6;
      const theta = rng() * Math.PI * 2;
      const phi = rng() * Math.PI;

      const hx = anchor.x + haloDist * Math.sin(phi) * Math.cos(theta);
      const hy = anchor.y + haloDist * Math.sin(phi) * Math.sin(theta) * 0.65;
      const hz = anchor.z + haloDist * Math.cos(phi);

      const isRight = hx > -0.1;
      const pick = rng();
      let hCol = dimSilver;
      let gWeight = 0.0;

      if (isRight && pick < 0.25) {
        hCol = softPaleGold;
        gWeight = 0.6;
      } else if (pick < 0.45) {
        hCol = champagneSilver;
      }

      addParticle(new THREE.Vector3(hx, hy, hz), hCol, 0.75 + rng() * 0.8, 0.95, rng(), gWeight);
    }

    // Top-off to reach target density across the entire volume
    while (positions.length / 3 < structuralParticleTarget && canopySpawnPoints.length > 0) {
      const sourcePoint = canopySpawnPoints[Math.floor(rng() * canopySpawnPoints.length)];
      const r = rng() * 1.1;
      const theta = rng() * Math.PI * 2;
      const phi = rng() * Math.PI;

      const px = sourcePoint.x + r * Math.sin(phi) * Math.cos(theta);
      const py = sourcePoint.y + r * Math.sin(phi) * Math.sin(theta) * 0.70;
      const pz = sourcePoint.z + r * Math.cos(phi);

      const isRight = px > -0.1;
      const pick = rng();
      let c = softIvoryWhite;
      let gWeight = 0.0;

      if (isRight && pick < 0.30) {
        c = richMutedGold;
        gWeight = 1.0;
      } else if (pick < 0.50) {
        c = champagneSilver;
      }

      addParticle(new THREE.Vector3(px, py, pz), c, 0.95 + rng() * 1.5, 0.88, rng(), gWeight);
    }

    // Build Three.js BufferGeometry for tree
    const treeGeometry = new THREE.BufferGeometry();
    treeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    treeGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    treeGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    treeGeometry.setAttribute('aFlexibility', new THREE.Float32BufferAttribute(flexibilities, 1));
    treeGeometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    treeGeometry.setAttribute('aScatter', new THREE.Float32BufferAttribute(scatters, 3));
    treeGeometry.setAttribute('aGoldWeight', new THREE.Float32BufferAttribute(goldWeights, 1));

    // Check if entrance animation has already played in this user session
    const hasEntered = typeof window !== 'undefined' && sessionStorage.getItem('saturn_tree_entered') === 'true';

    const treeMaterial = new THREE.ShaderMaterial({
      vertexShader: treeVertexShader,
      fragmentShader: treeFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: new THREE.Vector2(1.0, 0.25) },
        uWindStrength: { value: prefersReducedMotion ? 0.15 : 1.0 },
        uDpr: { value: dpr },
        uEntranceProgress: { value: hasEntered ? 1.0 : 0.0 },
        uGoldIntensity: { value: hasEntered ? 1.0 : 0.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const treePoints = new THREE.Points(treeGeometry, treeMaterial);
    scene.add(treePoints);

    // 6. Falling Leaves System (Sparse, elegant, and natural)
    const leafParticles: LeafParticle[] = [];
    const leafPositions = new Float32Array(fallingLeafCount * 3);
    const leafColors = new Float32Array(fallingLeafCount * 3);
    const leafSizes = new Float32Array(fallingLeafCount);
    const leafAlphas = new Float32Array(fallingLeafCount);

    const resetLeaf = (leaf: LeafParticle, immediateProgress = false) => {
      const spawnIdx = Math.floor(rng() * canopySpawnPoints.length);
      const spawnPos = canopySpawnPoints[spawnIdx] || new THREE.Vector3(0, 2.8, 0);

      leaf.maxLife = 14.0 + rng() * 12.0;
      leaf.life = immediateProgress ? rng() * leaf.maxLife : 0.0;
      leaf.phase = rng() * Math.PI * 2;
      leaf.flutterFreq = 1.3 + rng() * 2.0;
      leaf.flutterRadius = 0.02 + rng() * 0.025;

      // Warm golden or soft silver falling leaf
      const isGold = rng() < 0.45;
      leaf.color = isGold ? richMutedGold.clone() : softIvoryWhite.clone();
      leaf.size = 1.8 + rng() * 1.8;

      leaf.pos.copy(spawnPos);
      leaf.pos.x += (rng() - 0.5) * 0.9;
      leaf.pos.y += (rng() - 0.5) * 0.4;
      leaf.pos.z += (rng() - 0.5) * 0.9;

      if (immediateProgress) {
        leaf.pos.y -= (leaf.life / leaf.maxLife) * (leaf.pos.y - (-4.8));
      }

      leaf.vel.set(
        (rng() - 0.5) * 0.03,
        -0.012 - rng() * 0.016,
        (rng() - 0.5) * 0.03
      );
    };

    for (let i = 0; i < fallingLeafCount; i++) {
      const leaf: LeafParticle = {
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: richMutedGold.clone(),
        size: 2.0,
        life: 0,
        maxLife: 15,
        phase: rng() * Math.PI * 2,
        flutterFreq: 1.5,
        flutterRadius: 0.025,
      };
      resetLeaf(leaf, true);
      leafParticles.push(leaf);
    }

    const leafGeometry = new THREE.BufferGeometry();
    leafGeometry.setAttribute('position', new THREE.BufferAttribute(leafPositions, 3));
    leafGeometry.setAttribute('aColor', new THREE.BufferAttribute(leafColors, 3));
    leafGeometry.setAttribute('aSize', new THREE.BufferAttribute(leafSizes, 1));
    leafGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(leafAlphas, 1));

    const leafMaterial = new THREE.ShaderMaterial({
      vertexShader: leafVertexShader,
      fragmentShader: leafFragmentShader,
      uniforms: {
        uDpr: { value: dpr },
        uEntranceProgress: { value: hasEntered ? 1.0 : 0.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const leafPoints = new THREE.Points(leafGeometry, leafMaterial);
    scene.add(leafPoints);

    // 7. Ambient Floating Stardust Motes
    const dustPositions = new Float32Array(dustMoteCount * 3);
    const dustColors = new Float32Array(dustMoteCount * 3);
    const dustSizes = new Float32Array(dustMoteCount);
    const dustAlphas = new Float32Array(dustMoteCount);
    const dustVelocities: THREE.Vector3[] = [];

    for (let i = 0; i < dustMoteCount; i++) {
      const rad = 2.0 + rng() * 4.8;
      const theta = rng() * Math.PI * 2;
      const y = -4.0 + rng() * 7.5;
      dustPositions[i * 3 + 0] = Math.cos(theta) * rad;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = Math.sin(theta) * rad;

      const isRight = dustPositions[i * 3 + 0] > 0;
      const col = isRight ? softPaleGold : champagneSilver;
      dustColors[i * 3 + 0] = col.r;
      dustColors[i * 3 + 1] = col.g;
      dustColors[i * 3 + 2] = col.b;

      dustSizes[i] = 0.9 + rng() * 1.2;
      dustAlphas[i] = 0.20 + rng() * 0.35;

      dustVelocities.push(new THREE.Vector3(
        (rng() - 0.5) * 0.006,
        (rng() - 0.5) * 0.005,
        (rng() - 0.5) * 0.006
      ));
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
    dustGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(dustAlphas, 1));

    const dustPoints = new THREE.Points(dustGeometry, leafMaterial);
    scene.add(dustPoints);

    // 8. Subtle Hover Parallax (Non-conflicting with OrbitControls)
    let pointerHoverX = 0;
    let pointerHoverY = 0;
    let targetHoverX = 0;
    let targetHoverY = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (!isOrbiting) {
        targetHoverX = (e.clientX / window.innerWidth) * 2 - 1;
        targetHoverY = -(e.clientY / window.innerHeight) * 2 + 1;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const aspect = width / height;

      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      updateCameraFraming(aspect);

      renderer.setSize(width, height);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      treeMaterial.uniforms.uDpr.value = renderer.getPixelRatio();
      leafMaterial.uniforms.uDpr.value = renderer.getPixelRatio();
    };

    window.addEventListener('resize', handleResize);

    // 10. Post-Login Cinematic Entrance Animation Timing (2.8s)
    let entranceStartTime: number | null = null;
    const ENTRANCE_DURATION = 2800; // 2.8 seconds

    // 11. Main Animation Loop
    let frameId = 0;
    const clock = new THREE.Clock();
    let currentWindAngle = 0;

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Post-Login Entrance Progression
      if (!hasEntered) {
        if (entranceStartTime === null) {
          entranceStartTime = performance.now();
        }
        const timeSinceStart = performance.now() - entranceStartTime;
        const progress = Math.min(timeSinceStart / ENTRANCE_DURATION, 1.0);

        treeMaterial.uniforms.uEntranceProgress.value = progress;
        leafMaterial.uniforms.uEntranceProgress.value = progress;

        // Warm golden illumination emerges smoothly from 35% onward
        const goldP = THREE.MathUtils.smoothstep(progress, 0.35, 1.0);
        treeMaterial.uniforms.uGoldIntensity.value = goldP;

        if (progress >= 1.0) {
          sessionStorage.setItem('saturn_tree_entered', 'true');
        }
      }

      // Wandering gentle breeze vector
      const windDrift = Math.sin(elapsed * 0.09) * 0.38 + Math.cos(elapsed * 0.055) * 0.18;
      currentWindAngle = THREE.MathUtils.lerp(currentWindAngle, windDrift, 0.02);
      const windX = Math.cos(currentWindAngle);
      const windZ = Math.sin(currentWindAngle);

      const gust = 0.85 + 0.22 * Math.sin(elapsed * 0.35) + 0.10 * Math.sin(elapsed * 0.88);
      treeMaterial.uniforms.uTime.value = elapsed;
      treeMaterial.uniforms.uWind.value.set(windX, windZ);
      treeMaterial.uniforms.uWindStrength.value = prefersReducedMotion ? 0.15 : gust;

      // Update OrbitControls with smooth damping
      controls.update();

      // Subtle hover parallax (only when idle, no conflict with manual orbit)
      if (!isOrbiting && !prefersReducedMotion) {
        pointerHoverX = THREE.MathUtils.lerp(pointerHoverX, targetHoverX, 0.035);
        pointerHoverY = THREE.MathUtils.lerp(pointerHoverY, targetHoverY, 0.035);
        treePoints.rotation.y = pointerHoverX * 0.028;
        treePoints.rotation.x = -pointerHoverY * 0.015;
      } else {
        treePoints.rotation.y = THREE.MathUtils.lerp(treePoints.rotation.y, 0, 0.05);
        treePoints.rotation.x = THREE.MathUtils.lerp(treePoints.rotation.x, 0, 0.05);
      }

      // Update Falling Leaves
      const leafPosAttr = leafGeometry.attributes.position as THREE.BufferAttribute;
      const leafColAttr = leafGeometry.attributes.aColor as THREE.BufferAttribute;
      const leafSizeAttr = leafGeometry.attributes.aSize as THREE.BufferAttribute;
      const leafAlphaAttr = leafGeometry.attributes.aAlpha as THREE.BufferAttribute;

      if (!prefersReducedMotion) {
        for (let i = 0; i < fallingLeafCount; i++) {
          const leaf = leafParticles[i];
          leaf.life += delta;

          if (leaf.life >= leaf.maxLife || leaf.pos.y < -4.85) {
            resetLeaf(leaf, false);
          } else {
            const progress = leaf.life / leaf.maxLife;
            const flutter = Math.sin(elapsed * leaf.flutterFreq + leaf.phase);
            const flutterCos = Math.cos(elapsed * leaf.flutterFreq * 0.85 + leaf.phase);

            leaf.pos.x += (windX * 0.36 * gust + flutter * leaf.flutterRadius) * delta * 60;
            leaf.pos.z += (windZ * 0.28 * gust + flutterCos * leaf.flutterRadius) * delta * 60;
            leaf.pos.y += leaf.vel.y * delta * 60;

            let alpha = 1.0;
            if (progress < 0.12) {
              alpha = progress / 0.12;
            } else if (progress > 0.72) {
              alpha = (1.0 - progress) / 0.28;
            }
            if (leaf.pos.y < -4.2) {
              alpha = Math.min(alpha, Math.max(0.0, (leaf.pos.y - (-4.85)) / 0.65));
            }

            leafPositions[i * 3 + 0] = leaf.pos.x;
            leafPositions[i * 3 + 1] = leaf.pos.y;
            leafPositions[i * 3 + 2] = leaf.pos.z;

            leafColors[i * 3 + 0] = leaf.color.r;
            leafColors[i * 3 + 1] = leaf.color.g;
            leafColors[i * 3 + 2] = leaf.color.b;

            leafSizes[i] = leaf.size;
            leafAlphas[i] = alpha * 0.75;
          }
        }
        leafPosAttr.needsUpdate = true;
        leafColAttr.needsUpdate = true;
        leafSizeAttr.needsUpdate = true;
        leafAlphaAttr.needsUpdate = true;
      }

      // Update Dust Motes
      if (!prefersReducedMotion) {
        const dustPosAttr = dustGeometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dustMoteCount; i++) {
          dustPositions[i * 3 + 0] += dustVelocities[i].x;
          dustPositions[i * 3 + 1] += dustVelocities[i].y + Math.sin(elapsed * 0.45 + i) * 0.002;
          dustPositions[i * 3 + 2] += dustVelocities[i].z;

          if (Math.abs(dustPositions[i * 3 + 0]) > 6.0) dustPositions[i * 3 + 0] *= -0.9;
          if (dustPositions[i * 3 + 1] > 4.6) dustPositions[i * 3 + 1] = -4.0;
          if (dustPositions[i * 3 + 1] < -4.6) dustPositions[i * 3 + 1] = 4.3;
          if (Math.abs(dustPositions[i * 3 + 2]) > 6.0) dustPositions[i * 3 + 2] *= -0.9;
        }
        dustPosAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // 12. Clean Unmount Disposal
    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', handleResize);

      treeGeometry.dispose();
      leafGeometry.dispose();
      dustGeometry.dispose();

      treeMaterial.dispose();
      leafMaterial.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-label="Cosmic Stardust Living Celestial Tree"
      role="img"
      className="absolute inset-0 w-full h-full select-none overflow-hidden cursor-grab active:cursor-grabbing pointer-events-auto"
      style={{ background: '#000000' }}
    />
  );
};
