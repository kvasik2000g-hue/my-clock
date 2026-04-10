import { pad } from "./hooks";
import type { TimerState, StopwatchState } from "./hooks";

/* ─────────────────────────────────────────────────────────────
   formatTimer(seconds)  →  "M:SS" or "H:MM:SS"
   ───────────────────────────────────────────────────────────── */
function formatTimer(seconds: number): { main: string; sub?: string } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return { main: `${h}:${pad(m)}:${pad(s)}` };
  }
  return { main: `${m}:${pad(s)}` };
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
   TimerDisplay  – standalone classes, no apple-hm conflict
   ───────────────────────────────────────────────────────────── */
function TimerDisplay({
  main,
  sub,
  adjust
}: {
  main: string;
  sub?: string;
  adjust?: (delta: number) => void;
}) {
  return (
    <div className="overlay-display">
      <div className="timer-center-row">
        {adjust && (
          <div className="vertical-adj-group">
            <button className="timer-adj-btn timer-adj-btn-hi" onClick={() => adjust(60)}>+1 м</button>
            <button className="timer-adj-btn timer-adj-btn-hi" onClick={() => adjust(-60)}>−1 м</button>
          </div>
        )}
        
        <div className="overlay-time-row">
          <span className="overlay-time-main">{main}</span>
          {sub && <span className="overlay-time-sub">{sub}</span>}
        </div>

        {adjust && (
          <div className="vertical-adj-group">
            <button className="timer-adj-btn timer-adj-btn-hi" onClick={() => adjust(10)}>+10 с</button>
            <button className="timer-adj-btn timer-adj-btn-hi" onClick={() => adjust(-10)}>−10 с</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Control buttons
   ───────────────────────────────────────────────────────────── */
function OverlayControls({
  running,
  onStartPause,
  onReset,
  showReset,
}: {
  running: boolean;
  onStartPause: () => void;
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <div className="overlay-controls">
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
   TIMER OVERLAY
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
  const { main: swMain, sub: swSub } = formatStopwatch(elapsed);
  const { main: tmMain } = formatTimer(remaining);

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
        <TimerDisplay main={swMain} sub={swSub} />
      ) : (
        <TimerDisplay main={tmMain} adjust={adjustRemaining} />
      )}

      {!isStopwatch && (
        <div className="timer-overlay-actions">
          <OverlayControls
            running={running}
            onStartPause={handleStartPause}
            onReset={reset}
            showReset={true}
          />
        </div>
      )}

      {isStopwatch && (
        <OverlayControls
          running={running}
          onStartPause={handleStartPause}
          onReset={reset}
          showReset={true}
        />
      )}
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
          <div className="overlay-days">{dayLabel}</div>
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
      />
    </div>
  );
}
