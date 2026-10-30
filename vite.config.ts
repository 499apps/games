import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { kitBuild, kitHtmlPlugin } from './src/kit/vite-kit';

const root = fileURLToPath(new URL('.', import.meta.url));
const kit = kitBuild();

// The hub always uses the hub manifest and the hub service worker, so it never rewrites links.
export default defineConfig({
  base: '/games/',
  plugins: [kitHtmlPlugin({ assembled: false })],
  build: {
    ...kit,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      ...kit.rollupOptions,
      input: {
        hub: `${root}index.html`,
        privacy: `${root}privacy/index.html`,
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
});
