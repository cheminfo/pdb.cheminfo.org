import react from '@vitejs/plugin-react';
import { cheminfoBuildInfo } from 'react-cheminfo/vite';
import { defineConfig } from 'vite';

const backendPort = Number(process.env.PORT ?? 31015);
const devServerPort = Number(process.env.VITE_PORT ?? backendPort + 1);
const apiTarget = process.env.PDB_API_URL ?? `http://localhost:${backendPort}`;
// `/stats/` keeps its slash, as in the backend's API_PREFIXES: `/stats` alone is
// the Stats page, which the dev server has to answer with index.html.
const apiPaths = [
  '/pdb',
  '/assembly',
  '/view',
  '/stats/',
  '/find',
  '/rsync-history',
  '/v1',
];

export default defineConfig({
  // The build carries no mount path. Every asset is written relative, so the
  // one `dist` serves this site's own host and a path of a shared one without
  // being rebuilt: the `<base>` the page carries is what resolves them, and the
  // router reads its mount back off that.
  base: './',
  plugins: [react(), cheminfoBuildInfo()],
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  server: {
    port: devServerPort,
    // Fail loudly instead of drifting to the next free port, which would leave
    // the proxy target, the dev script and the README disagreeing.
    strictPort: true,
    proxy: Object.fromEntries(apiPaths.map((path) => [path, apiTarget])),
  },
});
