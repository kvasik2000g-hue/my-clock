import { formatDate, pad, getHours } from "../hooks";
import type { ClockFaceProps } from "../types";

export function DigitalClock({ time, showSeconds, use24h }: ClockFaceProps) {
  const { h, ampm } = getHours(time, use24h);

  const timeStr = showSeconds
    ? `${pad(h)}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
    : `${pad(h)}:${pad(time.getMinutes())}`;

  return (
    <div className="clock-face digital-face">
      <div className="digital-time" data-no-seconds={!showSeconds}>
        {timeStr}
        {ampm && <span className="digital-ampm">{ampm}</span>}
      </div>
      <div className="clock-date">{formatDate(time)}</div>
    </div>
  );
}
