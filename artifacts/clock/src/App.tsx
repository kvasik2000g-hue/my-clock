import {
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
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
import type { ClockStyle, ClockTheme, ClockWeight } from "./types";
import {
  THEME_COLORS,
  STYLE_LABELS,
  THEME_LABELS,
  THEME_DOT_COLORS,
  CLOCK_WEIGHTS,
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
const isClockWeight = (v: unknown): v is ClockWeight =>
  CLOCK_WEIGHTS.includes(v as ClockWeight);

type AppMode = "clock" | "timer" | "stopwatch";
const CONTROLS_TIMEOUT_MS = 3000;

/* ───────── Battery indicator ───────── */
function BatteryIndicator({ isFullscreen }: { isFullscreen: boolean }) {
  const { supported, level, charging } = useBattery();
  if (!supported || !isFullscreen) return null;

  const pct = Math.round(level * 100);
  const isLow = pct < 30 && !charging;
  const fillColor = charging ? "#30d158" : isLow ? "#ff3b30" : "var(--fg)";

  return (
    <div className="battery-widget">
      <div className="battery-body-lg">
        <div
          className={`battery-fill-lg ${isLow ? "battery-blink" : ""}`}
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

function AutoFitClock({ children, fitKey }: { children: ReactNode; fitKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container || !content) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const contentWidth = content.offsetWidth;
        const contentHeight = content.offsetHeight;

        if (!containerWidth || !containerHeight || !contentWidth || !contentHeight) {
          return;
        }

        const nextScale = Math.min(
          containerWidth / contentWidth,
          containerHeight / contentHeight
        );

        setScale(Number.isFinite(nextScale) ? Math.max(nextScale * 0.98, 0.1) : 1);
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);

    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [fitKey]);

  return (
    <div className="clock-fit-box" ref={containerRef}>
      <div
        className="clock-fit-stage"
        ref={contentRef}
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
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

function MonthIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="8" width="18" height="14" rx="2" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function ShiftRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 5l7 7-7 7" />
      <path d="M4 12h16" />
    </svg>
  );
}

function ShiftLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 19l-7-7 7-7" />
      <path d="M20 12H4" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
  );
}

