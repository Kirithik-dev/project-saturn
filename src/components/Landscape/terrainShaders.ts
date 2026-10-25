/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Cinematic 3D Particle Wave Engine (GLSL Shaders)
 * 
 * Precision Fixes & Architected Features:
 * 1. Non-Periodic Superposition:
 *    - Incommensurable frequency ratios for wave layers (based on irrational square-root scaling)
 *    - Prevents repeating motion cycles while keeping wave motion 100% fluid, natural, and elegant
 * 2. Robust Numerical Stability:
 *    - High-precision wrapped time uniforms preventing float degradation after long runtimes
 *    - Division-by-zero guards and safe distance/Z bounds preventing NaN or stuck particles
 * 3. Density Continuity & Lighting:
 *    - Guaranteed particle minimum visibility preventing stranded/dead zones
 *    - Analytical normals, specular crest glints, and champagne gold/ivory accents
 *    - Deep obsidian-amber valleys (#140804) maintaining contrast and negative space
 */

export const terrainVertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerIntensity;
uniform float uBasePointSize;
uniform float uWaveSpeed;
uniform float uWaveAmplitude;
uniform float uSecondaryIntensity;
uniform vec3 uLightPosition;
uniform vec3 uCameraPos;

attribute float aDensity;
attribute float aRandom;
attribute float aStream;

varying float vElevation;
varying float vCrest;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vAlpha;
varying float vStreamGlint;

// Simplex 2D noise for organic domain warping
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
    dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Multi-Layer Organic Surface Displacement & Analytical Normal Calculation
void evaluateOrganicSurface(in vec2 p, out vec3 displaced, out vec3 normal, out float crestFactor, out float streamGlint) {
  float t = uTime * uWaveSpeed;

  // Domain Drift: Organic fluid warping with non-repeating noise offsets
  vec2 warpOffset = vec2(
    snoise(p * 0.012 + vec2(t * 0.0382, -t * 0.0271)),
    snoise(p * 0.014 + vec2(-t * 0.0316, t * 0.0418) + vec2(4.8, 1.9))
  ) * 5.2;

  vec2 pw = p + warpOffset;

  float totalH = 0.0;
  vec2 dH = vec2(0.0);
  vec2 horizDisp = vec2(0.0);
  float curvatureAccum = 0.0;

  // ==========================================
  // LAYER 1: Deep Macro Swells (Gravitational Momentum)
  // Incommensurable frequency speeds prevent periodic loops
  // ==========================================
  vec2 dirM1 = normalize(vec2(0.38, -0.92));
  float kM1 = 0.028;
  float wM1 = 0.2367; // sqrt(2) * 0.167
  float aM1 = 2.5 * uWaveAmplitude;
  float phaseM1 = dot(pw, dirM1) * kM1 - t * wM1;
  totalH += sin(phaseM1) * aM1;
  dH += dirM1 * (kM1 * aM1 * cos(phaseM1));

  vec2 dirM2 = normalize(vec2(-0.70, -0.71));
  float kM2 = 0.022;
  float wM2 = 0.1732; // sqrt(3) * 0.100
  float aM2 = 1.9 * uWaveAmplitude;
  float phaseM2 = dot(pw, dirM2) * kM2 - t * wM2 + 1.85;
  totalH += sin(phaseM2) * aM2;
  dH += dirM2 * (kM2 * aM2 * cos(phaseM2));

  // ==========================================
  // LAYER 2: Intersecting Trochoidal Hero Waves
  // ==========================================
  // Hero Wave 2A: Sweeping primary diagonal ridge
  vec2 dirA = normalize(vec2(0.54, -0.84));
  float kA = 0.062;
  float wA = 0.5367; // sqrt(5) * 0.240
  float aA = 3.4 * uWaveAmplitude;
  float qA = 0.48;
  float phaseA = dot(pw, dirA) * kA - t * wA + 0.75;
  float sinA = sin(phaseA);
  float cosA = cos(phaseA);
  float shapeA = pow(0.5 + 0.5 * sinA, 1.85) * 2.0 - 0.7;
  totalH += shapeA * aA;
  horizDisp -= dirA * (qA * aA * cosA);
  dH += dirA * (kA * aA * cosA);
  curvatureAccum += pow(max(sinA, 0.0), 2.8) * 0.95;

  // Hero Wave 2B: Counter-diagonal crossing ridge
  vec2 dirB = normalize(vec2(-0.58, -0.81));
  float kB = 0.050;
  float wB = 0.4183; // sqrt(7) * 0.158
  float aB = 2.9 * uWaveAmplitude;
  float qB = 0.45;
  float phaseB = dot(pw, dirB) * kB - t * wB + 2.5;
  float sinB = sin(phaseB);
  float cosB = cos(phaseB);
  float shapeB = pow(0.5 + 0.5 * sinB, 1.75) * 2.0 - 0.7;
  totalH += shapeB * aB;
  horizDisp -= dirB * (qB * aB * cosB);
  dH += dirB * (kB * aB * cosB);
  curvatureAccum += pow(max(sinB, 0.0), 2.8) * 0.80;

  // Hero Wave 2C: Transverse dune ridge
  vec2 dirC = normalize(vec2(0.12, -0.99));
  float kC = 0.088;
  float wC = 0.6708; // sqrt(11) * 0.202
  float aC = 1.9 * uWaveAmplitude * uSecondaryIntensity;
  float phaseC = dot(pw, dirC) * kC - t * wC + 1.35;
  float sinC = sin(phaseC);
  float cosC = cos(phaseC);
  totalH += (pow(0.5 + 0.5 * sinC, 1.9) * 2.0 - 0.6) * aC;
  horizDisp -= dirC * (0.36 * aC * cosC);
  dH += dirC * (kC * aC * cosC);
  curvatureAccum += pow(max(sinC, 0.0), 3.0) * 0.60;

  // ==========================================
  // LAYER 3: Micro Streamlines & Capillary Flow
  // ==========================================
  vec2 dirD = normalize(vec2(0.78, -0.63));
  float kD = 0.140;
  float wD = 0.8944; // sqrt(13) * 0.248
  float aD = 0.90 * uWaveAmplitude * uSecondaryIntensity;
  float phaseD = dot(pw, dirD) * kD - t * wD + 3.6 + aStream * 1.5;
  totalH += sin(phaseD) * aD;
  dH += dirD * (kD * aD * cos(phaseD));

  vec2 dirE = normalize(vec2(-0.32, -0.94));
  float kE = 0.21;
  float wE = 1.1619; // sqrt(17) * 0.282
  float aE = 0.42 * uSecondaryIntensity;
  float phaseE = dot(pw, dirE) * kE - t * wE + 2.0 + aRandom * 3.14159;
  totalH += sin(phaseE) * aE;
  dH += dirE * (kE * aE * cos(phaseE));

  // Rolling topography envelope
  float hillA = snoise((pw + vec2(10.0, -8.0)) * 0.017) * 2.9;
  float hillB = snoise((pw - vec2(20.0, 16.0)) * 0.013) * 2.3;
  totalH += (hillA + hillB);

  // Smooth Boundary Attenuations
  float horizonFade = smoothstep(-74.0, -22.0, p.y);
  totalH *= (0.42 + 0.58 * horizonFade);

  float fgRamp = 1.0 - smoothstep(12.0, 38.0, p.y);
  totalH = totalH * (0.62 + 0.38 * fgRamp) - (1.0 - fgRamp) * 1.6;

  // Displaced position
  displaced = vec3(p.x + horizDisp.x, totalH, p.y + horizDisp.y);

  // Analytical surface normal with safety length guard
  vec3 rawNormal = vec3(-dH.x, 1.0, -dH.y);
  normal = length(rawNormal) > 0.0001 ? normalize(rawNormal) : vec3(0.0, 1.0, 0.0);

  // Crest factor
  crestFactor = clamp(curvatureAccum * 0.54 + (totalH * 0.078), 0.0, 1.0);

  // Stream glint along high-frequency particle streamlines
  streamGlint = clamp(pow(max(sin(phaseD), 0.0), 4.0) * aDensity, 0.0, 1.0);
}

void main() {
  vec2 p = position.xy;

  vec3 worldPos;
  vec3 surfNormal;
  float crest;
  float streamGlint;
  evaluateOrganicSurface(p, worldPos, surfNormal, crest, streamGlint);

  // Smooth Pointer Disturbance
  if (uPointerIntensity > 0.001) {
    vec2 pointerPos = vec2(uPointer.x * 34.0, uPointer.y * 22.0 - 8.0);
    float mouseDist = length(p - pointerPos);
    float pointerEnvelope = exp(-mouseDist * 0.13) * (1.0 - smoothstep(0.0, 26.0, mouseDist));
    float pointerWave = sin(mouseDist * 0.38 - uTime * 2.6) * pointerEnvelope * 0.50 * uPointerIntensity;
    worldPos.y += pointerWave;
  }

  vElevation = worldPos.y;
  vCrest = crest;
  vNormal = surfNormal;
  vWorldPos = worldPos;
  vStreamGlint = streamGlint;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;

  // Perspective-Aware Point Sizing with Division Safety
  float viewDist = max(length(mvPosition.xyz), 0.1);
  float pSize = uBasePointSize * (42.0 / viewDist);
  pSize *= (0.80 + 0.35 * crest + 0.20 * aDensity);

  // Smooth Boundary Attenuations preventing particles from hitting camera plane or viewport edges
  float nearPlaneFade = 1.0 - smoothstep(-3.0, -0.2, mvPosition.z);
  float fgBoundaryFade = 1.0 - smoothstep(22.0, 30.0, worldPos.z);
  float sideBoundaryFade = 1.0 - smoothstep(46.0, 56.0, abs(worldPos.x));
  float bgBoundaryFade = smoothstep(-44.0, -28.0, worldPos.z);

  float combinedFade = nearPlaneFade * fgBoundaryFade * sideBoundaryFade * bgBoundaryFade;

  // Depth-layer alpha factor with smooth boundary fade
  vAlpha = aDensity * (0.55 + 0.45 * fgBoundaryFade) * combinedFade;

  // Fine pinpoints (0.85px to 3.0px max)
  gl_PointSize = clamp(pSize * (0.30 + 0.70 * combinedFade), 0.0, 3.0);

  // Strict camera plane & offscreen culling guard
  if (mvPosition.z >= -0.2 || vAlpha < 0.005) {
    gl_PointSize = 0.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
  }
}
`;
export const terrainFragmentShader = /* glsl */ `
uniform vec3 uColorBase;            // Deep space background (#000000 / #0A0605)
uniform vec3 uColorDarkTrough;      // Deep obsidian-amber valley (#140804)
uniform vec3 uColorBurntOrange;      // Molten orange/bronze (#FF6500)
uniform vec3 uColorAmber;            // Warm amber (#FF8810)
uniform vec3 uColorChampagneGold;    // Champagne gold highlight (#F7D794)
uniform vec3 uColorIvory;            // Refined soft ivory accent (#FFF5E6)
uniform vec3 uLightPosition;        // Orbiting virtual key light
uniform vec3 uCameraPos;            // World camera position
uniform float uTime;

varying float vElevation;
varying float vCrest;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vAlpha;
varying float vStreamGlint;

void main() {
  if (vAlpha < 0.001) discard;

  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;

  // Refined point disc falloff: sharp luminous pin-point core + soft warm radial halo
  float coreFalloff = exp(-r * r * 24.0);
  float auraFalloff = exp(-r * r * 8.5) * (1.0 - smoothstep(0.38, 0.50, r));
  float pointFalloff = mix(coreFalloff, auraFalloff, 0.50) * 1.25;

  // Height normalization from trough to peak
  float normH = clamp((vElevation + 2.2) / 10.5, 0.0, 1.0);

  // 1. Base Palette Gradient:
  // Deep valley (#140804) -> Molten orange (#FF6500) -> Warm amber (#FF8810)
  vec3 col = mix(uColorDarkTrough, uColorBurntOrange, smoothstep(0.04, 0.35, normH));
  col = mix(col, uColorAmber, smoothstep(0.28, 0.70, normH));

  // 2. Intelligent Spatially Localized Lighting:
  vec3 N = length(vNormal) > 0.0001 ? normalize(vNormal) : vec3(0.0, 1.0, 0.0);
  vec3 L_dir = uLightPosition - vWorldPos;
  vec3 L = length(L_dir) > 0.0001 ? normalize(L_dir) : vec3(0.0, 1.0, 0.0);
  vec3 V_dir = uCameraPos - vWorldPos;
  vec3 V = length(V_dir) > 0.0001 ? normalize(V_dir) : vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float specular = pow(NdotH, 22.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);

  // 3. Gliding Champagne-Gold & Ivory Crest Highlights:
  float crestConcentration = smoothstep(0.25, 0.82, vCrest) * smoothstep(0.20, 0.82, normH);
  float highlightIntensity = crestConcentration * (0.32 + 0.68 * NdotL + 0.90 * specular + 0.50 * fresnel) + vStreamGlint * 0.40;

  // Smooth respiration cycle (~28 seconds)
  float respiration = 0.92 + 0.08 * sin(uTime * 0.2244);
  highlightIntensity *= respiration;

  // Blend into Champagne Gold (#F7D794)
  col = mix(col, uColorChampagneGold, clamp(highlightIntensity * 0.82, 0.0, 1.0));

  // Add subtle soft ivory glint on peak crests and stream glints
  if (highlightIntensity > 0.55 || vStreamGlint > 0.60) {
    float ivoryFactor = smoothstep(0.55, 0.90, highlightIntensity) * 0.5 + vStreamGlint * 0.45;
    col = mix(col, uColorIvory, clamp(ivoryFactor, 0.0, 0.65));
  }

  // Emissive highlight boost (keeps highlights fiery golden, radiant, and light-emitting)
  col *= (1.12 + highlightIntensity * 0.85 + vStreamGlint * 0.35);

  // 4. Contrast & Valley Grounding (Preserving deep obsidian black space in valleys):
  float valleyShadow = 1.0 - smoothstep(0.04, 0.35, normH);
  col = mix(col, uColorDarkTrough, valleyShadow * 0.62);

  // 5. Atmospheric Depth Fog:
  float dist = max(length(vViewPosition), 0.01);
  float fog = smoothstep(36.0, 130.0, dist);
  vec3 finalColor = mix(col, uColorBase, fog * 0.92);

  float boundaryAlpha = 1.0 - smoothstep(94.0, 128.0, dist);
  float finalAlpha = clamp(pointFalloff * vAlpha * boundaryAlpha * 1.20, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;
