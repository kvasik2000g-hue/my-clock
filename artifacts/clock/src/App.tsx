import { useCallback, useEffect, useRef, useState } from "react";
import {
  useTime,
  useWakeLock,
  useFullscreen,
  useBattery,
  useSetting,
  useTimer,
  useStopwatch,
  formatDate,
} from "./hooks";
import type { ClockStyle, ClockTheme } from "./types";
import {
  THEME_COLORS,
  STYLE_LABELS,
  THEME_LABELS,
  THEME_DOT_COLORS,
} from "./types";
import { DigitalClock } from "./clocks/DigitalClock";
import { AppleClock } from "./clocks/AppleClock";
import { AnalogClock } from "./clocks/AnalogClock";
import { FlipClock } from "./clocks/FlipClock";
import { TimerOverlay, StopwatchOverlay } from "./TimerOverlay";

const STYLES: ClockStyle[] = ["apple", "analog", "digital", "flip"];
const THEMES: ClockTheme[] = ["black", "night", "matrix", "amber", "day"];
const isClockStyle = (v: unknown): v is ClockStyle =>
  STYLES.includes(v as ClockStyle);
const isClockTheme = (v: unknown): v is ClockTheme =>
  THEMES.includes(v as ClockTheme);
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

type AppMode = "clock" | "timer" | "stopwatch";

/* ───────── Battery indicator ───────── */
function BatteryIndicator() {
  const { supported, level, charging } = useBattery();
  if (!supported) return null;

  const pct = Math.round(level * 100);
  const isLow = pct <= 20 && !charging;
  const fillColor = charging ? "#30d158" : isLow ? "#ff3b30" : "var(--fg)";

  return (
    <div className="battery-widget">
      <div className="battery-body-lg">
        <div
          className="battery-fill-lg"
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
      <div className="battery-nub-lg" />
      <span className="battery-pct-lg">
        {charging && (
          <svg width="9" height="12" viewBox="0 0 8 10" fill="var(--fg)" style={{ marginRight: 2 }}>
            <path d="M4.5 0L0 5.5h3L2.5 10 8 4h-3L4.5 0z" />
          </svg>
        )}
        {pct}%
      </span>
    </div>
  );
}

/* ───────── Clock face dispatcher ───────── */
function ClockFace({
  style,
  time,
  showSeconds,
}: {
  style: ClockStyle;
  time: Date;
  showSeconds: boolean;
}) {
  const props = { time, showSeconds };
  switch (style) {
    case "apple":   return <AppleClock {...props} />;
    case "analog":  return <AnalogClock {...props} />;
    case "digital": return <DigitalClock {...props} />;
    case "flip":    return <FlipClock {...props} />;
    default:        return <AppleClock {...props} />;
  }
}

/* ───────── Fullscreen SVG icons ───────── */
function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
function CompressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

/* ───────── Timer SVG icon ───────── */
function TimerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 3h6" />
      <path d="M12 3v2" />
    </svg>
  );
}

/* ───────── Stopwatch SVG icon ───────── */
function StopwatchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.5 2.5" />
      <path d="M9.5 2.5h5" />
      <path d="M12 2.5v2" />
      <path d="M19.5 7l-1.5-1.5" />
    </svg>
  );
}

/* ───────── Calendar SVG icon ───────── */
function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

/* ───────── Main App ───────── */
export default function App() {
  const time = useTime();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useWakeLock();

  const [style, setStyle] = useSetting<ClockStyle>("style", "apple", isClockStyle);
  const [theme, setTheme] = useSetting<ClockTheme>("theme", "black", isClockTheme);
  const [showSeconds, setShowSeconds] = useSetting<boolean>("seconds", true, isBoolean);
  const [showDate, setShowDate] = useSetting<boolean>("showDate", true, isBoolean);
  const [mode, setMode] = useState<AppMode>("clock");

  const timer = useTimer(300);
  const sw = useStopwatch();

  /* Apply theme */
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.background = THEME_COLORS[theme];
  }, [theme]);

  /* Double-tap to open timer */
  const lastTapRef = useRef(0);
  const handleClockTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setMode("timer");
    }
    lastTapRef.current = now;
  }, []);

  const openTimer = () => setMode(m => m === "timer" ? "clock" : "timer");
  const openStopwatch = () => setMode(m => m === "stopwatch" ? "clock" : "stopwatch");
  const closeOverlay = () => setMode("clock");

  return (
    <div className="app-root" data-theme={theme}>

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-date">
          {showDate ? formatDate(time) : ""}
        </div>
        <BatteryIndicator />
      </header>

      {/* ── Left panel: themes ── */}
      <div className="side-panel side-panel-left">
        {THEMES.map((t) => (
          <button
            key={t}
            className={`theme-dot-btn ${t === theme ? "active" : ""}`}
            style={{ background: THEME_DOT_COLORS[t] }}
            onClick={() => setTheme(t)}
            aria-label={THEME_LABELS[t]}
            title={THEME_LABELS[t]}
          />
        ))}
      </div>

      {/* ── Right panel: styles + actions ── */}
      <div className="side-panel side-panel-right">
        {STYLES.map((s) => (
          <button
            key={s}
            className={`panel-btn style-panel-btn ${s === style && mode === "clock" ? "active" : ""}`}
            onClick={() => { setStyle(s); setMode("clock"); }}
            aria-label={s}
          >
            {STYLE_LABELS[s]}
          </button>
        ))}

        <div className="panel-divider" />

        <button
          className={`panel-btn ${mode === "timer" ? "active" : ""}`}
          onClick={openTimer}
          aria-label="Таймер"
          title="Таймер"
        >
          <TimerIcon />
        </button>

        <button
          className={`panel-btn ${mode === "stopwatch" ? "active" : ""}`}
          onClick={openStopwatch}
          aria-label="Секундомер"
          title="Секундомер"
        >
          <StopwatchIcon />
        </button>

        <div className="panel-divider" />

        <button
          className={`panel-btn ${showSeconds ? "active" : ""}`}
          onClick={() => setShowSeconds(!showSeconds)}
          title={showSeconds ? "Скрыть секунды" : "Показать секунды"}
          aria-label="Секунды"
        >
          :S
        </button>

        <button
          className={`panel-btn ${showDate ? "active" : ""}`}
          onClick={() => setShowDate(!showDate)}
          title={showDate ? "Скрыть дату" : "Показать дату"}
          aria-label="Дата"
        >
          <CalIcon />
        </button>

        <div className="panel-divider" />

        <button
          className="panel-btn panel-btn-wide"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Выйти из полного экрана" : "На весь экран"}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>
      </div>

      {/* ── Clock area ── */}
      <div className="clock-area" onClickCapture={mode === "clock" ? handleClockTap : undefined}>
        {mode === "clock" && (
          <ClockFace style={style} time={time} showSeconds={showSeconds} />
        )}
        {mode === "timer" && (
          <TimerOverlay timer={timer} onClose={closeOverlay} />
        )}
        {mode === "stopwatch" && (
          <StopwatchOverlay sw={sw} onClose={closeOverlay} />
        )}
      </div>

    </div>
  );
}
