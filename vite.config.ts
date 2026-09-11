import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({mode}) => {
  if (mode === 'lib') {
    return {
      build: {
        outDir: 'dist',
        lib: {
          entry: 'elevation-profile.ts',
          formats: ['es'],
          fileName: 'elevation-profile',
        },
        rollupOptions: {
          external: [/^lit/, /^d3-/, /^@lit-labs\/observers/],
        },
      },
      plugins: [dts({include: ['elevation-profile.ts']})],
    };
  }
  return {
    build: {
      outDir: 'build',
    },
  };
});
