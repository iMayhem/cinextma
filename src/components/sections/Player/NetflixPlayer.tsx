"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { cn } from "@/utils/helpers";

interface NetflixPlayerProps {
  src: string;
  title: string;
  subtitle?: string;
  quality?: string;
  autoPlay?: boolean;
  onNext?: () => void;
  onError?: () => void;
}

const formatTime = (t: number): string => {
  if (!isFinite(t) || t < 0) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const Replay10Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    <path d="M12.5 11h-1.7l-1 1.6h1.5v2.9h1.2V11z" />
  </svg>
);

const Forward10Icon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
    <path d="M11.5 11h1.7l1 1.6h-1.5v2.9h-1.2V11z" />
  </svg>
);

const VolumeIcon = ({ className, muted }: { className?: string; muted?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    {muted ? (
      <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    )}
  </svg>
);

const GearIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.61 3.61 0 0 1 8.4 12c0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const FullscreenIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

const ExitFullscreenIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

const BackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const NetflixPlayer: React.FC<NetflixPlayerProps> = ({
  src,
  title,
  subtitle,
  quality,
  autoPlay = true,
  onNext,
  onError,
}) => {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState<[number, number][]>([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [seekHover, setSeekHover] = useState(false);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!settingsOpen) setShowControls(false);
    }, 3000);
  }, [settingsOpen]);

  const show = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  // ── source attach (HLS / direct) ─────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffered([]);

    const tryPlay = () => {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    if (src.includes(".m3u8") && Hls.isSupported()) {
      hlsRef.current?.destroy();
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          setError("Playback error — try another source");
          setWaiting(false);
          onErrorRef.current?.();
        }
      });
    } else {
      video.src = src;
      video.load();
      tryPlay();
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  // ── hard teardown on unmount / page hide (back navigation, bfcache) ──
  useEffect(() => {
    const stop = () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, []);

  // ── media events ─────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setShowControls(true);
    };
    const onTime = () => setCurrentTime(v.currentTime);
    const onDuration = () => setDuration(v.duration);
    const onVolume = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    const onProgress = () => {
      const arr: [number, number][] = [];
      for (let i = 0; i < v.buffered.length; i++) arr.push([v.buffered.start(i), v.buffered.end(i)]);
      setBuffered(arr);
    };
    const onError = () => {
      setError("Playback error — try another source");
      onErrorRef.current?.();
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDuration);
    v.addEventListener("volumechange", onVolume);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("progress", onProgress);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDuration);
      v.removeEventListener("volumechange", onVolume);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("error", onError);
    };
  }, [src]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── actions ──────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    show();
  }, [show]);

  const skip = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || Infinity);
      show();
    },
    [show],
  );

  const seekTo = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.min(Math.max(0, t), v.duration || t);
      show();
    },
    [show],
  );

  const changeVolume = useCallback(
    (val: number) => {
      const v = videoRef.current;
      if (!v) return;
      const clamped = Math.min(1, Math.max(0, val));
      v.volume = clamped;
      v.muted = clamped === 0;
      setVolume(clamped);
      setMuted(clamped === 0);
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    show();
  }, [show]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else containerRef.current?.requestFullscreen().catch(() => {});
    show();
  }, [show]);

  const changeSpeed = useCallback(
    (s: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.playbackRate = s;
      setSpeed(s);
      show();
    },
    [show],
  );

  // ── keyboard ─────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          toggleMute();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume((videoRef.current?.volume ?? 1) + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume((videoRef.current?.volume ?? 1) - 0.1);
          break;
      }
    },
    [togglePlay, skip, toggleFullscreen, toggleMute, changeVolume],
  );

  const onBarMove = useCallback(
    (e: React.MouseEvent) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      setBarWidth(ratio);
      setHoverTime(ratio * (duration || 0));
    },
    [duration],
  );

  const onBarLeave = useCallback(() => {
    setHoverTime(null);
    setSeekHover(false);
  }, []);

  const onBarClick = useCallback(
    (e: React.MouseEvent) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      seekTo(ratio * (duration || 0));
    },
    [duration, seekTo],
  );

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showBigPlay = !playing;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={show}
      onTouchStart={show}
      onMouseLeave={() => {
        if (playing) setShowControls(false);
      }}
      className="group relative h-full w-full cursor-pointer select-none bg-black outline-none"
    >
      <video
        ref={videoRef}
        src={src.includes(".m3u8") ? undefined : src}
        autoPlay={autoPlay}
        playsInline
        preload="auto"
        className={cn("h-full w-full bg-black object-contain", !showControls && "cursor-none")}
        onClick={togglePlay}
      />

      {/* top gradient + title bar */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300",
          !showControls && "opacity-0",
        )}
      >
        <div className="pointer-events-auto flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <BackIcon className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight text-white sm:text-lg">
              {title}
            </p>
            {subtitle && (
              <p className="truncate text-xs text-white/70 sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* center play button */}
      {showBigPlay && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/30 bg-black/40 text-white backdrop-blur transition hover:scale-105 hover:border-white/70"
          aria-label="Play"
        >
          <PlayIcon className="ml-1 h-10 w-10" />
        </button>
      )}

      {/* buffering spinner */}
      {waiting && playing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-[#E50914]" />
        </div>
      )}

      {/* error */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
          <p className="text-sm text-white/90 sm:text-base">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded bg-[#E50914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f6121d]"
          >
            Retry
          </button>
        </div>
      )}

      {/* bottom controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 pt-10 transition-opacity duration-300",
          !showControls && "pointer-events-none opacity-0",
        )}
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
        }}
      >
        {/* progress bar */}
        <div
          ref={barRef}
          className="group/bar relative mx-4 h-5 cursor-pointer"
          onMouseMove={onBarMove}
          onMouseLeave={onBarLeave}
          onClick={onBarClick}
          onMouseEnter={() => setSeekHover(true)}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30 transition-all group-hover/bar:h-1.5">
            {buffered.map(([start, end], i) => (
              <div
                key={i}
                className="absolute top-0 h-full bg-white/40"
                style={{
                  left: `${(start / (duration || 1)) * 100}%`,
                  width: `${((end - start) / (duration || 1)) * 100}%`,
                }}
              />
            ))}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#E50914]"
              style={{ width: `${progressPct}%` }}
            />
            {seekHover && hoverTime !== null && (
              <div
                className="absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${barWidth * 100}%` }}
              />
            )}
          </div>
          {/* hover preview time */}
          {seekHover && hoverTime !== null && (
            <span className="absolute -top-7 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
              {formatTime(hoverTime)}
            </span>
          )}
        </div>

        {/* controls row */}
        <div className="flex items-center gap-3 px-4 pb-4 sm:gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center text-white transition hover:scale-110"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <PauseIcon className="h-8 w-8" />
            ) : (
              <PlayIcon className="h-8 w-8" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(-10)}
            className="flex h-9 w-9 items-center justify-center text-white transition hover:scale-110"
            aria-label="Back 10 seconds"
          >
            <Replay10Icon className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={() => skip(10)}
            className="flex h-9 w-9 items-center justify-center text-white transition hover:scale-110"
            aria-label="Forward 10 seconds"
          >
            <Forward10Icon className="h-7 w-7" />
          </button>

          {/* volume */}
          <div className="group/vol flex items-center">
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-9 w-9 items-center justify-center text-white transition hover:scale-110"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              <VolumeIcon className="h-7 w-7" muted={muted} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="ml-2 w-0 cursor-pointer opacity-0 transition-all duration-200 group-hover/vol:w-24 group-hover/vol:opacity-100 accent-white"
              aria-label="Volume"
            />
          </div>

          <span className="text-sm font-medium text-white/90 sm:text-base">
            {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
          </span>

          <div className="flex-1" />

          {/* settings */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSettingsOpen((o) => !o);
                show();
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center text-white transition hover:scale-110",
                settingsOpen && "text-[#E50914]",
              )}
              aria-label="Settings"
            >
              <GearIcon className="h-6 w-6" />
            </button>
            {settingsOpen && (
              <div className="absolute bottom-12 right-0 w-52 rounded-md border border-white/10 bg-black/90 p-2 shadow-xl backdrop-blur">
                <p className="px-2 pb-1 text-xs font-semibold text-white/60">Playback Speed</p>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSpeed(s);
                      setSettingsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-white transition hover:bg-white/10",
                      speed === s && "text-[#E50914]",
                    )}
                  >
                    <span>{s === 1 ? "Normal" : `${s}x`}</span>
                    {speed === s && <CheckIcon className="h-4 w-4" />}
                  </button>
                ))}
                {quality && (
                  <>
                    <div className="my-1 h-px bg-white/10" />
                    <p className="px-2 pb-1 text-xs font-semibold text-white/60">Quality</p>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-white transition hover:bg-white/10"
                    >
                      <span>{quality}</span>
                      <CheckIcon className="h-4 w-4 text-[#E50914]" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* next episode */}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-1.5 rounded border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition hover:border-[#E50914] hover:bg-[#E50914]"
            >
              Next Episode
              <PlayIcon className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center text-white transition hover:scale-110"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <ExitFullscreenIcon className="h-6 w-6" />
            ) : (
              <FullscreenIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetflixPlayer;