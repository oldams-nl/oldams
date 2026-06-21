// Shapes of the static JSON produced by scripts/build-data.mjs.

/** public/data/meta.json */
export interface Meta {
  places: number;
  photos: number;
  minYear: number;
  maxYear: number;
}

/**
 * A row in public/data/places.json `places` (array-of-arrays, kept compact):
 *   [id, lng, lat, photoCount, address, years[]]
 */
export type PinRow = [
  id: number,
  lng: number,
  lat: number,
  count: number,
  address: string,
  years: number[],
];

export interface PinIndex {
  minYear: number;
  maxYear: number;
  count: number;
  places: PinRow[];
}

/** A single photo in public/data/place/{id}.json */
export interface Photo {
  id: number;
  guid: string;
  title: string;
  description: string;
  dt: string; // archive date text, e.g. "12 augustus 1954"
  creator: string; // photographer
  subject: string; // address range
  provenance: string; // collection
  year: number;
  width: number;
  height: number;
  src: string; // enclosure filename; build the URL with lib/images.ts
  link: string; // original archive detail page
}

/** public/data/place/{id}.json */
export interface Place {
  id: number;
  address: string;
  lat: number;
  lng: number;
  year_from: number;
  year_to: number;
  photos: Photo[];
}

/** A pin parsed from PinRow for use in app code. */
export interface Pin {
  id: number;
  lng: number;
  lat: number;
  count: number;
  address: string;
  years: number[];
}

export function pinFromRow(r: PinRow): Pin {
  return { id: r[0], lng: r[1], lat: r[2], count: r[3], address: r[4], years: r[5] };
}
