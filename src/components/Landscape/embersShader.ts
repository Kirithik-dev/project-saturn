/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Volumetric Atmospheric Embers & Motes Shader
 * Precision GLSL shader with numerical division safety guards and continuous helical drift
 */

export const embersVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBaseSize;

attribute float aScale;
attribute float aSpeed;
attribute float aSeed;

varying float vAlpha;
varying float vSeed;

void main() {
  vSeed = aSeed;

  vec3 pos = position;
  
  // Slow upward and helical drift along flow streamlines
  float yProgress = mod(pos.y + uTime * aSpeed * 0.45, 42.0);
  pos.y = yProgress - 5.0;

  // Non-periodic helical turbulence
  float t = uTime * 0.16 + aSeed * 37.0;
  pos.x += sin(t * 0.45 + pos.y * 0.11) * 2.4 + cos(t * 0.25) * 1.2;
  pos.z += cos(t * 0.35 + pos.y * 0.09) * 1.6;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Fade near lower and upper boundary bounds
  float heightFade = smoothstep(-5.0, 3.0, pos.y) * (1.0 - smoothstep(20.0, 36.0, pos.y));
  
  // Shimmer & natural subtle flickering
  float flicker = 0.62 + 0.38 * sin(uTime * 2.2 + aSeed * 95.0);

  // Near plane & boundary fade
  float nearPlaneFade = 1.0 - smoothstep(-2.5, -0.2, mvPosition.z);
  float edgeFade = (1.0 - smoothstep(45.0, 55.0, abs(pos.x))) * (1.0 - smoothstep(20.0, 28.0, pos.z));
  float combinedFade = heightFade * flicker * nearPlaneFade * edgeFade;

  vAlpha = combinedFade;

  // Delicate pinpoint size with safe Z distance division guard
  float safeZ = max(-mvPosition.z, 0.1);
  gl_PointSize = clamp(uBaseSize * aScale * (24.0 / safeZ), 0.0, 2.4);

  if (mvPosition.z >= -0.2 || vAlpha < 0.005) {
    gl_PointSize = 0.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
  }
}
`;

export const embersFragmentShader = /* glsl */ `
uniform vec3 uColorAmber;
uniform vec3 uColorOrange;
uniform vec3 uColorGold;
uniform vec3 uColorIvory;

varying float vAlpha;
varying float vSeed;

void main() {
  if (vAlpha < 0.001) discard;

  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float core = exp(-dist * dist * 28.0);
  float aura = exp(-dist * dist * 10.0) * (1.0 - smoothstep(0.38, 0.50, dist));
  float intensity = mix(core, aura, 0.60) * 1.35;

  vec3 emberCol = mix(uColorOrange, uColorAmber, fract(vSeed * 5.73));
  if (vSeed > 0.75) {
    emberCol = mix(emberCol, uColorGold, 0.55);
  }
  if (vSeed > 0.91) {
    emberCol = mix(emberCol, uColorIvory, 0.65);
  }

  gl_FragColor = vec4(emberCol * 1.45, intensity * vAlpha * 0.82);
}
`;
