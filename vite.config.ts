import {defineConfig} from 'vite';

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
    };
  }
  return {
    build: {
      outDir: 'build',
    },
  };
});
