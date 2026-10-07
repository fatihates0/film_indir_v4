import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getCinemaVersion } from '../Config/cinemaConfig';

export default function HeroTrailerBackground({
    backdrop,
    title,
    trailer,
    trailers = [],
    onTrailerChange,
    isMuted,
    onToggleMute,
    heroRef,
    version,
    onPlayStateChange,
    isOverlayVisible = true,
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const playerRef = useRef(null);
    const playerWrapperRef = useRef(null);
    const failedKeysRef = useRef(new Set());
    const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

    const activeVersion = version || getCinemaVersion();
    const isV2 = activeVersion === 'v2';
    const isExpanded = isV2 && isPlaying && !isMuted;

    useEffect(() => {
        if (onPlayStateChange) {
            onPlayStateChange(isPlaying);
        }
    }, [isPlaying, onPlayStateChange]);

    // Clear failed keys when navigating to a different title/page
    useEffect(() => {
        failedKeysRef.current.clear();
        setIsPlaying(false);
    }, [backdrop, title]);

    const hasTrailer = Boolean(trailer?.key && (!trailer?.site || trailer?.site.toLowerCase() === 'youtube'));

    // Destroy player on full unmount
    useEffect(() => {
        return () => {
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    // Helper to forcefully disable closed captions / subtitles on YouTube player
    const disableCaptions = (player) => {
        if (!player) return;
        try {
            if (typeof player.unloadModule === 'function') {
                player.unloadModule('captions');
                player.unloadModule('cc');
            }
            if (typeof player.setOption === 'function') {
                player.setOption('captions', 'track', {});
                player.setOption('cc', 'track', {});
            }
        } catch {
            // ignore
        }
    };

    // Initialize or switch YouTube Player
    useEffect(() => {
        if (!hasTrailer) {
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch {
                    // ignore
                }
                playerRef.current = null;
            }
            setPlayerReady(false);
            setIsPlaying(false);
            return;
        }

        if (failedKeysRef.current.has(trailer.key)) {
            const nextTrailer = (trailers || []).find(t => t.key && !failedKeysRef.current.has(t.key));
            if (nextTrailer && onTrailerChange) {
                onTrailerChange(nextTrailer);
                return;
            }
        }

        // Seamless switch if player is already ready
        if (playerRef.current && playerReady && typeof playerRef.current.loadVideoById === 'function') {
            try {
                playerRef.current.loadVideoById({
                    videoId: trailer.key,
                    startSeconds: 0,
                });
                if (isMuted) {
                    playerRef.current.mute();
                } else {
                    playerRef.current.unMute();
                    playerRef.current.setVolume(100);
                }
                disableCaptions(playerRef.current);
                setTimeout(() => disableCaptions(playerRef.current), 300);
                playerRef.current.playVideo();
                setIsPlaying(true);
                return;
            } catch (err) {
                console.warn("Seamless trailer switch failed, re-initializing:", err);
            }
        }

        let isMounted = true;

        const initPlayer = () => {
            if (!window.YT || !window.YT.Player) return;

            // Ensure container element exists inside wrapper
            if (playerWrapperRef.current) {
                let targetEl = document.getElementById(containerId.current);
                if (!targetEl) {
                    targetEl = document.createElement('div');
                    targetEl.id = containerId.current;
                    targetEl.className = 'w-full h-full pointer-events-none';
                    playerWrapperRef.current.appendChild(targetEl);
                }
            }

            // If player already exists, destroy first
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch {
                    // ignore
                }
            }

            // Re-ensure container after destroy
            if (playerWrapperRef.current) {
                let targetEl = document.getElementById(containerId.current);
                if (!targetEl) {
                    targetEl = document.createElement('div');
                    targetEl.id = containerId.current;
                    targetEl.className = 'w-full h-full pointer-events-none';
                    playerWrapperRef.current.appendChild(targetEl);
                }
            }

            try {
                playerRef.current = new window.YT.Player(containerId.current, {
                    videoId: trailer.key,
                    host: 'https://www.youtube-nocookie.com',
                    playerVars: {
                        autoplay: 1,
                        mute: 1,
                        controls: 0,
                        showinfo: 0,
                        rel: 0,
                        loop: 1,
                        playlist: trailer.key,
                        modestbranding: 1,
                        playsinline: 1,
                        disablekb: 1,
                        fs: 0,
                        iv_load_policy: 3,
                        cc_load_policy: 0,
                    },
                    events: {
                        onReady: (event) => {
                            if (!isMounted) return;
                            setPlayerReady(true);
                            event.target.mute();
                            disableCaptions(event.target);
                            setTimeout(() => disableCaptions(event.target), 300);
                            event.target.playVideo();
                        },
                        onStateChange: (event) => {
                            if (!isMounted) return;
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                setIsPlaying(true);
                                disableCaptions(event.target);
                                setTimeout(() => disableCaptions(event.target), 300);
                                setTimeout(() => disableCaptions(event.target), 800);
                            } else if (event.data === window.YT.PlayerState.ENDED) {
                                event.target.playVideo();
                            }
                        },
                        onError: (event) => {
                            console.warn(`[HeroTrailer] Video ${trailer.key} failed with code: ${event.data}`);
                            failedKeysRef.current.add(trailer.key);

                            // Destroy errored player so we don't try to reuse a broken instance
                            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                                try {
                                    playerRef.current.destroy();
                                } catch {
                                    // ignore
                                }
                            }
                            playerRef.current = null;
                            setPlayerReady(false);
                            setIsPlaying(false);
                            
                            // Automatically fall back to next playable trailer if available
                            const nextTrailer = (trailers || []).find(t => t.key && !failedKeysRef.current.has(t.key));
                            if (nextTrailer) {
                                console.log(`[HeroTrailer] Auto-switching to next trailer: ${nextTrailer.key} (${nextTrailer.name || nextTrailer.label})`);
                                if (onTrailerChange) {
                                    onTrailerChange(nextTrailer);
                                }
                            } else {
                                console.warn('[HeroTrailer] All available trailers failed. Retaining backdrop poster.');
                                setIsPlaying(false);
                            }
                        },
                    },
                });
            } catch (err) {
                console.error("[HeroTrailer] YouTube Player init error:", err);
            }
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            // Load YouTube IFrame API script once
            if (!document.getElementById('yt-iframe-api')) {
                const tag = document.createElement('script');
                tag.id = 'yt-iframe-api';
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }

            const prevOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof prevOnYouTubeIframeAPIReady === 'function') {
                    prevOnYouTubeIframeAPIReady();
                }
                if (isMounted) {
                    initPlayer();
                }
            };
        }

        // Watchdog: If player is in PLAYING state (1) or BUFFERING (3), ensure isPlaying is true
        const watchdog = setInterval(() => {
            if (!isMounted) return;
            if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
                try {
                    const state = playerRef.current.getPlayerState();
                    if (state === 1 || state === 3) {
                        setIsPlaying(true);
                    }
                } catch {
                    // ignore
                }
            }
        }, 400);

        return () => {
            isMounted = false;
            clearInterval(watchdog);
        };
    }, [trailer?.key]);

    // Handle Mute / Unmute
    useEffect(() => {
        if (!playerRef.current || !playerReady) return;

        try {
            if (isMuted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
                playerRef.current.setVolume(100);
            }
        } catch {
            // fallback postMessage if direct call fails
            const iframe = document.getElementById(containerId.current);
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: isMuted ? 'mute' : 'unMute',
                    }),
                    '*'
                );
            }
        }
    }, [isMuted, playerReady]);

    // Smart Auto-Mute when scrolling out of Hero section
    useEffect(() => {
        const handleScroll = () => {
            if (!isMuted && heroRef?.current) {
                const rect = heroRef.current.getBoundingClientRect();
                // If hero is scrolled out of viewport by more than 75%
                if (rect.bottom < window.innerHeight * 0.25) {
                    if (onToggleMute) {
                        onToggleMute(true); // force mute
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMuted, onToggleMute, heroRef]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Fallback Static Backdrop Image */}
            <img
                src={backdrop}
                alt={title}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
                    isPlaying ? 'opacity-0' : 'opacity-100'
                }`}
            />

            {/* YouTube Background Video Player */}
            {hasTrailer && (
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-h-full min-w-[177.77vh] transition-all duration-1000 ease-out ${
                        isExpanded ? 'scale-[1.04]' : 'scale-[1.28]'
                    } ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                >
                    <div ref={playerWrapperRef} className="w-full h-full pointer-events-none">
                        <div id={containerId.current} className="w-full h-full pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Cinematic Gradient Overlays */}
            {/* Top gradient for navbar readability */}
            <div
                className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/90 via-black/45 to-transparent pointer-events-none z-10"
            />

            {/* Left subtle Vignette - Keeps hero text 100% readable over video */}
            <div
                className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
                    isOverlayVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <div
                    className={`w-full h-full transition-all duration-1000 ${
                        !isMuted
                            ? isExpanded
                                ? 'bg-gradient-to-r from-black/80 via-black/40 to-transparent'
                                : 'bg-gradient-to-r from-black/85 via-black/50 to-transparent'
                            : 'bg-gradient-to-r from-black/90 via-black/55 to-transparent'
                    }`}
                />
            </div>

            {/* Bottom degrade blend into page body - Fades out when hero text/UI fades out */}
            <div
                className={`absolute inset-x-0 bottom-0 h-44 sm:h-56 md:h-64 transition-opacity duration-700 pointer-events-none z-10 ${
                    isOverlayVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {/* Ultra-smooth multi-stop eased dark mode gradient */}
                <div
                    className="w-full h-full transition-opacity duration-1000 hidden dark:block"
                    style={{
                        background: !isMuted && isExpanded
                            ? 'linear-gradient(to top, rgba(7, 8, 12, 0.95) 0%, rgba(7, 8, 12, 0.68) 22%, rgba(7, 8, 12, 0.32) 48%, rgba(7, 8, 12, 0.08) 75%, rgba(7, 8, 12, 0) 100%)'
                            : 'linear-gradient(to top, rgba(7, 8, 12, 1) 0%, rgba(7, 8, 12, 0.88) 16%, rgba(7, 8, 12, 0.65) 34%, rgba(7, 8, 12, 0.38) 54%, rgba(7, 8, 12, 0.15) 74%, rgba(7, 8, 12, 0.03) 88%, rgba(7, 8, 12, 0) 100%)'
                    }}
                />
                {/* Ultra-smooth multi-stop eased light mode gradient */}
                <div
                    className="w-full h-full transition-opacity duration-1000 block dark:hidden"
                    style={{
                        background: !isMuted && isExpanded
                            ? 'linear-gradient(to top, rgba(244, 245, 248, 0.95) 0%, rgba(244, 245, 248, 0.68) 22%, rgba(244, 245, 248, 0.32) 48%, rgba(244, 245, 248, 0.08) 75%, rgba(244, 245, 248, 0) 100%)'
                            : 'linear-gradient(to top, rgba(244, 245, 248, 1) 0%, rgba(244, 245, 248, 0.88) 16%, rgba(244, 245, 248, 0.65) 34%, rgba(244, 245, 248, 0.38) 54%, rgba(244, 245, 248, 0.15) 74%, rgba(244, 245, 248, 0.03) 88%, rgba(244, 245, 248, 0) 100%)'
                    }}
                />
            </div>
        </div>
    );
}
