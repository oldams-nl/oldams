# oldams

A historical photo map of **Amsterdam**: ~38,000 photographs from the city
archive, pinned to the addresses where they were taken, with a time slider to
travel from the 1820s to the 1990s.

Built with free tools only and hosted as a static site — a modern re-creation of
the original [oldams.nl](https://oldams.nl).

## How it works

- A **modern map** (free, no-API-key basemap) shows a pin for every address that
  has historical photos.
- A **time slider** filters pins and photos by year.
- Click a pin to see that location's historical photographs in a gallery.

## The photographs are not ours

All images belong to their owners — primarily
**[Stadsarchief Amsterdam](https://archief.amsterdam/beeldbank/)** (the Amsterdam
City Archive) and the photographers and collections credited on each image. This
project does **not** host or own any photograph; it only links to the archive's
public image service and links back to the original record. Please respect the
archive's terms of use, and contact the rights holders for any reuse of an image.

## Development

See [`CLAUDE.md`](./CLAUDE.md) for architecture, the data pipeline, and
deployment. In short:

```bash
npm install
npm run data:import   # build data/*.ndjson from the seeds (../oldams-seeds)
npm run dev
```

## Data

The address/photo metadata derives from the original oldams seeds
([`oldams-seeds`](https://github.com/viatsko/oldams-seeds)), normalized into
newline-delimited JSON under `data/`.

## License

[GPL-3.0](./LICENSE). This is copyleft: if you copy or redistribute this code
(modified or not), you must release your version under the GPL as well. The
license covers the **code only** — not the photographs, which belong to their
respective owners (see above).
