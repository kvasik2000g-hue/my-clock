import { formatDate, pad, getHours } from "../hooks";
import type { ClockFaceProps } from "../types";

export function NeonClock({ time, showSeconds, use24h }: ClockFaceProps) {
  const { h, ampm } = getHours(time, use24h);

  return (
    <div className="clock-face neon-face">
      <div className="neon-time">
        <NeonNumber value={pad(h)} />
        <NeonSep />
        <NeonNumber value={pad(time.getMinutes())} />
        {showSeconds && (
          <>
            <NeonSep small />
            <NeonNumber value={pad(time.getSeconds())} small />
          </>
        )}
        {ampm && <span className="neon-ampm">{ampm}</span>}
      </div>
      <div className="clock-date neon-date">{formatDate(time)}</div>
    </div>
  );
}

function NeonNumber({ value, small }: { value: string; small?: boolean }) {
  return (
    <span className={`neon-digits ${small ? "neon-digits-small" : ""}`}>
      {value}
    </span>
  );
}

function NeonSep({ small }: { small?: boolean }) {
  return (
    <span className={`neon-sep ${small ? "neon-sep-small" : ""}`}>:</span>
  );
}
