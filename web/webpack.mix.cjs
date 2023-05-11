const mix = require('laravel-mix');
const path = require('path');

mix.browserSync({
  proxy: '0.0.0.0:8081',
  open: false,
})
  .js('resources/js/app.js', 'public/js')
  .vue()
  .version();

mix.webpackConfig({
  resolve: {
    alias: {
      vue$: path.resolve(__dirname, 'node_modules/vue/dist/vue.esm-bundler.js'),
    },
  },
});