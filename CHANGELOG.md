# Changelog

## [1.2.0](https://github.com/cheminfo/pdb.cheminfo.org/compare/v1.1.1...v1.2.0) (2026-08-18)


### Features

* **api:** Fastify HTTP API for ligand substructure search ([3f3b70f](https://github.com/cheminfo/pdb.cheminfo.org/commit/3f3b70fbda55994a800e12fa66ab5fed199d92f2))
* **assembly:** render PNG on demand when pre-rendered file is missing ([8113ab4](https://github.com/cheminfo/pdb.cheminfo.org/commit/8113ab42c1fc9f67097e4f584ad216ff26d7f09d))
* **auth:** protect settings routes with cookie-based authentication ([39eaab9](https://github.com/cheminfo/pdb.cheminfo.org/commit/39eaab9a5d17ae831491bd0411b17307eb6b120c))
* batched first-boot seed with live progress banner ([5c0e60a](https://github.com/cheminfo/pdb.cheminfo.org/commit/5c0e60a875773faf581dffc49a8d1e35d1360fb4))
* **browse:** add SmartFilterBuilder chip UI for smart-sqlite3-filter ([17acc4d](https://github.com/cheminfo/pdb.cheminfo.org/commit/17acc4d30c69a6900cc78f93ba876d80265c3ad3))
* **browse:** click-through filters from Stats, full-width layout, thumbnail toggles, denser tables ([79d36d8](https://github.com/cheminfo/pdb.cheminfo.org/commit/79d36d8947ad8d3ef1e6009edcbe79ddcc980001))
* **browse:** full-screen toggle on the Mol* viewer card ([a12df75](https://github.com/cheminfo/pdb.cheminfo.org/commit/a12df757ad4b6adf2ceb589b0829ee62247dd299))
* **browse:** sort-order selector with seeded random shuffle, reflected in URL ([5beddcb](https://github.com/cheminfo/pdb.cheminfo.org/commit/5beddcb284a4e2923123fa6d2d4a9f3713b75a6d))
* **ccd:** add pdb-api-cron service for weekly CCD refresh ([ba5324d](https://github.com/cheminfo/pdb.cheminfo.org/commit/ba5324dd2122e7d8a9f60511f94fa7e9858bc192))
* **ccd:** persist 'running' rows + /v1/diagnostics endpoint ([dba5732](https://github.com/cheminfo/pdb.cheminfo.org/commit/dba573293f0c1a4776efa93626e515d03ed5c70b))
* **dev:** add pre-rendered PyMol PNG fixtures and point DATA_DIR to fixtures/ ([73b256a](https://github.com/cheminfo/pdb.cheminfo.org/commit/73b256a9072e3be5444e25cb34e00d4a08878e8a))
* **dev:** expose full HTTP API in `npm run dev` and share API endpoints ([ad07ac0](https://github.com/cheminfo/pdb.cheminfo.org/commit/ad07ac0b34f41cde38aea7198e5eb33b2aabce2a))
* **diagnostics:** auto-detect and display an already-running render job on page load ([ee6f498](https://github.com/cheminfo/pdb.cheminfo.org/commit/ee6f49821455fe65c6c37991b309ed41948fec7b))
* **diagnostics:** expose empty-title count, FTS count, and assembly thumbnail probe ([e92b976](https://github.com/cheminfo/pdb.cheminfo.org/commit/e92b9762d3d8b1f1a00ee3e85410b5538987ddb2))
* **diagnostics:** replace 10-entry sample with full scan job and progress bar ([26d8632](https://github.com/cheminfo/pdb.cheminfo.org/commit/26d86325b1da7f081071679a9dc1ca0a227dd4c6))
* **docker:** select the compose mode with COMPOSE_FILE, serve on port 31015 ([f7abedf](https://github.com/cheminfo/pdb.cheminfo.org/commit/f7abedf4e124eae2e9cfd6cbf941138785852134))
* enrich /v1/pdbs search with smart-sqlite3-filter ([35e487d](https://github.com/cheminfo/pdb.cheminfo.org/commit/35e487d55705d95edb2e6441ffa4d54fac030e76))
* fold Omega into Stats; add CCD history & omega rollup ([bcbc926](https://github.com/cheminfo/pdb.cheminfo.org/commit/bcbc926d9014fe55a590c7a6f03fb1cea27c7ab9))
* **frontend:** /molecules tab with substructure search ([99fbeb9](https://github.com/cheminfo/pdb.cheminfo.org/commit/99fbeb994229fb524593a0789a6102c9e6af0c8b))
* **frontend:** add browse and api pages, e2e tests, and favicon ([daa23aa](https://github.com/cheminfo/pdb.cheminfo.org/commit/daa23aa622d9ad8bc89f0312346754aa9373e96b))
* **frontend:** adopt BlueprintJS v6 across the UI ([b3982a4](https://github.com/cheminfo/pdb.cheminfo.org/commit/b3982a4cd78473cd8dd14561a772b4aab3f773d2))
* **frontend:** expand the animate page with Monaco, splitter and floating windows ([71ba413](https://github.com/cheminfo/pdb.cheminfo.org/commit/71ba413674cf4caa3abfab8038119bbf8b0e5692))
* **frontend:** full-height molecules layout with invented 2D coordinates ([10ec43f](https://github.com/cheminfo/pdb.cheminfo.org/commit/10ec43fdc4da58086fc2e9aee0a484beea01b82b))
* **frontend:** migrate homepage to React + Vite + nivo ([513465f](https://github.com/cheminfo/pdb.cheminfo.org/commit/513465f40ac0694985d0f084e625aa7f8e30c782))
* **frontend:** show 2D ligand structures in browse-page table ([532c0c9](https://github.com/cheminfo/pdb.cheminfo.org/commit/532c0c9eee3c0431cf9603c318c631159614482d))
* **frontend:** split total-disk stat into CouchDB and raw archives ([58efa92](https://github.com/cheminfo/pdb.cheminfo.org/commit/58efa926d870d184cd93f7ddf7de12e0635ca0e4))
* **home:** add this-year stat, in-memory dev server, and fix CI test pipeline ([c5c64f2](https://github.com/cheminfo/pdb.cheminfo.org/commit/c5c64f2d49f55852bae21cb8e3936a2ff4c05e5d))
* **home:** redesign home page and add database statistics ([d1337f2](https://github.com/cheminfo/pdb.cheminfo.org/commit/d1337f2f3e65d73567ad4f06ea1750bfe1037699))
* **ingest:** mirror non-water ligand codes into pdb_ligands ([8ac4ca3](https://github.com/cheminfo/pdb.cheminfo.org/commit/8ac4ca38e8189a3f1f97edfcb6d78dd19d82c3ef))
* **legacy:** add /pdb/:id/:filename and assembly pdbsize view routes ([9ddfbfc](https://github.com/cheminfo/pdb.cheminfo.org/commit/9ddfbfc98df76cab17cf467496b9eb4d6e7e8c95))
* make every page indexable by search engines ([24139e3](https://github.com/cheminfo/pdb.cheminfo.org/commit/24139e3092efc26e1042ad530a7c8bab81bdaaf9))
* **molecules:** add similarity and exact ligand search modes ([796652a](https://github.com/cheminfo/pdb.cheminfo.org/commit/796652ab30ae3a6bc6144d58b6f0e090ee789c25))
* **molecules:** cancel superseded searches and show a clear searching state ([7b94f1b](https://github.com/cheminfo/pdb.cheminfo.org/commit/7b94f1b6826871f5aba53a65b115dd4543388b31))
* **molecules:** filter ligands first, with exact totals and sortable columns ([e675887](https://github.com/cheminfo/pdb.cheminfo.org/commit/e6758879165af61887104da2e0a4114f789a3edc))
* omega torsion stats, stats/omega/about pages, and shared chart panels ([658329c](https://github.com/cheminfo/pdb.cheminfo.org/commit/658329c0fd0adbd96f7a18ffd323a27c4e4b0c6b))
* rename Animate page to Scripting and add Browse → Scripting link ([7bc5068](https://github.com/cheminfo/pdb.cheminfo.org/commit/7bc506853f84fa799fae00d294e14d24f8993b8b))
* **scripting:** add per-protein IndexedDB persistence, scene management, revisions, and URL sharing ([a78ff8f](https://github.com/cheminfo/pdb.cheminfo.org/commit/a78ff8f31ab9b3c8a542a8abd15cb9c4cedb1118))
* **scripting:** full-screen viewer toggle (button + ms.fullscreen) ([9dfdbd4](https://github.com/cheminfo/pdb.cheminfo.org/commit/9dfdbd458b8bfc2d8c3e8940a37712ab4b6f3920))
* **scripting:** rewrite the scripting help as a searchable guide ([8bff8ef](https://github.com/cheminfo/pdb.cheminfo.org/commit/8bff8ef9e2ca1e92b5028ccbaa4fe79ed1d11c02))
* server-side filter + keyword search via Mango (drop smart-array-filter) ([b44ac8b](https://github.com/cheminfo/pdb.cheminfo.org/commit/b44ac8b800ff8eab7d96236595f951be82b98798))
* **settings:** add database health card with thumbnail repair ([c09f452](https://github.com/cheminfo/pdb.cheminfo.org/commit/c09f4522822991f78072b2da692a6b4dd90cd64e))
* **settings:** add re-render all thumbnails button to diagnostics card ([f4a0098](https://github.com/cheminfo/pdb.cheminfo.org/commit/f4a009894fff651ed4ba5e52181c7da0b84cb271))
* **settings:** add rebuild-titles job and NMR re-render button to diagnostics card ([2d44329](https://github.com/cheminfo/pdb.cheminfo.org/commit/2d44329ddee3e98847b132193a82ef570e2f4d23))
* take the chrome and the served head from react-cheminfo ([fd47c73](https://github.com/cheminfo/pdb.cheminfo.org/commit/fd47c73e04e2a703417432e5877ba2992b72c1ab))
* wear the cheminfo identity and link the ecosystem ([765d4a1](https://github.com/cheminfo/pdb.cheminfo.org/commit/765d4a15e9696a06654ed500b420663a195ca417))


### Bug Fixes

* **api:** remove /v1/rsync-history from protected paths ([a94ba16](https://github.com/cheminfo/pdb.cheminfo.org/commit/a94ba16e6ab31ed9c0fa4c4742bec6b240671a43))
* **ccd:** batch seed inserts to release lock 1000 rows at a time ([e3f3eab](https://github.com/cheminfo/pdb.cheminfo.org/commit/e3f3eab08751b84852a3728fe44a0208c459d82a))
* **ccd:** self-heal when gz cache is fresh but ligands table is empty ([30839e5](https://github.com/cheminfo/pdb.cheminfo.org/commit/30839e5a0307e66ece1be702e1b8759ffc7c0639))
* **ci:** disable Codecov upload and align E2E mocks with current API ([30bfe20](https://github.com/cheminfo/pdb.cheminfo.org/commit/30bfe20bdfa3841cf61265cc8b8d5a73f5cd2f4e))
* **compose:** use ghcr.io/cheminfo/pdb-quickview image, not docker-pdb ([44a05ab](https://github.com/cheminfo/pdb.cheminfo.org/commit/44a05abd273d2294dacbfbdbf52b23b612a26018))
* **cron:** sleep before first rsync instead of running immediately on restart ([373a3a6](https://github.com/cheminfo/pdb.cheminfo.org/commit/373a3a66af408f6312824610f7fd22eff5b05f6b))
* **db:** rename database file from ligands.db to db.sqlite ([b6a5103](https://github.com/cheminfo/pdb.cheminfo.org/commit/b6a5103b28f3be3cdb6dbf3f4bc0cfc9151a5931))
* **dev:** make `npm run dev` self-contained on port 12346 ([626a64b](https://github.com/cheminfo/pdb.cheminfo.org/commit/626a64bf14cd84ccd08e57957a2501e39c20baa1))
* **docker:** add :z SELinux relabel option to all data volume mounts ([fcffa8a](https://github.com/cheminfo/pdb.cheminfo.org/commit/fcffa8a946d9391a4694e28a1ce9becdf2717a84))
* **docker:** chown pre-existing subdirs that root may have created ([b78761e](https://github.com/cheminfo/pdb.cheminfo.org/commit/b78761e4b7162d53c73939de62a6487d7eb81238))
* **docker:** harden every compose service ([609d1d3](https://github.com/cheminfo/pdb.cheminfo.org/commit/609d1d303e7c1d85c70da730e2bfdd1f81634668))
* **e2e:** update nav selectors from link role to tab role ([5ed0fb9](https://github.com/cheminfo/pdb.cheminfo.org/commit/5ed0fb92b3a050e7cee614bcedaa2d27e403f14d))
* **frontend:** proxy /v1 through Vite dev server ([69dd740](https://github.com/cheminfo/pdb.cheminfo.org/commit/69dd740922a482c5fe64e5933c083316b7978395))
* **home:** refetch stats live during first-boot seed ([44f0b25](https://github.com/cheminfo/pdb.cheminfo.org/commit/44f0b25605bb0aa37820d3e039af85ec449f4b8b))
* keep the family links below the fold ([75a4792](https://github.com/cheminfo/pdb.cheminfo.org/commit/75a4792b2141db685bbf9876a391838f53500bde))
* **legacy:** serve raw assembly file for /assembly/:id/:filename requests ([642429e](https://github.com/cheminfo/pdb.cheminfo.org/commit/642429eb95b50e3d4f359946f2cb291d46d41f8b))
* make `npm run rebuild` actually run ([d7cb803](https://github.com/cheminfo/pdb.cheminfo.org/commit/d7cb803ca132cde91be0975d123f0c1ec5cda335))
* make the analytics id in .env.example a zeroed placeholder ([f0e3508](https://github.com/cheminfo/pdb.cheminfo.org/commit/f0e35089bdda169406b1ebeb8100c7f1ed58c563))
* make the compose files deployable ([6359794](https://github.com/cheminfo/pdb.cheminfo.org/commit/63597946a30e09b02f4f9fd16946ef9b97240215))
* **molecules:** an empty canvas must not run a substructure search ([87b5d2f](https://github.com/cheminfo/pdb.cheminfo.org/commit/87b5d2f2b13f1b4bfd69c92e53586a7f982c0049))
* **molecules:** bound the substructure scan again ([3a45431](https://github.com/cheminfo/pdb.cheminfo.org/commit/3a454312045f34b60b2f19fa209c06735c745439))
* **molecules:** lay out the ligand PDB list as chips ([c93dcae](https://github.com/cheminfo/pdb.cheminfo.org/commit/c93dcaeb6f6e0f5bcf3514ad3827b5be7286904b))
* point the image at the renamed repository ([b870769](https://github.com/cheminfo/pdb.cheminfo.org/commit/b870769da4770ea6bab9baa54af0b8a6898b1eb3))
* **pymol:** add global semaphore and retry to prevent crashes under load ([97fd36e](https://github.com/cheminfo/pdb.cheminfo.org/commit/97fd36eca816059d5d1ea5ee253dc121c87bc0b0))
* **pymol:** default concurrency to CPU core count instead of 32 ([051146b](https://github.com/cheminfo/pdb.cheminfo.org/commit/051146b16e7e5a2f632bfa1fd0f4a024ed568f35))
* **pymol:** move Semaphore class before first use to fix ReferenceError ([3903266](https://github.com/cheminfo/pdb.cheminfo.org/commit/39032662d374367ba837189bf2b8b7cd8bdbfda2))
* **pymol:** remove set all_states and add NMR-only re-render option ([af3ce27](https://github.com/cheminfo/pdb.cheminfo.org/commit/af3ce2767bf947e6226cf4982ca737eb5fad16ae))
* **pymol:** set OMP_NUM_THREADS=1 to prevent thread exhaustion ([f3a3a82](https://github.com/cheminfo/pdb.cheminfo.org/commit/f3a3a82ac10f86a82cca834add7c1b7c37082776))
* **scripting:** clean up the HEC interaction 3.5 Å scene ([e7360a9](https://github.com/cheminfo/pdb.cheminfo.org/commit/e7360a9983bd75e370f9f58ffd0bb52bf8cff37d))
* scroll the page instead of pinning the footer ([2936f4c](https://github.com/cheminfo/pdb.cheminfo.org/commit/2936f4ca65552a29889e82e124052d258a16afef))
* **stats:** put most-abundant bar at the top of every horizontal bar chart ([2dc3238](https://github.com/cheminfo/pdb.cheminfo.org/commit/2dc3238fc3b04c4df6c96732813788a25b6357ca))
* **tests:** await rebuildOmegaStatsRollup in pairFrequency tests ([707243f](https://github.com/cheminfo/pdb.cheminfo.org/commit/707243f28707954f9376f9832d015454ace9de21))
* unblock pdb-api at boot, refresh stale PNGs on rsync, surface render stats ([1686015](https://github.com/cheminfo/pdb.cheminfo.org/commit/16860151b290879e5c2d3aa21abd3c064fa59dac))


### Performance Improvements

* **db:** align SQLite pragmas with reference.cheminfo.org standard ([800079f](https://github.com/cheminfo/pdb.cheminfo.org/commit/800079f5b378d69cdee7acf542524443f446a9bd))
* **docker:** give pdb-api the cores substructure search needs ([2974a16](https://github.com/cheminfo/pdb.cheminfo.org/commit/2974a16fcd1e5414895d4ab06b51e9ce6fc01a61))
* eliminate event-loop blocking in search and import paths ([a070dcf](https://github.com/cheminfo/pdb.cheminfo.org/commit/a070dcfbfd180425501431e976ab16ee45a45302))
* **molecules:** stop the substructure scan at maxResults ([6dfa32e](https://github.com/cheminfo/pdb.cheminfo.org/commit/6dfa32e76a94e8ba1e0ca327d9b4636d4691f33e))
* **pymol:** render bio-assembly PNGs in parallel (PYMOL_CONCURRENCY workers) ([91a237b](https://github.com/cheminfo/pdb.cheminfo.org/commit/91a237b7c7bd3601a02e50075b861e2facb0dac8))
* **stats:** pre-compute helix/sheet/residue rollup tables ([b604bb4](https://github.com/cheminfo/pdb.cheminfo.org/commit/b604bb4f6aeca0b8d57ae0978bfd54a8997967ff))
* **stats:** pre-compute rollup tables and add covering indexes for slow queries ([854bb07](https://github.com/cheminfo/pdb.cheminfo.org/commit/854bb0729b7bdea6e860eb82a0a62a596276a7af))

## [1.1.1](https://github.com/cheminfo/docker-pdb/compare/v1.1.0...v1.1.1) (2026-05-08)


### Bug Fixes

* grant public read access on the pdb databases at init ([a6023d0](https://github.com/cheminfo/docker-pdb/commit/a6023d04c959ee2a7f1269d874ff9e2dceb10c34))

## [1.1.0](https://github.com/cheminfo/docker-pdb/compare/v1.0.1...v1.1.0) (2026-05-08)


### Features

* ingest pdb files into couchdb as soon as they finish downloading ([9ce19cc](https://github.com/cheminfo/docker-pdb/commit/9ce19ccbb04ea5a456ffab7fdc97f840feb852a8))


### Bug Fixes

* **compose:** raise couchdb pids_limit to 4096 ([0146598](https://github.com/cheminfo/docker-pdb/commit/01465989045afb914df35a4a5d1ccc1fcd881e24))
* **docker:** chown bind-mounted /app/data via gosu entrypoint ([fe76c01](https://github.com/cheminfo/docker-pdb/commit/fe76c01778e602b8724a99fb13f3b0fa8555ef3b))
* keep cron loop alive when an update cycle throws ([67a48bd](https://github.com/cheminfo/docker-pdb/commit/67a48bd1cfb0d19a64f0a37e76c4f3f8f09fc2c5))

## [1.0.1](https://github.com/cheminfo/docker-pdb/compare/v1.0.0...v1.0.1) (2026-05-08)


### Bug Fixes

* **ci:** pass tag-version so latest/major/minor tags get published ([e7bce3f](https://github.com/cheminfo/docker-pdb/commit/e7bce3f5121144a4945513dc492b92869894794d))

## [1.0.0](https://github.com/cheminfo/docker-pdb/compare/v0.0.2...v1.0.0) (2026-05-08)


### ⚠ BREAKING CHANGES

* data volume paths changed. Previously the compose files mounted ./couchdb-data, ./pdb-data, ./pdb-assembly-data and ./logs at the repo root. They now all live under a single ./data/ mount, with data/couchdb, data/pdb, data/pdb-assembly and data/logs subfolders. On upgrade, move existing data:

### Features

* add traefik compose  example ([248e8e6](https://github.com/cheminfo/docker-pdb/commit/248e8e6e166cb450ceac8545277828eb1ca2df33))
* align project with current standards ([609245c](https://github.com/cheminfo/docker-pdb/commit/609245c5958c6e37d56179f6f5ccba05b32c1421))
