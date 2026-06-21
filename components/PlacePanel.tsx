"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place, Photo } from "@/lib/types";
import { loadPlace } from "@/lib/data";
import { thumbUrl } from "@/lib/images";
import Lightbox from "./Lightbox";

interface Props {
  placeId: number;
  from: number;
  to: number;
  onClose: () => void;
}

export default function PlacePanel({ placeId, from, to, onClose }: Props) {
  const [place, setPlace] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setPlace(null);
    setError(null);
    setLightbox(null);
    setShowAll(false);
    loadPlace(placeId)
      .then((p) => live && setPlace(p))
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [placeId]);

  const inRange = useMemo<Photo[]>(
    () => place?.photos.filter((p) => p.year >= from && p.year <= to) ?? [],
    [place, from, to],
  );

  // Show the in-range photos by default; if none match the selected years, fall
  // back to all so the panel is never empty.
  const usingAll = showAll || inRange.length === 0;
  const shown = usingAll ? (place?.photos ?? []) : inRange;
  const hiddenByYears = (place?.photos.length ?? 0) - inRange.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightbox == null) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightbox]);

  return (
    <aside className="panel" aria-label="Photographs at this location">
      <div className="panel-head">
        <div>
          <h2>{place?.address ?? "…"}</h2>
          {place && (
            <p className="meta">
              {place.photos.length} photograph
              {place.photos.length === 1 ? "" : "s"} · {place.year_from}–
              {place.year_to}
            </p>
          )}
        </div>
        <button className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {error && <p className="panel-error">Couldn’t load this location.</p>}

      {place && inRange.length > 0 && hiddenByYears > 0 && (
        <button className="toggle" onClick={() => setShowAll((v) => !v)}>
          {usingAll
            ? `Showing all years · narrow to ${from}–${to}`
            : `+ ${hiddenByYears} more outside ${from}–${to}`}
        </button>
      )}
      {place && inRange.length === 0 && (
        <p className="note">No photographs in {from}–{to}; showing all years.</p>
      )}

      <div className="grid">
        {shown.map((photo, i) => (
          <button
            key={photo.id}
            className="thumb"
            onClick={() => setLightbox(i)}
            title={photo.title}
          >
            <img
              src={thumbUrl(photo.src)}
              alt={photo.title || place?.address || "Historical photograph"}
              loading="lazy"
              width={photo.width}
              height={photo.height}
            />
            <span className="thumb-year">{photo.year || ""}</span>
          </button>
        ))}
        {!place && !error && <div className="grid-loading">loading…</div>}
      </div>

      {lightbox != null && shown[lightbox] && (
        <Lightbox
          photos={shown}
          index={lightbox}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </aside>
  );
}
