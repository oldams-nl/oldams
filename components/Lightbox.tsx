"use client";

import { useEffect } from "react";
import type { Photo } from "@/lib/types";
import { detailUrl, archiveUrl } from "@/lib/images";

interface Props {
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

export default function Lightbox({ photos, index, onIndex, onClose }: Props) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      else if (e.key === "ArrowRight" && index < photos.length - 1)
        onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndex]);

  if (!photo) return null;

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      {hasPrev && (
        <button
          className="lb-nav lb-prev"
          aria-label="Previous"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index - 1);
          }}
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          className="lb-nav lb-next"
          aria-label="Next"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index + 1);
          }}
        >
          ›
        </button>
      )}

      <figure className="lb-figure" onClick={(e) => e.stopPropagation()}>
        <img
          className="lb-img"
          src={detailUrl(photo.src)}
          alt={photo.title || "Historical photograph of Amsterdam"}
        />
        <figcaption className="lb-caption">
          <div className="lb-title">{photo.title || "Untitled"}</div>
          {photo.description && <p className="lb-desc">{photo.description}</p>}
          <dl className="lb-meta">
            {photo.dt && (
              <>
                <dt>Date</dt>
                <dd>{photo.dt}</dd>
              </>
            )}
            {photo.creator && (
              <>
                <dt>By</dt>
                <dd>{photo.creator}</dd>
              </>
            )}
            {photo.provenance && (
              <>
                <dt>Collection</dt>
                <dd>{photo.provenance}</dd>
              </>
            )}
          </dl>
          <div className="lb-foot">
            <span className="lb-counter">
              {index + 1} / {photos.length}
            </span>
            <a
              href={archiveUrl(photo.link, photo.guid)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View at Stadsarchief Amsterdam ↗
            </a>
          </div>
          <p className="lb-rights">
            © Stadsarchief Amsterdam &amp; the rights holder — not affiliated with
            this site.
          </p>
        </figcaption>
      </figure>
    </div>
  );
}
