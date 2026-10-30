import { kitPlaywrightConfig } from './src/kit/smoke/projects';

// Hub alone, served by `vite preview` at http://localhost:4173/games/.
export default kitPlaywrightConfig({
  testDir: './e2e',
  testMatch: 'smoke.spec.ts',
  port: 4173,
  serverCommand: 'pnpm exec vite preview --port {port} --strictPort',
  readyPath: '/games/',
});
