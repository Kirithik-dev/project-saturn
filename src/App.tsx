/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ECHO Cinematic Particle Terrain Engine (V3+)
 * Fullscreen, edge-to-edge living molten orange particle landscape.
 */

import React from 'react';
import { ParticleLandscape } from './components/Landscape/ParticleLandscape';
import { SaturnLogin } from './components/Auth/SaturnLogin';

export default function App() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0A0605] select-none">
      <ParticleLandscape />
      <SaturnLogin />
    </main>
  );
}
