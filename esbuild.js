const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2020',
  sourcemap: true,
  external: ['vscode'],
};

if (watch) {
  esbuild
    .context(buildOptions)
    .then((ctx) => ctx.watch())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  esbuild.build(buildOptions).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
