#!/usr/bin/env node
// Turn the canonical NDJSON (data/*.ndjson) into the static JSON the browser
// loads. Runs in `prebuild`/`predev` and in CI, so the deploy is self-contained
// from committed data (no seeds.rb needed). Output is gitignored. See CLAUDE.md.
//
//   public/data/meta.json        global stats + year bounds
//   public/data/places.json      compact pin index (loaded once to draw the map)
//   public/data/place/{id}.json  one place's photos (lazy-loaded when a pin opens)
//
// Pin index row layout (array-of-arrays keeps it small):
//   [id, lng, lat, photoCount, address, [distinct years...]]
// The per-place year list lets the time slider filter pins *exactly* (a place
// shows only if it has a photo within the selected window), not just by span.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dataDir = resolve(repoRoot, "data");
const outDir = resolve(repoRoot, "public", "data");
const placeOutDir = resolve(outDir, "place");

const readNdjson = (file) =>
  readFileSync(resolve(dataDir, file), "utf8")
    .split("\n")
    .filter((l) => l.length)
    .map((l) => JSON.parse(l));

// Amsterdam bounding box — drop mis-geocoded places (e.g. id 2647 landed in
// Amsterdam, NY). Faithful data stays in data/*.ndjson; this is display-only.
const inAmsterdam = (p) =>
  p.lat > 52.2 && p.lat < 52.5 && p.lng > 4.6 && p.lng < 5.1;

const round6 = (n) => Math.round(n * 1e6) / 1e6;

const places = readNdjson("places.ndjson");
const photos = readNdjson("photos.ndjson");

// Group photos by place.
const photosByPlace = new Map();
for (const ph of photos) {
  if (!photosByPlace.has(ph.place_id)) photosByPlace.set(ph.place_id, []);
  photosByPlace.get(ph.place_id).push(ph);
}

// Reset output.
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(placeOutDir, { recursive: true });

const index = [];
let minYear = Infinity;
let maxYear = -Infinity;
let droppedNoPhotos = 0;
let droppedOutOfBox = 0;
let writtenPhotos = 0;

for (const place of places) {
  const placePhotos = photosByPlace.get(place.id) ?? [];
  if (placePhotos.length === 0) {
    droppedNoPhotos++;
    continue; // a pin must have at least one photo
  }
  if (!inAmsterdam(place)) {
    droppedOutOfBox++;
    continue;
  }

  // Sort photos chronologically (then by id) for a stable gallery.
  placePhotos.sort((a, b) => (a.year || 0) - (b.year || 0) || a.id - b.id);

  const years = [
    ...new Set(placePhotos.map((p) => p.year).filter((y) => y && y > 0)),
  ].sort((a, b) => a - b);
  for (const y of years) {
    if (y < minYear) minYear = y;
    if (y > maxYear) maxYear = y;
  }

  index.push([
    place.id,
    round6(place.lng),
    round6(place.lat),
    placePhotos.length,
    place.address,
    years,
  ]);

  // Per-place file for the gallery.
  writeFileSync(
    resolve(placeOutDir, `${place.id}.json`),
    JSON.stringify({
      id: place.id,
      address: place.address,
      lat: round6(place.lat),
      lng: round6(place.lng),
      year_from: place.year_from,
      year_to: place.year_to,
      photos: placePhotos.map((p) => ({
        id: p.id,
        guid: p.guid,
        title: p.title,
        description: p.description,
        dt: p.dt,
        creator: p.creator,
        subject: p.subject,
        provenance: p.provenance,
        year: p.year,
        width: p.width,
        height: p.height,
        src: p.enclosure_url, // build full URL client-side (lib/images.ts)
        link: p.link,
      })),
    }),
  );
  writtenPhotos += placePhotos.length;
}

index.sort((a, b) => a[0] - b[0]);

writeFileSync(
  resolve(outDir, "places.json"),
  JSON.stringify({ minYear, maxYear, count: index.length, places: index }),
);

writeFileSync(
  resolve(outDir, "meta.json"),
  JSON.stringify({
    places: index.length,
    photos: writtenPhotos,
    minYear,
    maxYear,
  }),
);

console.log(`pins: ${index.length}  photos: ${writtenPhotos}`);
console.log(`year bounds: ${minYear}-${maxYear}`);
console.log(
  `dropped: ${droppedNoPhotos} places without photos, ${droppedOutOfBox} out-of-bounds`,
);
console.log(`wrote public/data/{meta,places}.json + ${index.length} place files`);
