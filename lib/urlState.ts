// Shareable deep-link state, kept in the URL query string so a copied link
// restores the same view: which place is open, the selected year range, and the
// map position. Static site, so this is pure client-side history.replaceState
// (no new history entry per change — back button stays usable).

export interface UrlState {
  place?: number | null; // open place id
  from?: number | null; // year range start
  to?: number | null; // year range end
  z?: number | null; // map zoom
  lat?: number | null; // map center
  lng?: number | null;
}

const num = (p: URLSearchParams, k: string): number | undefined => {
  const v = p.get(k);
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function readUrlState(): UrlState {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    place: num(p, "place"),
    from: num(p, "from"),
    to: num(p, "to"),
    z: num(p, "z"),
    lat: num(p, "lat"),
    lng: num(p, "lng"),
  };
}

// Merge a patch into the current URL. Keys set to null/undefined are removed.
export function writeUrlState(patch: UrlState): void {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) p.delete(k);
    else p.set(k, String(v));
  }
  const qs = p.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

export const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
