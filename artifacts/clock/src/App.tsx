import { useEffect } from "react";
import {
  useTime,
  useWakeLock,
  useFullscreen,
  useBattery,
  useControlsVisible,
  useSetting,
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
import { NeonClock } from "./clocks/NeonClock";
import { FlipClock } from "./clocks/FlipClock";

const STYLES: ClockStyle[] = ["digital", "apple", "analog", "neon", "flip"];
const THEMES: ClockTheme[] = ["black", "night", "matrix", "amber", "day"];
const isClockStyle = (v: unknown): v is ClockStyle =>
  STYLES.includes(v as ClockStyle);
const isClockTheme = (v: unknown): v is ClockTheme =>
  THEMES.includes(v as ClockTheme);
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

function BatteryIndicator() {
  const { supported, level, charging } = useBattery();
  if (!supported) return null;

  const pct = Math.round(level * 100);
  const isLow = pct <= 20 && !charging;

  const fillColor = charging ? "#30d158" : isLow ? "#ff3b30" : "var(--fg)";

  return (
    <div className="battery-indicator">
      <div className="battery-icon">
        <div className="battery-body">
          <div
            className="battery-fill"
            style={{ width: `${pct}%`, background: fillColor }}
          />
        </div>
        <div className="battery-nub" />
      </div>
      <span className="battery-pct">
        {charging && (
          <svg
            width="8"
            height="10"
            viewBox="0 0 8 10"
            fill="var(--fg)"
            style={{ marginRight: 1 }}
          >
            <path d="M4.5 0L0 5.5h3L2.5 10 8 4h-3L4.5 0z" />
          </svg>
        )}
        {pct}%
      </span>
    </div>
  );
}

function ClockFace({
  style,
  time,
  showSeconds,
  use24h,
}: {
  style: ClockStyle;
  time: Date;
  showSeconds: boolean;
  use24h: boolean;
}) {
  const props = { time, showSeconds, use24h };
  switch (style) {
    case "digital":
      return <DigitalClock {...props} />;
    case "apple":
      return <AppleClock {...props} />;
    case "analog":
      return <AnalogClock {...props} />;
    case "neon":
      return <NeonClock {...props} />;
    case "flip":
      return <FlipClock {...props} />;
    default:
      return <DigitalClock {...props} />;
  }
}

export default function App() {
  const time = useTime();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const { visible: controlsVisible } = useControlsVisible();
  useWakeLock();

  const [style, setStyle] = useSetting<ClockStyle>("style", "digital", isClockStyle);
  const [theme, setTheme] = useSetting<ClockTheme>("theme", "black", isClockTheme);
  const [showSeconds, setShowSeconds] = useSetting<boolean>("seconds", true, isBoolean);
  const [use24h, setUse24h] = useSetting<boolean>("24h", true, isBoolean);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.background = THEME_COLORS[theme];
  }, [theme]);

  return (
    <div className="app-root" data-theme={theme}>
      <BatteryIndicator />

      <div className="clock-area">
        <ClockFace
          style={style}
          time={time}
          showSeconds={showSeconds}
          use24h={use24h}
        />
      </div>

      <div className={`controls-panel ${controlsVisible ? "visible" : "hidden"}`}>
        <div className="style-row">
          {STYLES.map((s) => (
            <button
              key={s}
              className={`style-btn ${s === style ? "active" : ""}`}
              onClick={() => setStyle(s)}
              aria-label={STYLE_LABELS[s]}
            >
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="settings-row">
          <div className="theme-picker">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`theme-dot ${t === theme ? "active" : ""}`}
                style={{
                  background: THEME_DOT_COLORS[t],
                  borderColor: t === theme ? "var(--fg)" : "transparent",
                }}
                onClick={() => setTheme(t)}
                aria-label={THEME_LABELS[t]}
                title={THEME_LABELS[t]}
              />
            ))}
          </div>

          <div className="divider" />

          <button
            className={`toggle-btn ${!showSeconds ? "active" : ""}`}
            onClick={() => setShowSeconds(!showSeconds)}
            title={showSeconds ? "Скрыть секунды" : "Показать секунды"}
          >
            :SS
          </button>

          <button
            className={`toggle-btn ${!use24h ? "active" : ""}`}
            onClick={() => setUse24h(!use24h)}
            title={use24h ? "Переключить на 12ч" : "Переключить на 24ч"}
          >
            {use24h ? "24H" : "12H"}
          </button>

          <button
            className="toggle-btn icon-btn"
            onClick={toggleFullscreen}
            aria-label={
              isFullscreen ? "Выйти из полного экрана" : "На весь экран"
            }
          >
            {isFullscreen ? (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
