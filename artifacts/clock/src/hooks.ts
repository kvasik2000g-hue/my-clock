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

/* Montana / Casio-style digital watch beep
   Uses square wave at ~3200 Hz for that classic piezo buzzer timbre.
   Single "pip" lasting ~120ms with sharp attack and cutoff. */
export function playStopwatchBeep() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const t = ctx.currentTime;
  const freq = 3200;       // classic digital watch piezo frequency
  const pipDur = 0.12;     // short pip duration

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "square";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.15, t + 0.005); // sharp attack
  gain.gain.setValueAtTime(0.15, t + pipDur - 0.01);
  gain.gain.linearRampToValueAtTime(0, t + pipDur);   // sharp cutoff

  osc.start(t);
  osc.stop(t + pipDur + 0.02);
}

/* Chime sounds, Montana-style, different patterns per interval:
   1m  = 1 short pip
   10m = 2 short pips
   15m = 2 short pips  (same as 10m)
   30m = 3 short pips
   1h  = 1 long beep */
export function playMontanaHourlyChime(interval?: string) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const freq = 3200;
  const shortPip = 0.08;
  const longPip = 0.4;
  const gap = 0.15;
  const vol = 0.15;

  let pips: { offset: number; dur: number }[];

  switch (interval) {
    case "1m":
      pips = [{ offset: 0, dur: shortPip }];
      break;
    case "10m":
    case "15m":
      pips = [
        { offset: 0, dur: shortPip },
        { offset: shortPip + gap, dur: shortPip },
      ];
      break;
    case "30m":
      pips = [
        { offset: 0, dur: shortPip },
        { offset: shortPip + gap, dur: shortPip },
        { offset: (shortPip + gap) * 2, dur: shortPip },
      ];
      break;
    case "1h":
    default:
      pips = [{ offset: 0, dur: longPip }];
      break;
  }

  pips.forEach(({ offset, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = freq;

    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.setValueAtTime(vol, t + dur - 0.01);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

/* ============================================================
   TIMER HOOK
   phase "countdown" → counts down from totalSecs to 0
   phase "stopwatch" → counts up from 0 (auto-starts after countdown ends)
   ============================================================ */
export type TimerPhase = "countdown" | "stopwatch";

export interface TimerBeepConfig {
  b60: boolean;
  b30: boolean;
  b10: boolean;
  b1: boolean;
}

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

export function useTimer(defaultSecs: number = 300, beepConfig?: TimerBeepConfig): TimerState {
  const [phase, setPhase] = useState<TimerPhase>("countdown");
  const [remaining, setRemaining] = useState(defaultSecs);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const elapsedRef = useRef(0);
  const startRef = useRef(0);
  const countdownCueRef = useRef<number | null>(null);
  const zeroSignalMarksRef = useRef<number[]>([]);
  const lastBeepSecRef = useRef<number | null>(null);
  const beepConfigRef = useRef(beepConfig);

  useEffect(() => {
    beepConfigRef.current = beepConfig;
  }, [beepConfig?.b60, beepConfig?.b30, beepConfig?.b10, beepConfig?.b1]);

  useEffect(() => {
    if (!running) return;

    if (phase === "countdown") {
      lastBeepSecRef.current = remaining;
      const id = setInterval(() => {
        setRemaining((r) => {
          if (r <= 5 && r >= 3 && countdownCueRef.current !== r) {
            countdownCueRef.current = r;
            playCountdownBeep();
          }

          // Sync lastBeepSecRef if it gets out of sync due to adjustments
          if (lastBeepSecRef.current === null || r >= lastBeepSecRef.current) {
            lastBeepSecRef.current = r;
          }

          // Periodic beep check
          const cfg = beepConfigRef.current;
          if (cfg && r < lastBeepSecRef.current) {
            lastBeepSecRef.current = r;
            // Beep at round multiples of remaining time
            let playLong = false;
            let shouldBeep = false;
            
            if (cfg.b60 && r % 60 === 0) playLong = true;
            else if (cfg.b30 && r % 30 === 0) shouldBeep = true;
            else if (cfg.b10 && r % 10 === 0) shouldBeep = true;
            else if (cfg.b1) shouldBeep = true;
            
            if ((shouldBeep || playLong) && r > 5) { // don't overlap with countdown beeps
              if (playLong) playMontanaHourlyChime('1h'); // Use long pip for 1 minute mark in timer
              else playStopwatchBeep();
            }
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
    lastBeepSecRef.current = null;
  }, [defaultSecs]);

  const adjustRemaining = useCallback((delta: number) => {
    setRemaining((r) => Math.min(999999, Math.max(10, r + delta)));
    countdownCueRef.current = null;
  }, []);

  return { phase, remaining, elapsed, running, start, pause, reset, adjustRemaining };
}

/* ============================================================
   STOPWATCH HOOK
   ============================================================ */
export interface StopwatchBeepConfig {
  b60: boolean;
  b30: boolean;
  b10: boolean;
  b1: boolean;
}

export interface StopwatchState {
  elapsed: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useStopwatch(beepConfig: StopwatchBeepConfig): StopwatchState {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const elapsedRef = useRef(0);
  const startRef = useRef(0);

  const beepsRef = useRef(beepConfig);
  const lastBeepSecRef = useRef(0);

  useEffect(() => {
    beepsRef.current = beepConfig;
  }, [beepConfig.b60, beepConfig.b30, beepConfig.b10, beepConfig.b1]);

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
         
         // Check if this is a minute mark (play full Montana chime)
         if (b60 && sec > 0 && sec % 60 === 0) {
            playMontanaHourlyChime();
         }
         // Otherwise check shorter intervals (play single pip)
         else if (b30 && sec > 0 && sec % 30 === 0) {
            playStopwatchBeep();
         }
         else if (b10 && sec > 0 && sec % 10 === 0) {
            playStopwatchBeep();
         }
         else if (b1 && sec > 0) {
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
