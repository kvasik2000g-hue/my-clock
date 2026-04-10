import { useEffect, useRef, useState } from "react";
import { pad, get24Hours } from "../hooks";
import type { ClockFaceProps } from "../types";

function FlipDigit({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevRef = useRef(value);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (value !== prevRef.current) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      setIsFlipping(true);

      const t1 = setTimeout(() => setDisplayValue(value), 160);
      const t2 = setTimeout(() => setIsFlipping(false), 340);
      timersRef.current = [t1, t2];

      prevRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={`flip-digit ${isFlipping ? "flipping" : ""}`}>
      <span className="flip-text">{displayValue}</span>
    </div>
  );
}

function FlipColon({ small }: { small?: boolean }) {
  return (
    <div className={`flip-colon ${small ? "flip-colon-small" : ""}`}>:</div>
  );
}

export function FlipClock({ time, showSeconds }: ClockFaceProps) {
  const h = get24Hours(time);

  const H = pad(h);
  const M = pad(time.getMinutes());
  const S = pad(time.getSeconds());

  return (
    <div className="clock-face flip-face">
      <div className="flip-time" data-no-seconds={!showSeconds}>
        <div className="flip-group">
          <FlipDigit value={H[0]} />
          <FlipDigit value={H[1]} />
        </div>
        <FlipColon />
        <div className="flip-group">
          <FlipDigit value={M[0]} />
          <FlipDigit value={M[1]} />
        </div>
        {showSeconds && (
          <>
            <FlipColon small />
            <div className="flip-group flip-group-small">
              <FlipDigit value={S[0]} />
              <FlipDigit value={S[1]} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
