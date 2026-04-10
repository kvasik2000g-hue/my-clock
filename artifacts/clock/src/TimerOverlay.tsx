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
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  const main = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return { main, sub: `.${tenths}` };
}

/* ─────────────────────────────────────────────────────────────
   TimerDisplay  (Apple-style big numbers)
   ───────────────────────────────────────────────────────────── */
function TimerDisplay({ main, sub, label }: { main: string; sub?: string; label: string }) {
  return (
    <div className="overlay-display">
      <div className="overlay-label">{label}</div>
      <div className="apple-time overlay-time">
        <span className="apple-hm overlay-main">{main}</span>
        {sub && <span className="apple-sec overlay-sub">{sub}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Control buttons at the bottom of the overlay
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
        className={`overlay-btn overlay-btn-primary ${running ? "overlay-btn-pause" : ""}`}
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
  const { phase, remaining, elapsed, running, start, pause, reset } = timer;

  const handleStartPause = () => (running ? pause() : start());

  const isStopwatch = phase === "stopwatch";
  const { main: swMain, sub: swSub } = formatStopwatch(elapsed);
  const { main: tmMain } = formatTimer(remaining);

  return (
    <div className="overlay">
      <button className="overlay-close" onClick={onClose} aria-label="Закрыть">
        ✕
      </button>
      {isStopwatch ? (
        <TimerDisplay main={swMain} sub={swSub} label="Секундомер" />
      ) : (
        <TimerDisplay main={tmMain} label="Таймер" />
      )}
      <OverlayControls
        running={running}
        onStartPause={handleStartPause}
        onReset={reset}
        showReset={true}
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

  const handleStartPause = () => (running ? pause() : start());

  return (
    <div className="overlay">
      <button className="overlay-close" onClick={onClose} aria-label="Закрыть">
        ✕
      </button>
      <TimerDisplay main={main} sub={sub} label="Секундомер" />
      <OverlayControls
        running={running}
        onStartPause={handleStartPause}
        onReset={reset}
        showReset={elapsed > 0 || !running}
      />
    </div>
  );
}
