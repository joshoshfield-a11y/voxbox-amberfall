import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// Player-only build (VoxBox Phase 1b): the Studio build mode is gone
// with the Studio UI. One single-file pass:
//   vite build --mode player  → dist/player.html  (self-contained game runtime / export template)
// emptyOutDir is deliberately false: export.ts auto-builds the player
// bundle when dist/player.html is missing, and wiping dist/ there
// silently deleted the studio build (QA X1). Run `npm run clean`
// for an explicit wipe.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@spec': path.resolve(__dirname, 'src/spec/index.ts'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@blueprints': path.resolve(__dirname, 'src/blueprints'),
      '@generator': path.resolve(__dirname, 'src/generator'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 6000,
    assetsInlineLimit: 100_000_000,
    emptyOutDir: false, // see note above: never wipe the sibling bundle (QA X1)
    rollupOptions: {
      input: path.resolve(__dirname, 'player.html'),
    },
  },
  plugins: [viteSingleFile()],
  server: { port: 5180 },
});
