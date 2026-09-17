# pdb.cheminfo.org

A self-hosted, **fast** read-only mirror of the [worldwide Protein Data
Bank](https://www.wwpdb.org/). Every entry is parsed once into SQLite and
rendered once into PyMol thumbnails (100/200/400 px), so structure metadata
and previews are served straight from disk — no on-the-fly rendering, no
upstream lookup.

![Scripting page screenshot](./frontend/scripting-smoke.png)

## What you get

- **Searchable index** — every PDB entry is parsed and indexed by number of
  residues, residue percentages, molecular weight, isoelectric point,
  ligand composition, etc. Free-text title search uses SQLite FTS5;
  ligand substructure search uses an OpenChemLib fingerprint screen
  followed by exact verification.
- **Precomputed thumbnails** — three sizes per entry, rendered once with
  PyMol so the homepage loads instantly.
- **Mirror of the raw files** — both asymmetric units and biological
  assemblies are kept on disk, kept up-to-date by a daily `rsync` against
  `rsync.wwpdb.org`. The raw `.gz` files are the single source of truth:
  the sqlite index can be wiped and rebuilt from them with `npm run
rebuild`, no re-download required.
- **Small React dashboard** — homepage at `/` with database statistics
  and a thumbnail gallery, built from [`frontend/`](./frontend) and baked
  into the `pdb-api` image at build time.

## Architecture

Two core containers, plus a CCD-refresh sidecar, wired together by
`docker compose`:

| Container       | Role                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pdb-api`       | Fastify server: HTTP API (parsed metadata, stats aggregates, raw file streaming, substructure search) **and** the React/Vite homepage SPA, baked into the image at build time |
| `node-pdb-sync` | Daily cron: `rsync` the wwPDB tree, parse new files, render PyMol images, write to sqlite                                                                                     |
| `pdb-api-cron`  | Weekly cron: refreshes `data/sqlite/db.sqlite` from the wwPDB Chemical Component Dictionary                                                                                   |

All persistent state lives in `data/sqlite/db.sqlite` (parsed metadata,
ligand fingerprints, rsync history) plus the rsynced `.gz` archives.

## Deployment

Three compose files are committed, one per deployment mode. Pick one by
setting `COMPOSE_FILE` in `.env` — never by copying files around. With no
`COMPOSE_FILE` set, `docker compose` uses `compose.yaml` (port-published).

```sh
cp .env.example .env
# then uncomment exactly one COMPOSE_FILE=... line in .env
```

By default, every mode pulls the released image
`ghcr.io/cheminfo/pdb.cheminfo.org:latest`. To build the image locally instead,
add `--build`:

```sh
docker compose pull && docker compose up -d        # released image
docker compose up -d --build                       # local build
```

### 1. Local / port-published — `compose.yaml`

Publishes `pdb-api` on `127.0.0.1:${PUBLIC_PORT}`. Open
`http://localhost:${PUBLIC_PORT}` once the database has finished its first
build. This is the default when `COMPOSE_FILE` is unset.

```sh
# .env: COMPOSE_FILE=compose.yaml   (or leave every mode commented out)
docker compose pull && docker compose up -d
```

### 2. Public via Cloudflare Tunnel — `compose.cloudflared.yaml`

No port published on the host; traffic enters via a `cloudflared` sidecar.

In the Cloudflare dashboard (https://dash.cloudflare.com):
**Networking → Tunnels → Create a tunnel → Cloudflared connector** → copy
the token into `.env` as `TUNNEL_TOKEN=...` → open the tunnel →
**Published applications** → add an application with **Service = HTTP**,
**URL = `pdb-api:31015`**, **Public hostname = `pdb.lactame.com`** (or
your chosen hostname).

```sh
# .env: COMPOSE_FILE=compose.cloudflared.yaml
docker compose pull && docker compose up -d
```

### 3. Public via Traefik — `compose.traefik.yaml`

Requires the host to already run a Traefik instance attached to an external
Docker network named `traefik`, with a `websecure` entrypoint and a
`letsencrypt` cert resolver. Adjust the `Host(...)` label to your hostname
(default `pdb.cheminfo.org`).

```sh
# .env: COMPOSE_FILE=compose.traefik.yaml
docker compose pull && docker compose up -d
```

## HTTP API

All endpoints are read-only (`GET`/`HEAD`) and served by the Fastify
backend. Common ones:

| Path                                       | What it returns                                            |
| ------------------------------------------ | ---------------------------------------------------------- |
| `/v1/database/info`                        | Entry counts and decompressed bytes per archive            |
| `/v1/pdbs/{id}`                            | Parsed metadata for entry `{id}` (chains, helices, …)      |
| `/v1/pdbs/{id}/raw`                        | Raw `.pdb` text for entry `{id}` (gunzipped on the fly)    |
| `/v1/assemblies/{id}/raw`                  | Raw `.pdb1` text for the bio-assembly                      |
| `/v1/assemblies/{id}/image/{size}`         | Rendered PyMol thumbnail (`100x100`, `200x200`, `400x400`) |
| `/v1/pdbs?q=...&methods=...&yearMin=...`   | Search parsed metadata (FTS5 title + range filters)        |
| `/v1/stats/{view}`                         | Aggregated statistics (e.g. `byYear`, `aminoAcidFreq`, …)  |
| `/v1/ligands?substructure={idCode}`        | OpenChemLib substructure search over the CCD               |
| `/v1/rsync-history?type=asymUnit&limit=10` | Recent rsync runs                                          |

## Sharing and embedding

Every page is a link, and every link can be framed in a course page or a slide.
The **Share** button in the header builds both, and the addresses it writes are
these:

| Parameter                                                          | What it does                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `?embed` (or `?embed=1`)                                           | Drops the header and the footer, so the tool sits inside your own page |
| `?hide=a,b`                                                        | Switches parts off by name (below); an unknown name is ignored         |
| `?q=`, `?smart=`, `?methods=`, `?yearMin=`, `?yearMax=`, `?order=` | The search the page opens on, as `/browse` writes it                   |

The parts `?hide=` understands, on `/browse`:

| Name          | What hiding it removes                 |
| ------------- | -------------------------------------- |
| `filters`     | The filter sidebar                     |
| `list`        | The entry list                         |
| `viewer`      | The 3D structure and its controls      |
| `annotations` | The ligands, helices and sheets panel  |
| `pdbHeader`   | The archive header under the structure |
| `scripting`   | The _Open in Scripting_ link           |

Hiding a part never disables what it carries: a link that hides the filters
still runs the search it asks for, which is how a course pins a query a visitor
cannot widen.

```html
<iframe
  src="https://pdb.cheminfo.org/browse?q=lactamase&embed=1&hide=filters,list,scripting"
  width="100%"
  height="700"
  style="border: 1px solid #ddd; border-radius: 8px"
  title="pdb.cheminfo.org — one entry"
></iframe>
```

## Persistent data

Everything writable lives under `./data/`:

```
data/
  pdb/                  # rsynced PDB asymmetric units (*.ent.gz)
  pdb-assembly/         # rsynced biological assemblies (*.pdb1.gz)
  pymol/<sub>/<id>/     # PyMol-rendered thumbnails (mirrors RCSB layout)
  sqlite/               # db.sqlite (parsed metadata, fingerprints, rsync history)
  ccd/                  # cached components.cif.gz from wwPDB
  logs/                 # rsync change logs
```

The first sync downloads the entire wwPDB tree and renders every thumbnail
— this can take **days**. Subsequent daily cycles only process the diff.

### Rebuild the database from local files

If the sqlite index ever needs to be regenerated (corruption, schema
upgrade, restoring from a partial backup), wipe `data/sqlite/db.sqlite`
and run:

```sh
docker compose exec node-pdb-sync npm run rebuild
```

This re-parses every `.ent.gz` and `.pdb1.gz` already on disk and rebuilds
all metadata tables. PyMol PNGs that already exist under
`data/pymol/<sub>/<id>/` are reused; missing ones are re-rendered. **No
data is re-downloaded from the wwPDB.**

The cron container also runs this automatically on boot whenever the
sqlite database is empty but the rsync directories already contain files
— so a fresh deploy that inherits a populated `data/` directory does the
right thing without any manual intervention.

## Local development

`npm run dev` runs entirely from Node — no docker, no nginx — so it works
on any machine with Node ≥ 22 installed.

```sh
npm install
cp .env.example .env   # optional for `npm run dev`, which seeds in memory
npm run dev            # in-memory sqlite + Fastify API + Vite dev server
```

Under the hood it:

1. Runs [`backend/src/devServer.js`](./backend/src/devServer.js), which
   creates a fresh **in-memory** sqlite database on every restart — no disk
   writes — and seeds it from [`backend/fixtures/`](./backend/fixtures)
   (falling back to your local rsync tree under `data/pdb/` when present).
2. Starts the Fastify API on `http://localhost:31015` under `node --watch`,
   so backend file changes restart the server with a clean database.
3. Starts the Vite dev server (frontend) on `http://localhost:31016`, which
   proxies every `/v1/...` call to the API:

```sh
curl http://localhost:31015/v1/database/info
curl http://localhost:31015/v1/pdbs/100D
curl 'http://localhost:31015/v1/pdbs?methods=X-RAY+DIFFRACTION&limit=3'
```

The full rsync pipeline and pymol-rendered biological assemblies are
skipped; if you need them locally you will need `pymol`, `graphicsmagick`,
and `rsync`, and should run `npm run cron` (or `npm run rebuild` /
`npm run update`) instead. Tests that depend on `pymol` are skipped
unless `HAS_PYMOL=1` is set.

```sh
npm run test       # tests + type-check + lint + format, for the whole repo
npm run test-only  # vitest with coverage, both workspaces
npm run test-e2e -w frontend  # playwright (needs the API on :31015)
```

To populate `data/sqlite/db.sqlite` on a fresh clone (including `8ZXR` for
the scripting playground), run `npm run dev:seed`. It is idempotent and
reuses the fixtures from `backend/fixtures/pdb/`.

### Frontend-only commands

```sh
cd frontend
npm run build      # type-check + vite build → ../backend/public
npm run test       # vitest with coverage + check-types
```

Lint and format are repo-wide, driven from the root (`npm run eslint`,
`npm run prettier`) by the single [`eslint.config.js`](./eslint.config.js).

`npm run build` writes to `backend/public/` (gitignored — rebuilt by
Docker). The `pdb-api` image is built from [`Dockerfile`](./Dockerfile),
whose first stage runs `vite build` and copies the bundle into
`/app/backend/public`. Fastify serves it from there alongside the JSON
API. To pick up frontend changes on the deploy host:

```sh
git pull && docker compose up -d --build
```

The `--build` flag is what regenerates the bundle — without it, the
existing `pdb-api` image (and its stale `/app/backend/public`) is reused.

To point the Vite dev server at a different backend (e.g. a production
stack on the local network):

```sh
PDB_API_URL=http://127.0.0.1:31015 npm run dev -w frontend
```

Or at a remote stack:

```sh
PDB_API_URL=https://pdb.cheminfo.org npm run dev -w frontend
```

## SELinux

If your host runs SELinux you may need to relabel the project directory so
the bind mounts are accessible from the containers:

```sh
chcon -R -t container_file_t <repo-dir>
```
