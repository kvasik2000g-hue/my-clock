import { useEffect, useRef, useState, useCallback } from "react";

function useTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // not supported or denied
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    acquire();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      release();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [acquire, release]);
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // browser denied
      }
    } else {
      await document.exitFullscreen();
    }
  }, []);

  return { isFullscreen, toggle };
}

export default function App() {
  const time = useTime();
  const { isFullscreen, toggle } = useFullscreen();
  useWakeLock();

  const dateStr = formatDate(time);
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="clock-root">
      <div className="clock-content">
        <div className="clock-time">{formatTime(time)}</div>
        <div className="clock-date">{capitalizedDate}</div>
      </div>
      <button
        className="fullscreen-btn"
        onClick={toggle}
        aria-label={isFullscreen ? "Выйти из полного экрана" : "На весь экран"}
      >
        {isFullscreen ? (
          <>
            <ExitFullscreenIcon />
            <span>Выйти</span>
          </>
        ) : (
          <>
            <EnterFullscreenIcon />
            <span>На весь экран</span>
          </>
        )}
      </button>
    </div>
  );
}

function EnterFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
