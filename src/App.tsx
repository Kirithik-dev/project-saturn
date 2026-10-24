/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ECHO Cinematic Particle Terrain Engine
 * Fullscreen, edge-to-edge living molten orange particle landscape.
 * SATURN — Second Brain with Secure Supabase Authentication & Vault.
 */

import React from 'react';
import { ParticleLandscape } from './components/Landscape/ParticleLandscape';
import { SaturnLogin } from './components/Auth/SaturnLogin';
import { SaturnWorkspace } from './components/Workspace/SaturnWorkspace';
import { AuthProvider, useAuth } from './context/AuthContext';

function SaturnContent() {
  const { user, loading } = useAuth();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0A0605] select-none">
      {/* Locked Particle Wave Background: Untouched and running continuously */}
      <ParticleLandscape />

      {/* Authentication Gateway & Protected Vault Guard */}
      {!loading && (user ? <SaturnWorkspace /> : <SaturnLogin />)}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SaturnContent />
    </AuthProvider>
  );
}
