import type { Meta, Pin, PinIndex, Place } from "./types";
import { pinFromRow } from "./types";

// All data is static under /data (served by CloudFront / next dev). Fetches are
// client-side; the dataset never changes at runtime.

export async function loadMeta(): Promise<Meta> {
  const res = await fetch("/data/meta.json");
  if (!res.ok) throw new Error(`meta.json ${res.status}`);
  return res.json();
}

export async function loadPins(): Promise<{
  pins: Pin[];
  minYear: number;
  maxYear: number;
}> {
  const res = await fetch("/data/places.json");
  if (!res.ok) throw new Error(`places.json ${res.status}`);
  const idx: PinIndex = await res.json();
  return {
    pins: idx.places.map(pinFromRow),
    minYear: idx.minYear,
    maxYear: idx.maxYear,
  };
}

const placeCache = new Map<number, Promise<Place>>();

export function loadPlace(id: number): Promise<Place> {
  let p = placeCache.get(id);
  if (!p) {
    p = fetch(`/data/place/${id}.json`).then((res) => {
      if (!res.ok) throw new Error(`place/${id}.json ${res.status}`);
      return res.json();
    });
    placeCache.set(id, p);
  }
  return p;
}

/** Does a pin have at least one photo within [from, to]? */
export function pinInRange(pin: Pin, from: number, to: number): boolean {
  for (const y of pin.years) if (y >= from && y <= to) return true;
  return false;
}
