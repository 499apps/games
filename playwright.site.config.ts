import { kitPlaywrightConfig } from './src/kit/smoke/projects';

// The assembled site (`pnpm assemble` writes site/), served at the URL root on 127.0.0.1:4499.
export default kitPlaywrightConfig({
  testDir: './e2e',
  testMatch: 'site.spec.ts',
  port: 4499,
  host: '127.0.0.1',
  serverCommand: 'node src/kit/scripts/static-server.mjs --root site --port {port}',
  readyPath: '/games/',
});
