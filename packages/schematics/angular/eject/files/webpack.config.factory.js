const { AngularCompilerPlugin } = require('@ngtools/webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// The plugins below are loaded from Angular CLI's build system and may change over time.
// If you update @angular-devkit/build-angular and your standalone Webpack build breaks, please
// revert to the last version of @angular-devkit/build-angular you were using.
// You can also replace them with other plugins and loaders that do similar functions.
const {
  CleanCssWebpackPlugin,
  IndexHtmlWebpackPlugin,
  RawCssLoader,
  ScriptsWebpackPlugin,
  postcssPluginsFactory
} = require('@angular-devkit/build-angular/plugins/webpack');


// Build a webpack config based on options.
function webpackConfigFactory(options) {
  // Set option defaults.
  options = {
    sourceMap: true,
    optimize: true,
    ...options,
  };
  const { sourceMap, optimize } = options;

  // Global variables.
  const workspaceRoot = path.resolve(__dirname, '<%= relativePathToWorkspaceRoot %>');
  const projectRoot = path.resolve(__dirname, './');

  // Style configurations.
  const globalStylesEntryPoints = [
<%= stylesTpl %>
  ];
  const componentPostCssLoader = {
    loader: 'postcss-loader',
    options: {
      ident: 'embedded',
      plugins: postcssPluginsFactory({ projectRoot }),
      sourceMap,
    }
  };
  const globalPostCssLoader = {
    loader: 'postcss-loader',
    options: {
      // postcssPluginsFactory contains special logic for 'extracted' ident.
      ident: optimize ? 'extracted' : 'embedded',
      plugins: postcssPluginsFactory({ projectRoot }),
      sourceMap,
    }
  };
  // bootstrap-sass requires a minimum precision of 8
  const sassLoader = { loader: 'sass-loader', options: { sourceMap, precision: 8 } };
  const lessLoader = { loader: 'less-loader', options: { sourceMap } };
  const stylusLoader = { loader: 'stylus-loader', options: { sourceMap } };
  const componentStylesLoaders = ['raw-loader', componentPostCssLoader];
  // Global styles will be extracted when optimizing.
  const globalStylesLoaders = optimize
    ? [MiniCssExtractPlugin.loader, RawCssLoader, globalPostCssLoader]
    : ['style-loader', 'raw-loader', globalPostCssLoader];

  // Return a Webpack configuration object.
  return {
    mode: optimize ? 'production' : 'development',
    devtool: optimize ? false : 'source-map',
    context: projectRoot,
    resolve: {
      extensions: ['.ts', '.js']
    },
    entry: {
      main: path.resolve(workspaceRoot, '<%= main %>'),
      <% if(polyfills) { %>polyfills: path.resolve(workspaceRoot, '<%= polyfills %>'),<% } %>
      styles: globalStylesEntryPoints,
    },
    output: {
      path: path.resolve(workspaceRoot, '<%= outputPath %>'),
      filename: '[name].js',
    },
    optimization: {
      noEmitOnErrors: true,
      runtimeChunk: 'single',
      // Uglify and CleanCSS configuration.
      minimizer: [
        new UglifyJsPlugin({
          sourceMap,
          parallel: true,
          cache: true,
          uglifyOptions: {
            ecma: 5,
            warnings: false,
            safari10: true,
            output: {
              ascii_only: true,
              comments: false,
              webkit: true,
            },
            compress: {
              // Build Optimizer requires pure_getters to be set to true for best results.
              pure_getters: true,
              passes: 3,
            },
          }
        }),
        new CleanCssWebpackPlugin({
          test: (file) => /\.(?:css|scss|sass|less|styl)$/.test(file),
          sourceMap,
        }),
      ],
      // Chunk splitting configuration.
      splitChunks: {
        maxAsyncRequests: Infinity,
        cacheGroups: {
          default: {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            enforce: true,
            priority: 5,
          },
          vendors: false,
          // Disable vendor chunk when optimizing for best results with Build Optimizer.
          vendor: !optimize && {
            name: 'vendor',
            chunks: 'initial',
            enforce: true,
            test: (module, chunks) => {
              if (!module.nameForCondition) {
                return false;
              }

              // Vendor modules are those that have '/node_modules/' in their path and do not
              // contain chunks from either the polyfills or global styles entry points.
              return /[\\/]node_modules[\\/]/.test(module.nameForCondition())
                && !chunks.some(({ name }) => name === 'polyfills' || ['styles'].includes(name));
            },
          },
        },
      },
    },
    module: {
      rules: [
        { test: /\.html$/, loader: 'raw-loader' },
        // AngularCompilerPlugin loader.
        {
          test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
          // require.resolve is required only because of the monorepo structure here.
          loader: require.resolve('@ngtools/webpack')
        },
        // Component styles rules.
        {
          exclude: [globalStylesEntryPoints],
          rules: [
            { test: /\.css$/, use: componentStylesLoaders },
            { test: /\.scss$|\.sass$/, use: [...componentStylesLoaders, sassLoader] },
            { test: /\.less$/, use: [...componentStylesLoaders, lessLoader] },
            { test: /\.styl$/, use: [...componentStylesLoaders, stylusLoader] },
          ]
        },
        // Global styles rules.
        {
          include: [globalStylesEntryPoints],
          rules: [
            { test: /\.css$/, use: globalStylesLoaders },
            { test: /\.scss$|\.sass$/, use: [...globalStylesLoaders, sassLoader] },
            { test: /\.less$/, use: [...globalStylesLoaders, lessLoader] },
            { test: /\.styl$/, use: [...globalStylesLoaders, stylusLoader] },
          ]
        },
        // Mark files inside `@angular/core` as using SystemJS style dynamic imports.
        // Removing this will cause deprecation warnings to appear.
        {
          test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
          parser: { system: true },
        },
        // The Build Optimizer loader is only active when optimizing.
        {
          test: { and: [() => optimize, /\.js$/] },
          // require.resolve is required only because of the monorepo structure here.
          loader: require.resolve('@angular-devkit/build-optimizer/src/build-optimizer/webpack-loader'),
          options: { sourceMap },
        },
      ]
    },
    plugins: [
      // AngularCompilerPlugin compiles TypeScript with Angular AOT support.
      new AngularCompilerPlugin({
        tsConfigPath: path.resolve(workspaceRoot, '<%= tsConfig %>'),
        skipCodeGeneration: !optimize,
        sourceMap,
      }),
      // index.html creation plugin.
      new IndexHtmlWebpackPlugin({
        input: path.resolve(workspaceRoot, '<%= index %>'),
        entrypoints: <%= entryPointsTpl %>,
      }),
      // Asset configuration.
      new CopyWebpackPlugin(
        [<%= assetsTpl %>],
        { ignore: ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'] }
      ),
      // Global scripts configuration.
      new ScriptsWebpackPlugin({
        name: 'scripts',
        sourceMap,
        filename: 'scripts.js',
        // Full paths to scripts to include.
        scripts: [
<%= scriptsTpl %>
        ],
        basePath: workspaceRoot,
      }),
      // Extract CSS into its own file when optimizing.
      new MiniCssExtractPlugin(),
    ],
    // Configuration for webpack-dev-server.
    devServer: {
      historyApiFallback: {
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      },
    }
  };
}

module.exports = webpackConfigFactory;

