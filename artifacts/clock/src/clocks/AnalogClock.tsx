import { formatDate } from "../hooks";
import type { ClockFaceProps } from "../types";

export function AnalogClock({ time, showSeconds }: ClockFaceProps) {
  const secs = time.getSeconds();
  const mins = time.getMinutes();
  const hrs = time.getHours() % 12;

  const secondAngle = secs * 6;
  const minuteAngle = (mins + secs / 60) * 6;
  const hourAngle = (hrs + mins / 60) * 30;

  const markers = Array.from({ length: 60 }, (_, i) => {
    const angle = i * 6;
    const rad = ((angle - 90) * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const outerR = 88;
    const innerR = isHour ? 77 : 84;
    return {
      x1: 100 + innerR * Math.cos(rad),
      y1: 100 + innerR * Math.sin(rad),
      x2: 100 + outerR * Math.cos(rad),
      y2: 100 + outerR * Math.sin(rad),
      isHour,
    };
  });

  return (
    <div className="clock-face analog-face">
      <svg
        className="analog-svg"
        viewBox="0 0 200 200"
        role="img"
        aria-label="Аналоговые часы"
      >
        <circle cx="100" cy="100" r="95" className="analog-bg-circle" />
        <circle cx="100" cy="100" r="90" className="analog-circle" />

        {markers.map((m, i) => (
          <line
            key={i}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            className={`analog-marker ${m.isHour ? "analog-marker-hour" : ""}`}
          />
        ))}

        <line
          x1="100"
          y1="100"
          x2="100"
          y2="55"
          className="analog-hand-hour"
          transform={`rotate(${hourAngle}, 100, 100)`}
        />

        <line
          x1="100"
          y1="100"
          x2="100"
          y2="36"
          className="analog-hand-minute"
          transform={`rotate(${minuteAngle}, 100, 100)`}
        />

        {showSeconds && (
          <g transform={`rotate(${secondAngle}, 100, 100)`}>
            <line
              x1="100"
              y1="118"
              x2="100"
              y2="30"
              className="analog-hand-second"
            />
            <circle cx="100" cy="118" r="3" className="analog-hand-second-tail" />
          </g>
        )}

        <circle cx="100" cy="100" r="5" className="analog-center" />
        <circle cx="100" cy="100" r="2.5" className="analog-center-inner" />
      </svg>
      <div className="clock-date analog-date">{formatDate(time)}</div>
    </div>
  );
}
