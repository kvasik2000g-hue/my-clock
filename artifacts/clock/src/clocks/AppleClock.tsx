import { formatDate, pad, getHours } from "../hooks";
import type { ClockFaceProps } from "../types";

export function AppleClock({ time, showSeconds, use24h }: ClockFaceProps) {
  const { h, ampm } = getHours(time, use24h);

  return (
    <div className="clock-face apple-face">
      <div className="apple-time">
        <span className="apple-hm" data-no-seconds={!showSeconds}>
          {pad(h)}:{pad(time.getMinutes())}
        </span>
        {showSeconds && (
          <span className="apple-sec">{pad(time.getSeconds())}</span>
        )}
      </div>
      {ampm && <div className="apple-ampm">{ampm}</div>}
      <div className="clock-date apple-date">{formatDate(time)}</div>
    </div>
  );
}
