/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import * as path from 'path';
import { Plugin } from 'webpack';
import { IndexHtmlWebpackPlugin } from '../../plugins/webpack';
import { generateEntryPoints } from '../../utilities/generate-entry-points';
import { WebpackConfigOptions } from '../build-options';
const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');


export function getBrowserConfig(wco: WebpackConfigOptions) {
  const { root, buildOptions } = wco;
  const extraPlugins: Plugin[] = [];
  let sourcemaps: string | false = false;

  if (buildOptions.sourceMap) {
    // See https://webpack.js.org/configuration/devtool/ for sourcemap types.
    if (buildOptions.evalSourceMap && !buildOptions.optimization) {
      // Produce eval sourcemaps for development with serve, which are faster.
      sourcemaps = 'eval';
    } else {
      // Produce full separate sourcemaps for production.
      sourcemaps = 'source-map';
    }
  }

  if (buildOptions.subresourceIntegrity) {
    extraPlugins.push(new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha384'],
    }));
  }

  if (buildOptions.extractLicenses) {
    /**
     * license-webpack-plugin has a peer dependency on webpack-sources, so we list it in a comment
     * to let the dependency validator know it is used.
     *
     * require('webpack-sources')
     */

    extraPlugins.push(new LicenseWebpackPlugin({
      pattern: /.*/,
      suppressErrors: true,
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`,
    }));
  }

  return {
    devtool: sourcemaps,
    resolve: {
      mainFields: [
        ...(wco.supportES2015 ? ['es2015'] : []),
        'browser', 'module', 'main',
      ],
    },
    output: {
      crossOriginLoading: buildOptions.subresourceIntegrity ? 'anonymous' : false,
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        maxAsyncRequests: Infinity,
        cacheGroups: {
          default: buildOptions.commonChunk && {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: buildOptions.commonChunk && {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            enforce: true,
            priority: 5,
          },
          vendors: false,
          vendor: buildOptions.vendorChunk && {
            name: 'vendor',
            chunks: 'initial',
            enforce: true,
            test: (module: { nameForCondition?: Function }, chunks: Array<{ name: string }>) => {
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
    plugins: extraPlugins.concat([
      new IndexHtmlWebpackPlugin({
        input: path.resolve(root, buildOptions.index),
        output: path.basename(buildOptions.index),
        baseHref: buildOptions.baseHref,
        entrypoints: generateEntryPoints(buildOptions),
        deployUrl: buildOptions.deployUrl,
        sri: buildOptions.subresourceIntegrity,
      }),
    ]),
    node: false,
  };
}
