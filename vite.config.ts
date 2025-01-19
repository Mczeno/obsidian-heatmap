import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      name: 'ObsidianHeatmap',
      fileName: 'main'
    },
    rollupOptions: {
      external: ['obsidian'],
      output: {
        globals: {
          obsidian: 'obsidian'
        }
      }
    },
    outDir: './dist',
    emptyOutDir: false
  }
});