import { useEffect, useRef, useState, useCallback } from "react";

export function useTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // not supported or permission denied
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
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      release();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [acquire, release]);
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
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

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
}

export interface BatteryState {
  supported: boolean;
  level: number;
  charging: boolean;
}

export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    supported: false,
    level: 1,
    charging: false,
  });

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManager>;
    };
    if (typeof nav.getBattery !== "function") return;

    let battery: BatteryManager | null = null;

    const update = () => {
      if (!battery) return;
      setState({
        supported: true,
        level: battery.level,
        charging: battery.charging,
      });
    };

    nav.getBattery().then((b) => {
      battery = b;
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    }).catch(() => {/* not available */});

    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", update);
        battery.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  return state;
}

export function useControlsVisible() {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 5000);
  }, []);

  useEffect(() => {
    show();
    window.addEventListener("mousemove", show, { passive: true });
    window.addEventListener("touchstart", show, { passive: true });
    window.addEventListener("click", show, { passive: true });
    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
      window.removeEventListener("click", show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  return { visible, show };
}

export function useSetting<T>(
  key: string,
  defaultValue: T
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`clock-${key}`);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // ignore
    }
    return defaultValue;
  });

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(`clock-${key}`, JSON.stringify(newValue));
      } catch {
        // ignore
      }
    },
    [key]
  );

  return [value, set];
}

export function formatDate(date: Date) {
  const str = date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function getHours(date: Date, use24h: boolean): { h: number; ampm: string } {
  const raw = date.getHours();
  if (use24h) return { h: raw, ampm: "" };
  const ampm = raw >= 12 ? "PM" : "AM";
  return { h: raw % 12 || 12, ampm };
}
