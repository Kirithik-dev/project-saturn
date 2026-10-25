/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN Dashboard — Cinematic Video Background
 * 
 * Full-screen, immersive cinematic space video derived directly from the
 * Pinterest reference (https://pin.it/38N9x0Kpt / pin 845973111279858229).
 * Features Saturn and its majestic rings with subtle dark overlays and
 * seamless looping, backed by an instant high-res poster frame fallback.
 */

import React, { useRef, useState, useEffect } from 'react';

const CINEMATIC_PLAYBACK_RATE = 0.65;

export const SaturnCinematicBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyPlaybackRate = () => {
      video.defaultPlaybackRate = CINEMATIC_PLAYBACK_RATE;
      video.playbackRate = CINEMATIC_PLAYBACK_RATE;
    };

    applyPlaybackRate();

    const handleLoadedMetadata = () => {
      applyPlaybackRate();
    };

    const handleCanPlay = () => {
      applyPlaybackRate();
      setIsVideoLoaded(true);
    };

    const handleError = () => {
      console.warn('[SATURN Background] Video element reported error, activating poster fallback');
      setHasPlaybackError(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Handle playback attempt safely
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          applyPlaybackRate();
          setIsVideoLoaded(true);
        })
        .catch((err) => {
          console.warn('[SATURN Background] Autoplay prevented or deferred:', err);
        });
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div
      data-testid="saturn-cinematic-background"
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#000000] flex items-center justify-center select-none pointer-events-none"
      aria-hidden="true"
    >
      {/* 
        Zoomed-Out Aspect-Preserving Composition Container
        Frames the complete Saturn & ring system as the central focal point
        with generous deep-space negative space across desktop, tablet, and mobile.
      */}
      <div className="relative aspect-[9/16] h-[86vh] max-h-[980px] max-w-[88vw] w-auto flex items-center justify-center overflow-hidden">
        {/* 
          High-Resolution Fallback Poster & Instant Load Placeholder
          Matches Frame 0 of the wide composition for an invisible transition
        */}
        <img
          src="/assets/saturn_poster.jpg"
          alt="Saturn Cinematic Reference"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-out ${
            isVideoLoaded && !hasPlaybackError ? 'opacity-0' : 'opacity-100'
          }`}
          loading="eager"
        />

        {/* 
          Seamless Wide-Composition Saturn Video
          60fps motion-interpolated loop played at 0.65x speed
        */}
        {!hasPlaybackError && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            poster="/assets/saturn_poster.jpg"
            className={`w-full h-full object-contain transition-opacity duration-1000 ease-out ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src="/assets/saturn_reference.mp4" type="video/mp4" />
          </video>
        )}

        {/* 
          Soft Edge Feathering into Pure-Black Deep Space
          Ensures the 9:16 composition blends invisibly into the surrounding #000000 void
        */}
        <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#000000] via-[#000000]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#000000] via-[#000000]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#000000] via-[#000000]/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent pointer-events-none" />
      </div>

      {/* 
        Subtle Cinematic Vignette
        Preserves pure black depths and UI contrast while keeping ring details crisp
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/35 pointer-events-none" />
    </div>
  );
};

