import { pad, get24Hours } from "../hooks";
import type { ClockFaceProps } from "../types";

export function DigitalClock({ time, showSeconds }: ClockFaceProps) {
  const h = get24Hours(time);

  const timeStr = showSeconds
    ? `${pad(h)}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
    : `${pad(h)}:${pad(time.getMinutes())}`;

  return (
    <div className="clock-face digital-face">
      <div className="digital-time" data-no-seconds={!showSeconds}>
        {timeStr}
      </div>
    </div>
  );
}