/* ───────── Calendar Widget ───────── */
function CalendarWidget({ time, showMonth }: { time: Date; showMonth: boolean }) {
  const currentDayOfWeek = time.getDay();
  const monday = new Date(time);
  const diff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  monday.setDate(monday.getDate() + diff);

  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.getDate());
  }

  const todayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const monthStr = time.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return (
    <div className="calendar-widget">
      <div className="cal-row cal-days-row">
        {days.map((d, i) => (
          <div key={d} className={`cal-cell cal-day ${i === todayIndex ? "cal-active-day" : ""}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="cal-row cal-dates-row">
        {dates.map((d, i) => (
          <div key={i} className={`cal-cell cal-date ${i === todayIndex ? "cal-active-date" : ""}`}>
            {d}
          </div>
        ))}
      </div>
      {showMonth && (
        <div className="cal-month-row">
          {monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}
        </div>
      )}
    </div>
  );
}

function WeightIcon({ level }: { level: number }) {
  return <span className="weight-btn-label">{`W${level}`}</span>;
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
  const [showMonth, setShowMonth] = useSetting<boolean>("showMonth", true, isBoolean);
  const [menuShift, setMenuShift] = useSetting<boolean>("menuShift", false, isBoolean);
  const [clockWeight, setClockWeight] = useSetting<ClockWeight>("clockWeight", 200, isClockWeight);
  const [mode, setMode] = useState<AppMode>("clock");
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<number | null>(null);

  const [showSwAudioMenu, setShowSwAudioMenu] = useState(false);
  const [swBeep60, setSwBeep60] = useSetting("swBeep60", false, isBoolean);
  const [swBeep30, setSwBeep30] = useSetting("swBeep30", false, isBoolean);
  const [swBeep10, setSwBeep10] = useSetting("swBeep10", false, isBoolean);
  const [swBeep1, setSwBeep1] = useSetting("swBeep1", false, isBoolean);

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

  const scheduleControlsHide = useCallback(() => {
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
    }

    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_TIMEOUT_MS);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  useEffect(() => {
    revealControls();

    const handleViewportChange = () => {
      revealControls();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);

      if (hideControlsTimeoutRef.current !== null) {
        window.clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [revealControls]);

  const openTimer = () => setMode(m => m === "timer" ? "clock" : "timer");
  const openStopwatch = () => setMode(m => m === "stopwatch" ? "clock" : "stopwatch");
  const closeOverlay = () => setMode("clock");
  const cycleWeight = () => {
    const currentIndex = CLOCK_WEIGHTS.indexOf(clockWeight);
    const nextIndex = (currentIndex + 1) % CLOCK_WEIGHTS.length;
    setClockWeight(CLOCK_WEIGHTS[nextIndex]);
  };
  const rootStyle = useMemo(
    () => ({
      "--clock-weight": clockWeight,
    }) as CSSProperties,
    [clockWeight]
  );

  return (
    <div
      className={`app-root ${controlsVisible ? "" : "controls-hidden"}`}
      data-theme={theme}
      style={rootStyle}
      onPointerDownCapture={revealControls}
      onPointerMoveCapture={revealControls}
      onTouchStartCapture={revealControls}
    >

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-spacer" />
        <BatteryIndicator isFullscreen={isFullscreen} />
      </header>

      {/* ── Top Calendar ── */}
      {showDate && mode === "clock" && <CalendarWidget time={time} showMonth={showMonth} />}

      {/* ── Left panel: themes or sound menu ── */}
      <div className="side-panel side-panel-left">
        {mode === "stopwatch" && showSwAudioMenu ? (
          <>
            <button className={`panel-btn ${swBeep60 ? 'active' : ''}`} onClick={() => setSwBeep60(!swBeep60)} title="Сигнал каждую минуту">1м</button>
            <button className={`panel-btn ${swBeep30 ? 'active' : ''}`} onClick={() => setSwBeep30(!swBeep30)} title="Сигнал каждые 30 сек">30с</button>
            <button className={`panel-btn ${swBeep10 ? 'active' : ''}`} onClick={() => setSwBeep10(!swBeep10)} title="Сигнал каждые 10 сек">10с</button>
            <button className={`panel-btn ${swBeep1 ? 'active' : ''}`} onClick={() => setSwBeep1(!swBeep1)} title="Сигнал каждую секунду">1с</button>
            
            <div className="panel-divider" style={{margin: '0.2rem 0'}} />
            
            <button className="panel-btn" onClick={() => setShowSwAudioMenu(false)} title="Стиль часов">
              <PaletteIcon />
            </button>
          </>
        ) : (
          <>
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
            {mode === "stopwatch" && (
              <>
                <div className="panel-divider" style={{margin: '0.2rem 0'}} />
                <button className="panel-btn" onClick={() => setShowSwAudioMenu(true)} title="Звуковые сигналы">
                  <SpeakerIcon />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Right panel: styles + actions ── */}
      <div className={`side-panel side-panel-right ${menuShift ? 'shifted' : ''}`}>
        <button
          className="panel-btn panel-btn-wide"
          onClick={cycleWeight}
          aria-label={`Толщина шрифта ${CLOCK_WEIGHTS.indexOf(clockWeight) + 1}`}
          title="Толщина шрифта"
        >
          <WeightIcon level={CLOCK_WEIGHTS.indexOf(clockWeight) + 1} />
        </button>

        <div className="panel-divider" />

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
          title={showDate ? "Скрыть календарь" : "Показать календарь"}
          aria-label="Календарь"
        >
          <CalIcon />
        </button>

        <button
          className={`panel-btn ${showMonth ? "active" : ""}`}
          onClick={() => setShowMonth(!showMonth)}
          title={showMonth ? "Скрыть месяц" : "Показать месяц"}
          aria-label="Месяц"
        >
          <MonthIcon />
        </button>

        <div className="panel-divider" />

        <button
          className="panel-btn panel-btn-wide"
          onClick={() => setMenuShift(!menuShift)}
          title={menuShift ? "Прижать к краю" : "Отодвинуть от панели"}
        >
          {menuShift ? <ShiftRightIcon /> : <ShiftLeftIcon />}
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
      <div className={`clock-area ${mode === "clock" && showDate ? "calendar-visible" : ""}`} onClickCapture={mode === "clock" ? handleClockTap : undefined}>
        {mode === "clock" && (
          <AutoFitClock fitKey={`${style}-${showSeconds}-${controlsVisible}-${clockWeight}`}>
            <ClockFace style={style} time={time} showSeconds={showSeconds} />
          </AutoFitClock>
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
