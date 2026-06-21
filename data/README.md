# data

Canonical, committed, newline-delimited JSON form of the dataset. These two
files are the single source of truth the site is built from; everything served
to the browser (`public/data/`) is regenerated from them.

## Provenance

The address/photo metadata comes from the **original 2015 oldams project** — the
first version of the historical-photo map of Amsterdam, which was built on
**Google Maps**. That project shipped the data as Rails seeds (`Place.create` /
`Term.create` rows). `scripts/import-seeds.rb` converts those seeds into the
NDJSON here.

The photographs themselves are **not** part of this dataset and are **not** ours.
They belong to their owners — primarily **Stadsarchief Amsterdam** (the Amsterdam
City Archive) and the photographers/collections credited per record. We only keep
the metadata and a reference (`enclosure_url`, `guid`, `link`) that lets the site
link to the archive's public images. See the project README for attribution.

## Files

- **`places.ndjson`** — one place per line: `{id, address, lat, lng, year_from,
  year_to}`. 13,967 rows. `year_from/to` is the span of photos at that address.
- **`photos.ndjson`** — one photo per line: `{id, place_id, guid, title,
  description, dt, creator, subject, provenance, year, year_from, year_to,
  width, height, enclosure_url, link}`. 38,570 rows.

Rows are sorted by `id` for stable diffs. Faithful to the source: the build step
(`scripts/build-data.mjs`) is what cleans/filters for display — e.g. one place
(`id 2647`, "Conradstraat 4") was mis-geocoded to Amsterdam, **NY** and is
filtered out there, not here.

## Regenerating

```bash
ruby scripts/import-seeds.rb [path/to/seeds.rb]   # default: ../oldams-seeds/seeds.rb
```
