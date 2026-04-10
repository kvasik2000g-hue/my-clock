import { useRef, useCallback } from "react";
import { pad } from "./hooks";
import type { TimerState, StopwatchState } from "./hooks";

function HoldButton({
  className,
  onAction,
  children,
}: {
  className: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const startAction = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    // Fire immediately
    onAction();
    // Start interval after a small delay
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        onAction();
      }, 100);
    }, 400);
  }, [onAction]);

  const stopAction = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return (
    <button
      className={className}
      onPointerDown={startAction}
      onPointerUp={stopAction}
      onPointerLeave={stopAction}
      onPointerCancel={stopAction}
      // Prevent default context menu behavior and text selection during hold
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   formatTimer(seconds)  →  always "HH:MM:SS"
   ───────────────────────────────────────────────────────────── */
function formatTimerClock(seconds: number): { d: number; h: string; m: string; s: string } {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { d, h: pad(h), m: pad(m), s: pad(s) };
}

/* ─────────────────────────────────────────────────────────────
   formatStopwatch(ms)   →  main "M:SS"  sub ".d"
   ───────────────────────────────────────────────────────────── */
function formatStopwatch(ms: number): { main: string; sub: string } {
  const totalSecs = Math.floor(ms / 1000);
  const secondsWithinDay = totalSecs % 86400;
  const h = Math.floor(secondsWithinDay / 3600);
  const m = Math.floor((secondsWithinDay % 3600) / 60);
  const s = secondsWithinDay % 60;
  const hundredths = Math.floor((ms % 1000) / 10);

  if (totalSecs >= 3600) {
    return { main: `${h}:${pad(m)}:${pad(s)}`, sub: "" };
  }

  return { main: `${m}:${pad(s)}`, sub: `.${pad(hundredths)}` };
}

function formatStopwatchDays(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const days = Math.floor(h / 24);
  return `${days} дн`;
}

/* ─────────────────────────────────────────────────────────────
   Control buttons
   ───────────────────────────────────────────────────────────── */
function OverlayControls({
  running,
  onStartPause,
  onReset,
  showReset,
  dayLabel,
}: {
  running: boolean;
  onStartPause: () => void;
  onReset: () => void;
  showReset: boolean;
  dayLabel?: string;
}) {
  return (
    <div className="overlay-controls">
      {dayLabel ? (
        <div className="overlay-days-inline">{dayLabel}</div>
      ) : null}
      {showReset && (
        <button className="overlay-btn overlay-btn-secondary" onClick={onReset}>
          Сброс
        </button>
      )}
      <button
        className={`overlay-btn ${running ? "overlay-btn-pause" : "overlay-btn-primary"}`}
        onClick={onStartPause}
      >
        {running ? "Пауза" : "Старт"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TIMER OVERLAY — clock-style HH:MM:SS format
   Adjustment buttons at the top, controls at the bottom
   ───────────────────────────────────────────────────────────── */
export function TimerOverlay({
  timer,
  onClose,
}: {
  timer: TimerState;
  onClose: () => void;
}) {
  const { phase, remaining, elapsed, running, start, pause, reset, adjustRemaining } = timer;
  const handleStartPause = () => (running ? pause() : start());
  const isStopwatch = phase === "stopwatch";
  const swDays = Math.floor(elapsed / 1000 / 86400);
  const swDayLabel = swDays > 0 ? `${swDays} дн` : "";
  const { main: swMain, sub: swSub } = formatStopwatch(elapsed);
  const { d, h, m, s } = formatTimerClock(remaining);
  const timerDayLabel = d > 0 ? `${d} дн` : "";

  return (
    <div className="overlay">
      <button className="overlay-close" onClick={onClose} aria-label="Закрыть">✕</button>

      <div className="overlay-top-info">
        <div className="overlay-top-left">
          <div className="overlay-label overlay-label-corner">
            {isStopwatch ? "Секундомер" : "Таймер"}
          </div>
        </div>
      </div>

      {isStopwatch ? (
        <div className="overlay-display overlay-display-stopwatch">
          <div className="overlay-time-row">
            <span className="overlay-time-main overlay-time-main-stopwatch">{swMain}</span>
            {swSub && <span className="overlay-time-sub overlay-time-sub-stopwatch">{swSub}</span>}
          </div>
        </div>
      ) : (
        <div className="overlay-display timer-global-display">
          {/* Top adjustment row */}
          <div className="timer-top-adj-row">
            <div className="timer-adj-pair">
              <HoldButton className="timer-adj-btn timer-adj-btn-hi" onAction={() => adjustRemaining(3600)}>+1 ч</HoldButton>
              <HoldButton className="timer-adj-btn timer-adj-btn-hi" onAction={() => adjustRemaining(-3600)}>−1 ч</HoldButton>
            </div>
            <div className="timer-adj-pair">
              <HoldButton className="timer-adj-btn timer-adj-btn-hi" onAction={() => adjustRemaining(60)}>+1 м</HoldButton>
              <HoldButton className="timer-adj-btn timer-adj-btn-hi" onAction={() => adjustRemaining(-60)}>−1 м</HoldButton>
            </div>
            <div className="timer-adj-pair">
              <HoldButton className="timer-adj-btn timer-adj-btn-hi" onAction={() => adjustRemaining(10)}>+10 с</HoldButton>
              <HoldButton className="timer-adj-btn timer-adj-btn-hi" onAction={() => adjustRemaining(-10)}>−10 с</HoldButton>
            </div>
          </div>

          {/* Clock-style display: HH:MM:SS */}
          <div className="timer-clock-display">
            <span className="timer-clock-segment">{h}</span>
            <span className="timer-clock-colon">:</span>
            <span className="timer-clock-segment">{m}</span>
            <span className="timer-clock-colon timer-clock-colon-hidden">:</span>
            <span className="timer-clock-segment timer-clock-sec">{s}</span>
          </div>
        </div>
      )}

      <OverlayControls
        running={running}
        onStartPause={handleStartPause}
        onReset={reset}
        showReset={true}
        dayLabel={isStopwatch ? swDayLabel : timerDayLabel}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STOPWATCH OVERLAY
   ───────────────────────────────────────────────────────────── */
export function StopwatchOverlay({
  sw,
  onClose,
}: {
  sw: StopwatchState;
  onClose: () => void;
}) {
  const { elapsed, running, start, pause, reset } = sw;
  const { main, sub } = formatStopwatch(elapsed);
  const dayLabel = formatStopwatchDays(elapsed);
  const handleStartPause = () => (running ? pause() : start());

  return (
    <div className="overlay">
      <button className="overlay-close" onClick={onClose} aria-label="Закрыть">✕</button>

      <div className="overlay-top-info">
        <div className="overlay-top-left">
          <div className="overlay-label overlay-label-corner">Секундомер</div>
        </div>
      </div>

      <div className="overlay-display overlay-display-stopwatch">
        <div className="overlay-time-row">
          <span className="overlay-time-main overlay-time-main-stopwatch">{main}</span>
          {sub && <span className="overlay-time-sub overlay-time-sub-stopwatch">{sub}</span>}
        </div>
      </div>

      <OverlayControls
        running={running}
        onStartPause={handleStartPause}
        onReset={reset}
        showReset={elapsed > 0 || !running}
        dayLabel={dayLabel}
      />
    </div>
  );
}
