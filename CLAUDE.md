# oldams — historical photo map of Amsterdam

A map of Amsterdam where ~38k historical photographs from the **Stadsarchief
Amsterdam** (city archive) are pinned to the addresses where they were taken,
with a time slider to travel through the years (~1828–1999). A modern
re-creation of the original oldams.nl, built with free tools only.

## Guiding constraints (read before changing anything)

- **Free tools only.** No paid APIs, no paid tiles, no managed DB. Hosting is a
  near-zero-cost static site (S3 + CloudFront). The map uses a free, no-API-key
  basemap. Historical images are hot-linked from the archive's public CDN.
- **License is GPL-3.0 (copyleft).** Anyone who copies/redistributes this code
  must open-source their changes. See `LICENSE`. Keep new files compatible.
- **The photographs are not ours.** All images belong to their owners —
  primarily **Stadsarchief Amsterdam** and the named photographers/collections.
  We only link to them; we never re-host or claim them. Every surface that shows
  an image must carry attribution and a link back to the archive.
- **Never commit infrastructure identifiers.** No AWS account IDs, Route 53 zone
  IDs, ARNs containing the account number, IP addresses, or access keys in any
  tracked file. Terraform resolves these at apply time via data sources (look up
  zones by name, `aws_caller_identity`, etc.). CI reads the deploy role ARN from
  a GitHub secret. Local AWS identity lives only under `.aws/` (gitignored).

## Architecture

```
                          build time (local or CI)
  ../oldams-seeds/seeds.rb ──(scripts/import-seeds.mjs)──> data/*.ndjson  (committed)
                                       │
                                       ▼
                         (scripts/build-data.mjs, prebuild)
                                       │
                         public/data/places.json        (all pins: id, lat, lng, year range, count)
                         public/data/place/{id}.json     (one file per place: its photos)   [gitignored]
                                       │
                              next build (output: export)
                                       ▼
                                     out/  ──> S3 (private) ──> CloudFront (OAC) ──> oldams.nl

  runtime (browser)
  CloudFront ──> static HTML/JS + /data/*.json
  <img> ──────> https://images.memorix.nl/ams/thumb/{size}/{uuid}.jpg   (hot-linked, archive CDN)
```

- **Static, read-only.** The dataset never changes at runtime, so there is no
  server and no database in production — just files on S3 behind CloudFront.
- The browser loads the compact **pin index** (`/data/places.json`) once to draw
  the map, then lazy-loads a place's photo list (`/data/place/{id}.json`) when a
  pin is opened.

## Data model

Two entities, derived from the original Rails seeds (`Place.create` /
`Term.create` rows in `../oldams-seeds/seeds.rb`):

- **Place** (~13,967): a physical address. `id, address, lat, lng, year_from,
  year_to`. `year_from/to` is the span of photos known at that spot.
- **Photo** (the seeds call it `Term`, ~38,570): one archive image.
  `id, place_id, guid, title, description, dt` (Dutch date text, e.g.
  "12 augustus 1954"), `creator` (photographer), `subject` (address range),
  `provenance` (collection), `year/year_from/year_to`, `width, height`,
  `enclosure_url` (the image filename), `link` (archive detail page).

### Images (important)

The seed `enclosure_url` (a UUID like `854f…b724.jpg`) maps **directly** to the
live archive CDN — no re-hosting needed:

- Thumbnail (grid): `https://images.memorix.nl/ams/thumb/350x350/{enclosure_url}`
- Detail view:      `https://images.memorix.nl/ams/thumb/1000x1000/{enclosure_url}`
- Only certain preset sizes exist (`350x350`, `1000x1000` are known-good; e.g.
  `800x800` and `full` 404). Don't invent sizes.
- Archive detail page (for "view source" links): the `link` field, and the
  modern canonical page is `https://archief.amsterdam/beeldbank/detail/{guid}`.
- Discovery: the archive OpenSearch API
  (`https://archief.amsterdam/api/opensearch/?q={guid}`) returns the current
  `enclosure` URL for a guid — this is how the mapping above was confirmed.

## Repo layout

```
data/                  canonical, committed, text (NDJSON) — the "sensible" form of the seeds
  places.ndjson        one JSON place per line
  photos.ndjson        one JSON photo per line
scripts/
  import-seeds.mjs      seeds.rb  -> data/*.ndjson   (run manually when seeds change)
  build-data.mjs        data/*.ndjson -> public/data/*  (runs in prebuild / CI)
app/, components/, lib/  Next.js (App Router) static-export frontend
public/                static assets (public/data/ is generated, gitignored)
terraform/             S3 + CloudFront + ACM + Route53 + CI deploy role
.github/workflows/     deploy on push to main
```

## Common commands

```bash
npm install
npm run data:import     # regenerate data/*.ndjson from ../oldams-seeds/seeds.rb
npm run dev             # local dev (runs build-data first)
npm run build           # build-data + next build (static export to out/)
```

## Deploy (AWS)

A near-zero-cost static site: a private S3 bucket served by CloudFront over
Origin Access Control, with ACM (TLS) and Route 53 (DNS). No server, no load
balancer, no database. See `terraform/` for the full picture.

- Remote Terraform state: oldams' own S3 bucket + DynamoDB lock + KMS key
  (isolated names). Bootstrap is two-step (local
  state → `-migrate-state`); see `terraform/README` notes.
- `oldams.nl` is an existing Route 53 hosted zone in this account. Terraform
  looks it up **by name** (never by ID).
- A legacy `oldams` S3 bucket and the current `oldams.nl` DNS records (plain
  A/AAAA to the old site) **predate this project**. We use a new bucket name and
  do not touch the legacy bucket. Pointing `oldams.nl` at the new CloudFront is a
  **DNS cutover** — confirm with the user before `terraform apply` of the records.
- CI authenticates with **GitHub OIDC** assuming a scoped deploy role. The role
  ARN is a GitHub secret (`AWS_DEPLOY_ROLE_ARN`), not committed.

Day-to-day AWS/Terraform uses the `terraform` profile from `.aws/config`
(gitignored). Example:

```bash
export AWS_SHARED_CREDENTIALS_FILE="$PWD/.aws/credentials"
export AWS_CONFIG_FILE="$PWD/.aws/config"
AWS_PROFILE=terraform terraform -chdir=terraform plan
```

## Conventions

- Commit often, in small sequential steps with detailed messages.
- TypeScript + Next.js App Router; keep the client bundle lean (it's a map).
- Keep attribution to Stadsarchief Amsterdam visible wherever images appear.
