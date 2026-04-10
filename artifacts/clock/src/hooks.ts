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
      /* not supported or permission denied */
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
        /* browser denied */
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
      setState({ supported: true, level: battery.level, charging: battery.charging });
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

export function useSetting<T>(
  key: string,
  defaultValue: T,
  validate?: (v: unknown) => v is T
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`clock-${key}`);
      if (stored !== null) {
        const parsed = JSON.parse(stored) as unknown;
        if (validate ? validate(parsed) : typeof parsed === typeof defaultValue) {
          return parsed as T;
        }
      }
    } catch {
      /* ignore */
    }
    return defaultValue;
  });

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(`clock-${key}`, JSON.stringify(newValue));
      } catch {
        /* ignore */
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

export function get24Hours(date: Date) {
  return date.getHours();
}

/* ============================================================
   AUDIO
   ============================================================ */
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      _audioCtx = new Ctor();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function playToneSequence(offsets: number[], duration: number, frequency: number, peakGain: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  offsets.forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + Math.min(0.03, duration / 2));
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  });
}

export function playBeep() {
  playToneSequence([0, 0.32, 0.64], 0.26, 880, 0.35);
}

export function playCountdownBeep() {
  playToneSequence([0], 0.12, 880, 0.28);
}

export function playStopwatchBeep() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = "sine";
  osc2.type = "triangle";
  
  osc.frequency.value = 659.25; // E5
  osc2.frequency.value = 880.00; // A5
  
  const t = ctx.currentTime;
  const duration = 0.5;
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  
  osc.start(t);
  osc2.start(t);
  osc.stop(t + duration + 0.1);
  osc2.stop(t + duration + 0.1);
}

/* ============================================================
   TIMER HOOK
   phase "countdown" → counts down from totalSecs to 0
   phase "stopwatch" → counts up from 0 (auto-starts after countdown ends)
   ============================================================ */
export type TimerPhase = "countdown" | "stopwatch";

export interface TimerState {
  phase: TimerPhase;
  remaining: number;
  elapsed: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  adjustRemaining: (delta: number) => void;
}

export function useTimer(defaultSecs: number = 300): TimerState {
  const [phase, setPhase] = useState<TimerPhase>("countdown");
  const [remaining, setRemaining] = useState(defaultSecs);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const elapsedRef = useRef(0);
  const startRef = useRef(0);
  const countdownCueRef = useRef<number | null>(null);
  const zeroSignalMarksRef = useRef<number[]>([]);

  useEffect(() => {
    if (!running) return;

    if (phase === "countdown") {
      const id = setInterval(() => {
        setRemaining((r) => {
          if (r <= 5 && r >= 3 && countdownCueRef.current !== r) {
            countdownCueRef.current = r;
            playCountdownBeep();
          }

          if (r <= 1) {
            clearInterval(id);
            setRunning(false);
            countdownCueRef.current = null;
            zeroSignalMarksRef.current = [0];
            playBeep();
            setTimeout(() => {
              setPhase("stopwatch");
              setElapsed(0);
              elapsedRef.current = 0;
              startRef.current = Date.now();
              setRunning(true);
            }, 100);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    } else {
      startRef.current = Date.now() - elapsedRef.current;
      const id = setInterval(() => {
        const e = Date.now() - startRef.current;
        elapsedRef.current = e;
        setElapsed(e);

        const elapsedSeconds = Math.floor(e / 1000);
        if (
          elapsedSeconds === 5 &&
          !zeroSignalMarksRef.current.includes(elapsedSeconds)
        ) {
          zeroSignalMarksRef.current.push(elapsedSeconds);
          playBeep();
        }
      }, 50);
      return () => clearInterval(id);
    }
  }, [running, phase]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setPhase("countdown");
    setRemaining(defaultSecs);
    setElapsed(0);
    elapsedRef.current = 0;
    countdownCueRef.current = null;
    zeroSignalMarksRef.current = [];
  }, [defaultSecs]);

  const adjustRemaining = useCallback((delta: number) => {
    setRemaining((r) => Math.min(5940, Math.max(10, r + delta)));
    countdownCueRef.current = null;
  }, []);

  return { phase, remaining, elapsed, running, start, pause, reset, adjustRemaining };
}

/* ============================================================
   STOPWATCH HOOK
   ============================================================ */
export interface StopwatchState {
  elapsed: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

const _isBool = (v: unknown): v is boolean => typeof v === "boolean";

export function useStopwatch(): StopwatchState {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const elapsedRef = useRef(0);
  const startRef = useRef(0);

  const [b60] = useSetting("swBeep60", false, _isBool);
  const [b30] = useSetting("swBeep30", false, _isBool);
  const [b10] = useSetting("swBeep10", false, _isBool);
  const [b1] = useSetting("swBeep1", false, _isBool);
  const beepsRef = useRef({ b60, b30, b10, b1 });
  const lastBeepSecRef = useRef(0);

  useEffect(() => {
    beepsRef.current = { b60, b30, b10, b1 };
  }, [b60, b30, b10, b1]);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsedRef.current;
    lastBeepSecRef.current = Math.floor(elapsedRef.current / 1000);

    const id = setInterval(() => {
      const e = Date.now() - startRef.current;
      elapsedRef.current = e;
      setElapsed(e);

      const sec = Math.floor(e / 1000);
      if (sec > lastBeepSecRef.current) {
         lastBeepSecRef.current = sec;
         const { b60, b30, b10, b1 } = beepsRef.current;
         let shouldBeep = false;
         if (b60 && sec > 0 && sec % 60 === 0) shouldBeep = true;
         else if (b30 && sec > 0 && sec % 30 === 0) shouldBeep = true;
         else if (b10 && sec > 0 && sec % 10 === 0) shouldBeep = true;
         else if (b1 && sec > 0) shouldBeep = true;
         
         if (shouldBeep) {
            playStopwatchBeep();
         }
      }
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    elapsedRef.current = 0;
    lastBeepSecRef.current = 0;
  }, []);

  return { elapsed, running, start, pause, reset };
}
