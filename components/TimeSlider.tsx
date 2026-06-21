"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  min: number;
  max: number;
  from: number;
  to: number;
  visibleCount: number;
  onChange: (from: number, to: number) => void;
}

const TICK_MS = 450;

export default function TimeSlider({
  min,
  max,
  from,
  to,
  visibleCount,
  onChange,
}: Props) {
  const [playing, setPlaying] = useState(false);

  // Latest values for the play loop without re-arming the interval each render.
  const latest = useRef({ from, to });
  latest.current = { from, to };

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const { from: f, to: t } = latest.current;
      const width = t - f;
      let nf = f + 1;
      if (nf + width > max) nf = min; // wrap around
      onChange(nf, nf + width);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, min, max, onChange]);

  const span = max - min || 1;
  const leftPct = ((from - min) / span) * 100;
  const rightPct = ((to - min) / span) * 100;

  const setFrom = (v: number) => onChange(Math.min(v, to), to);
  const setTo = (v: number) => onChange(from, Math.max(v, from));

  return (
    <div className="slider" role="group" aria-label="Filter photographs by year">
      <button
        className="play"
        aria-label={playing ? "Pause time travel" : "Play time travel"}
        aria-pressed={playing}
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <div className="slider-body">
        <div className="slider-head">
          <span className="years">
            {from}
            <span className="dash">–</span>
            {to}
          </span>
          <span className="count">{visibleCount.toLocaleString()} locations</span>
        </div>

        <div className="track-wrap">
          <div className="track" />
          <div
            className="track-fill"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={from}
            aria-label="From year"
            onChange={(e) => setFrom(Number(e.target.value))}
            onMouseDown={() => setPlaying(false)}
            onTouchStart={() => setPlaying(false)}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={to}
            aria-label="To year"
            onChange={(e) => setTo(Number(e.target.value))}
            onMouseDown={() => setPlaying(false)}
            onTouchStart={() => setPlaying(false)}
          />
        </div>
      </div>
    </div>
  );
}
