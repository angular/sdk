/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { RealWebpackConfig } from './config';

const CircularDependencyPlugin = require('circular-dependency-plugin');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const StatsPlugin = require('stats-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('ts-loader')
 */

// TODO use angular-build ones
export interface BuildOptions {
  progress: boolean;
  statsJson: boolean;
  verbose: boolean;
  extractLicenses: boolean;
}

export function getCommonWebpackConfig(entry: string, outDir: string, tsconfigPath: string,
                                       outfileName: string, buildOptions: BuildOptions) {
  const webpackConfig: RealWebpackConfig = {
    entry: entry,
    mode: 'none',
    output: {
      path: outDir,
      filename: outfileName,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: `ts-loader?configFile=${tsconfigPath}`,
          options: {
            configFile: tsconfigPath,
            transpileOnly: true,
            // https://github.com/TypeStrong/ts-loader/pull/685
            experimentalWatchApi: true,
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {},
    },
    target: 'node',
    node: {
      console: false,
      global: false,
      process: false,
      Buffer: false,
      __filename: false,
      __dirname: false,
    },
    performance: {
      hints: false,
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin({
        tsconfig: tsconfigPath,
        workers: ForkTsCheckerWebpackPlugin.TWO_CPUS_FREE,
      }),
    ],
  };

  const extraPlugins = [];

  if (buildOptions.progress) {
    extraPlugins.push(
      new ProgressPlugin({ profile: buildOptions.verbose, colors: true }));
  }

  if (buildOptions.statsJson) {
    extraPlugins.push(new StatsPlugin('stats.json', 'verbose'));
  }

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new LicenseWebpackPlugin({
      pattern: /.*/,
      suppressErrors: true,
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`,
    }));
  }

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new CircularDependencyPlugin({
      exclude: /[\\\/]node_modules[\\\/]/,
    }));
  }

  webpackConfig.plugins = extraPlugins.concat(webpackConfig.plugins || []);

  return webpackConfig;
}
