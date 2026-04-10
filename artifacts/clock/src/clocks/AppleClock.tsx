import { pad, get24Hours } from "../hooks";
import type { ClockFaceProps } from "../types";

export function AppleClock({ time, showSeconds }: ClockFaceProps) {
  const h = get24Hours(time);

  return (
    <div className="clock-face apple-face">
      <div className="apple-time">
        <span className="apple-hm" data-no-seconds={!showSeconds}>
          <span className="apple-digit-group">{pad(h)}</span>
          <span className="apple-colon">:</span>
          <span className="apple-digit-group">{pad(time.getMinutes())}</span>
        </span>
        {showSeconds && (
          <span className="apple-sec">
            <span className="apple-digit-group">{pad(time.getSeconds())}</span>
          </span>
        )}
      </div>
    </div>
  );
}
