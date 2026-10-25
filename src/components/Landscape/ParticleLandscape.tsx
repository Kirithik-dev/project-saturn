/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN Login Background — Cinematic 3D Particle Wave & Motes Environment
 * Robust WebGL particle landscape with non-periodic wave field evolution,
 * zero-stuck particle guards, tab-switching recovery, and continuous organic motion.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { terrainVertexShader, terrainFragmentShader } from './terrainShaders';
import { embersVertexShader, embersFragmentShader } from './embersShader';
import { WaveVariationBlender } from './terrainVariations';

export interface ParticleLandscapeProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ParticleLandscape: React.FC<ParticleLandscapeProps> = ({
  className = '',
  style,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Check user accessibility preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect Software WebGL rendering guard for frame-pacing
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

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);
    const baseCameraPos = new THREE.Vector3(0, -18.5, 20.5);
    camera.position.copy(baseCameraPos);
    camera.lookAt(0, 3.5, -6.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });

    const dpr = isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio, 2);
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // 2. Wave Blender for smooth non-repeating variations
    const waveBlender = new WaveVariationBlender();

    // 3. Terrain Grid Geometry & Particle Mesh
    const gridCols = isSoftwareGl ? 160 : 240;
    const gridRows = isSoftwareGl ? 120 : 175;
    const totalPoints = gridCols * gridRows;

    const positions = new Float32Array(totalPoints * 3);
    const densities = new Float32Array(totalPoints);
    const randoms = new Float32Array(totalPoints);
    const streams = new Float32Array(totalPoints);

    const xSpan = 106.0;
    const ySpan = 74.0;

    let idx = 0;
    for (let r = 0; r < gridRows; r++) {
      const yNorm = r / (gridRows - 1);
      const y = (yNorm - 0.5) * ySpan;

      for (let c = 0; c < gridCols; c++) {
        const xNorm = c / (gridCols - 1);
        const x = (xNorm - 0.5) * xSpan;

        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = 0.0;

        // Density floor ensures no dead/stranded zero-alpha particles
        const baseDensity = 0.55 + 0.40 * Math.random();
        const spatialVariation = 0.12 * Math.sin(x * 0.12) * Math.cos(y * 0.12);
        densities[idx] = Math.max(0.35, baseDensity + spatialVariation);
        randoms[idx] = Math.random();
        streams[idx] = Math.sin(x * 0.4 + y * 0.3) * 0.5 + 0.5;

        idx++;
      }
    }

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    terrainGeometry.setAttribute('aDensity', new THREE.BufferAttribute(densities, 1));
    terrainGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    terrainGeometry.setAttribute('aStream', new THREE.BufferAttribute(streams, 1));

    const lightPos = new THREE.Vector3(12.0, 22.0, 14.0);

    const terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBasePointSize: { value: 1.8 * dpr },
        uWaveSpeed: { value: waveBlender.current.waveSpeed },
        uWaveAmplitude: { value: waveBlender.current.waveAmplitude },
        uSecondaryIntensity: { value: waveBlender.current.secondaryIntensity },
        uLightPosition: { value: lightPos },
        uCameraPos: { value: camera.position },
        uColorBase: { value: new THREE.Color('#0A0605') },
        uColorDarkTrough: { value: new THREE.Color('#140804') },
        uColorBurntOrange: { value: new THREE.Color('#FF6500') },
        uColorAmber: { value: new THREE.Color('#FF8810') },
        uColorChampagneGold: { value: new THREE.Color('#F7D794') },
        uColorIvory: { value: new THREE.Color('#FFF5E6') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const terrainMesh = new THREE.Points(terrainGeometry, terrainMaterial);
    scene.add(terrainMesh);

    // 4. Volumetric Embers & Atmospheric Motes
    const emberCount = isSoftwareGl ? 280 : 540;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberScales = new Float32Array(emberCount);
    const emberSpeeds = new Float32Array(emberCount);
    const emberSeeds = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3 + 0] = (Math.random() - 0.5) * 104.0;
      emberPositions[i * 3 + 1] = Math.random() * 42.0 - 6.0;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 44.0;

      emberScales[i] = 0.55 + Math.random() * 0.95;
      emberSpeeds[i] = 0.65 + Math.random() * 1.15;
      emberSeeds[i] = Math.random();
    }

    const embersGeometry = new THREE.BufferGeometry();
    embersGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    embersGeometry.setAttribute('aScale', new THREE.BufferAttribute(emberScales, 1));
    embersGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(emberSpeeds, 1));
    embersGeometry.setAttribute('aSeed', new THREE.BufferAttribute(emberSeeds, 1));

    const embersMaterial = new THREE.ShaderMaterial({
      vertexShader: embersVertexShader,
      fragmentShader: embersFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: 1.6 * dpr },
        uColorAmber: { value: new THREE.Color('#FF8810') },
        uColorOrange: { value: new THREE.Color('#FF6500') },
        uColorGold: { value: new THREE.Color('#F7D794') },
        uColorIvory: { value: new THREE.Color('#FFF5E6') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const embersMesh = new THREE.Points(embersGeometry, embersMaterial);
    scene.add(embersMesh);

    // 5. Deep Space Background Star Motes
    const starCount = isSoftwareGl ? 200 : 400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3 + 0] = (Math.random() - 0.5) * 130.0;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 85.0 + 10.0;
      starPositions[i * 3 + 2] = -35.0 - Math.random() * 45.0;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starVertexShader = /* glsl */ `
      uniform float uDpr;
      uniform float uBaseSize;
      varying float vAlpha;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float viewDist = max(-mvPosition.z, 0.1);
        float pSize = uBaseSize * uDpr * (42.0 / viewDist);
        gl_PointSize = clamp(pSize, 0.5, 2.5);

        float nearPlaneFade = 1.0 - smoothstep(-3.0, -0.5, mvPosition.z);
        vAlpha = 0.35 * nearPlaneFade;

        if (mvPosition.z >= -0.2 || vAlpha < 0.005) {
          gl_PointSize = 0.0;
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vAlpha = 0.0;
        }
      }
    `;

    const starFragmentShader = /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;

      void main() {
        if (vAlpha < 0.001) discard;

        vec2 coord = gl_PointCoord - vec2(0.5);
        float r = length(coord);
        if (r > 0.5) discard;

        float falloff = 1.0 - smoothstep(0.08, 0.50, r);
        gl_FragColor = vec4(uColor, falloff * vAlpha);
      }
    `;

    const starsMaterial = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uDpr: { value: dpr },
        uBaseSize: { value: 1.1 },
        uColor: { value: new THREE.Color(0xf7d794) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starsMesh = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starsMesh);

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      const nextDpr = isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(nextDpr);

      terrainMaterial.uniforms.uBasePointSize.value = 1.8 * nextDpr;
      embersMaterial.uniforms.uBaseSize.value = 1.6 * nextDpr;
      starsMaterial.uniforms.uDpr.value = nextDpr;
    };

    window.addEventListener('resize', handleResize);

    // 7. Render Loop & Lifecycle Management
    let frameId = 0;
    let lastTime = performance.now();
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      const wasVisible = isTabVisible;
      isTabVisible = document.visibilityState === 'visible';
      if (!wasVisible && isTabVisible) {
        // Reset lastTime upon tab focus to avoid large delta jumps
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const tick = () => {
      if (!isTabVisible) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      // Bound max delta to 50ms (20fps min bound) to prevent physics/wave jumps
      const delta = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;

      const motionFactor = prefersReducedMotion ? 0.2 : 1.0;

      // Update Wave Blender parameters
      waveBlender.update(delta * motionFactor);

      // Orbit key light smoothly
      // Modulo 400 * pi (1256.6370614) prevents single-precision float degradation over hours
      const elapsedTime = ((now * 0.001) % 1256.6370614) * motionFactor;
      lightPos.x = 12.0 + Math.sin(elapsedTime * 0.18) * 4.2;
      lightPos.z = 14.0 + Math.cos(elapsedTime * 0.18) * 3.2;

      // Update uniforms
      terrainMaterial.uniforms.uTime.value = elapsedTime;
      terrainMaterial.uniforms.uWaveSpeed.value = waveBlender.current.waveSpeed;
      terrainMaterial.uniforms.uWaveAmplitude.value = waveBlender.current.waveAmplitude;
      terrainMaterial.uniforms.uSecondaryIntensity.value = waveBlender.current.secondaryIntensity;

      embersMaterial.uniforms.uTime.value = elapsedTime;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // Cleanup Resources
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      terrainGeometry.dispose();
      terrainMaterial.dispose();
      embersGeometry.dispose();
      embersMaterial.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="saturn-particle-landscape"
      aria-label="SATURN Particle Wave Landscape"
      role="img"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-[#000000] ${className}`}
      style={style}
    />
  );
};
