/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ECHO Cinematic Particle Terrain Engine
 * Fullscreen, edge-to-edge living molten orange & amber wave landscape.
 * Recreates the exact ground-truth visual reference:
 * - Fluid, undulating ocean wave ridges and dunes
 * - Trochoidal particle gathering at crests
 * - Staggered organic particle distribution (zero parallel wireframe lines)
 * - Deep dark obsidian/amber troughs with high contrast
 * - Restrained bloom and near-black #0A0605 atmosphere
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { terrainVertexShader, terrainFragmentShader } from './terrainShaders';
import { embersVertexShader, embersFragmentShader } from './embersShader';
import { WaveVariationBlender } from './terrainVariations';

export interface ParticleLandscapeProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ParticleLandscape: React.FC<ParticleLandscapeProps> = ({ className = '', style }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Hardware and Environment Detection
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

    // 2. High-Density Staggered Particle Grid
    // Desktop: 680 x 440 = 299,200 particles
    // Mobile / Software: 360 x 240 = 86,400 particles
    const cols = isSoftwareGl || isMobile ? 360 : 680;
    const rows = isSoftwareGl || isMobile ? 240 : 440;
    const totalPoints = cols * rows;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 3. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    // Warm charcoal near-black background #0A0605
    scene.background = new THREE.Color(0x0A0605);
    scene.fog = new THREE.FogExp2(0x0A0605, 0.014);

    // Elevated cinematic camera perspective: 18° down-angle revealing multi-layered wave depth
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 260);
    const baseCamPos = new THREE.Vector3(0, 16.5, 34.0);
    camera.position.copy(baseCamPos);
    const lookAtTarget = new THREE.Vector3(0, 2.0, -8.0);
    camera.lookAt(lookAtTarget);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // 4. Subtle Post-Processing Bloom Pipeline (Restrained, high-threshold)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;

    if (!isSoftwareGl) {
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.16, // Subtle, restrained bloom strength
          0.18, // Tight halo around sharp crest rims
          0.84  // High threshold: prevents overall foggy washout
        );
        composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);
      } catch {
        composer = null;
      }
    }

    // 5. Procedural Wave Evolution Blender
    const waveBlender = new WaveVariationBlender();

    // 6. Staggered Hex-Lattice Point Cloud (Eliminates parallel lines & rectilinear aliasing)
    const planeWidth = 142.0;
    const planeDepth = 110.0;

    const terrainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(totalPoints * 3);
    const density = new Float32Array(totalPoints);
    const randoms = new Float32Array(totalPoints);

    const xStep = planeWidth / (cols - 1);
    const zStep = planeDepth / (rows - 1);
    const xOrigin = -planeWidth / 2;
    const zOrigin = -planeDepth / 2 - 8.0;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const rowOffset = (r % 2 === 1) ? xStep * 0.5 : 0;
      const baseZ = zOrigin + r * zStep;

      for (let c = 0; c < cols; c++) {
        // Deterministic pseudo-random micro-jitter destroys line-of-sight collinearity
        const hash1 = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        const hash2 = Math.cos(r * 39.346 + c * 11.135) * 23421.6312;
        const fract1 = hash1 - Math.floor(hash1);
        const fract2 = hash2 - Math.floor(hash2);

        const jitterX = (fract1 - 0.5) * xStep * 0.42;
        const jitterZ = (fract2 - 0.5) * zStep * 0.42;

        positions[idx * 3 + 0] = xOrigin + c * xStep + rowOffset + jitterX;
        positions[idx * 3 + 1] = baseZ + jitterZ; // Plane space (Y is depth Z in shader)
        positions[idx * 3 + 2] = 0;

        density[idx] = 0.72 + fract1 * 0.28;
        randoms[idx] = fract2;
        idx++;
      }
    }

    terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    terrainGeo.setAttribute('aDensity', new THREE.BufferAttribute(density, 1));
    terrainGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    // Particle shader material with exact reference palette
    const terrainUniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerIntensity: { value: 0 },
      uBasePointSize: { value: isMobile ? 2.4 : 2.0 },
      uWaveSpeed: { value: waveBlender.current.waveSpeed },
      uWaveAmplitude: { value: waveBlender.current.waveAmplitude },
      uSecondaryIntensity: { value: waveBlender.current.secondaryIntensity },
      uLightPosition: { value: new THREE.Vector3(0, 26, 0) },
      uCameraPos: { value: new THREE.Vector3().copy(camera.position) },
      uColorBase: { value: new THREE.Color(0x0A0605) },          // Deep charcoal black
      uColorDarkTrough: { value: new THREE.Color(0x140804) },    // Obsidian/amber shadow
      uColorBurntOrange: { value: new THREE.Color(0xFF6500) },   // Molten orange
      uColorAmber: { value: new THREE.Color(0xFF8810) },         // Warm amber
      uColorChampagneGold: { value: new THREE.Color(0xF7D794) },  // Refined champagne gold highlight
    };

    const terrainPointsMat = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: terrainUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const terrainPoints = new THREE.Points(terrainGeo, terrainPointsMat);
    scene.add(terrainPoints);

    // 7. Atmospheric Embers in Upper Sky
    const emberCount = 200;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberScale = new Float32Array(emberCount);
    const emberSpeed = new Float32Array(emberCount);
    const emberSeed = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3 + 0] = (Math.random() - 0.5) * 110;
      emberPos[i * 3 + 1] = Math.random() * 28 + 2;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 15;

      emberScale[i] = 0.35 + Math.random() * 0.75;
      emberSpeed[i] = 0.25 + Math.random() * 0.50;
      emberSeed[i] = Math.random();
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    emberGeo.setAttribute('aScale', new THREE.BufferAttribute(emberScale, 1));
    emberGeo.setAttribute('aSpeed', new THREE.BufferAttribute(emberSpeed, 1));
    emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(emberSeed, 1));

    const embersUniforms = {
      uTime: { value: 0 },
      uBaseSize: { value: 4.8 },
      uColorAmber: { value: new THREE.Color(0xFF6500) },
      uColorOrange: { value: new THREE.Color(0xFF9A1F) },
      uColorGold: { value: new THREE.Color(0xF7D794) },
    };

    const embersMat = new THREE.ShaderMaterial({
      vertexShader: embersVertexShader,
      fragmentShader: embersFragmentShader,
      uniforms: embersUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const embersPoints = new THREE.Points(emberGeo, embersMat);
    scene.add(embersPoints);

    // 8. Subtle, Organic Velocity-Aware Pointer Interaction
    const mouseNorm = new THREE.Vector2(0, 0);
    const pointerDamped = new THREE.Vector2(0, 0);
    const lastMousePos = new THREE.Vector2(0, 0);
    const camTarget = new THREE.Vector3().copy(baseCamPos);
    let pointerIntensity = 0;
    let hasPointerMoved = false;

    const handlePointerMove = (e: PointerEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;

      if (hasPointerMoved) {
        const dx = mx - lastMousePos.x;
        const dy = my - lastMousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Excite gentle disturbance proportional to movement velocity (capped safely)
        pointerIntensity = Math.min(pointerIntensity + dist * 3.2, 1.0);
      } else {
        hasPointerMoved = true;
      }

      lastMousePos.set(mx, my);
      mouseNorm.set(mx, my);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    // Tab visibility handling
    let isTabVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !frameId) {
        clock.start();
        frameId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // WebGL context recovery
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frameId);
    };

    const handleContextRestored = () => {
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // 9. Continuous Animation Loop with Incommensurate Wave Propagation
    let frameId = 0;
    let clock = new THREE.Clock();
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (isDisposed) return;
      if (!isTabVisible) {
        frameId = 0;
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.1);
      const timeScale = prefersReducedMotion ? 0.35 : 1.0;

      // Update continuous parameter drift
      waveBlender.update(delta * timeScale);
      const p = waveBlender.current;

      terrainUniforms.uTime.value += delta * timeScale;
      embersUniforms.uTime.value += delta * timeScale;

      terrainUniforms.uWaveSpeed.value = p.waveSpeed;
      terrainUniforms.uWaveAmplitude.value = p.waveAmplitude;
      terrainUniforms.uSecondaryIntensity.value = p.secondaryIntensity;

      // Orbiting warm virtual key light (elliptical 3D orbit)
      const time = terrainUniforms.uTime.value;
      const lightX = Math.sin(time * 0.038) * 38.0;
      const lightY = 25.0 + Math.sin(time * 0.022) * 5.0;
      const lightZ = Math.cos(time * 0.032) * 28.0 - 12.0;
      terrainUniforms.uLightPosition.value.set(lightX, lightY, lightZ);
      terrainUniforms.uCameraPos.value.copy(camera.position);

      // Pointer damping & graceful dissipation when pointer stops moving
      pointerDamped.lerp(mouseNorm, Math.min(delta * 2.2, 1.0));
      terrainUniforms.uPointer.value.copy(pointerDamped);

      pointerIntensity = THREE.MathUtils.damp(pointerIntensity, 0.0, 2.2, delta);
      terrainUniforms.uPointerIntensity.value = pointerIntensity;

      // Subtle, cinematic camera floating
      if (!prefersReducedMotion) {
        const time = terrainUniforms.uTime.value;
        const driftX = Math.sin(time * 0.04) * 0.50;
        const driftY = Math.cos(time * 0.03) * 0.30;

        camTarget.x = baseCamPos.x + driftX + pointerDamped.x * 0.85;
        camTarget.y = baseCamPos.y + driftY + pointerDamped.y * 0.50;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, camTarget.x, 1.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, camTarget.y, 1.5, delta);
        camera.lookAt(lookAtTarget);
      }

      // Render
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    // Pre-warm WebGL pipeline
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
      frameId = requestAnimationFrame(tick);
    } else {
      tick();
    }

    // Cleanup resources on unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      terrainGeo.dispose();
      terrainPointsMat.dispose();
      emberGeo.dispose();
      embersMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 w-full h-full overflow-hidden bg-[#0A0605] ${className}`}
      style={{ touchAction: 'none', ...style }}
    />
  );
};
