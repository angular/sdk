/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import * as webpack from 'webpack';
import { Plugin } from 'webpack';
import {
  RawCssLoader,
  SuppressExtractedTextChunksWebpackPlugin,
  postcssPluginsFactory,
} from '../../plugins/webpack';
import { WebpackConfigOptions } from '../build-options';
import { getOutputHashFormat, normalizeExtraEntryPoints } from './utils';

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('style-loader')
 * require('postcss-loader')
 * require('stylus')
 * require('stylus-loader')
 * require('less')
 * require('less-loader')
 * require('node-sass')
 * require('sass-loader')
 */

export function getStylesConfig(wco: WebpackConfigOptions) {
  const { root, projectRoot, buildOptions } = wco;

  // const appRoot = path.resolve(projectRoot, appConfig.root);
  const entryPoints: { [key: string]: string[] } = {};
  const globalStylePaths: string[] = [];
  const extraPlugins: Plugin[] = [];
  const cssSourceMap = buildOptions.sourceMap;

  // Determine hashing format.
  const hashFormat = getOutputHashFormat(wco.buildOptions.outputHashing);

  // Build PostCSS plugins.
  const postCssPlugins = postcssPluginsFactory({
    projectRoot,
    deployUrl: wco.buildOptions.deployUrl,
    baseHref: wco.buildOptions.baseHref,
    outputHashing: buildOptions.outputHashing,
  });

  // use includePaths from appConfig
  const includePaths: string[] = [];
  let lessPathOptions: { paths: string[] } = { paths: [] };

  if (buildOptions.stylePreprocessorOptions
    && buildOptions.stylePreprocessorOptions.includePaths
    && buildOptions.stylePreprocessorOptions.includePaths.length > 0
  ) {
    buildOptions.stylePreprocessorOptions.includePaths.forEach((includePath: string) =>
      includePaths.push(path.resolve(root, includePath)));
    lessPathOptions = {
      paths: includePaths,
    };
  }

  // Process global styles.
  if (buildOptions.styles.length > 0) {
    normalizeExtraEntryPoints(buildOptions.styles, 'styles').forEach(style => {
      const resolvedPath = path.resolve(root, style.input);

      // Add style entry points.
      if (entryPoints[style.bundleName]) {
        entryPoints[style.bundleName].push(resolvedPath);
      } else {
        entryPoints[style.bundleName] = [resolvedPath];
      }

      // Add global css paths.
      globalStylePaths.push(resolvedPath);
    });
  }

  // set base rules to derive final rules from
  const baseRules: webpack.NewUseRule[] = [
    { test: /\.css$/, use: [] },
    {
      test: /\.scss$|\.sass$/, use: [{
        loader: 'sass-loader',
        options: {
          sourceMap: cssSourceMap,
          // bootstrap-sass requires a minimum precision of 8
          precision: 8,
          includePaths,
        },
      }],
    },
    {
      test: /\.less$/, use: [{
        loader: 'less-loader',
        options: {
          sourceMap: cssSourceMap,
          ...lessPathOptions,
        },
      }],
    },
    {
      test: /\.styl$/, use: [{
        loader: 'stylus-loader',
        options: {
          sourceMap: cssSourceMap,
          paths: includePaths,
        },
      }],
    },
  ];

  // load component css as raw strings
  const rules: webpack.Rule[] = baseRules.map(({ test, use }) => ({
    exclude: globalStylePaths, test, use: [
      { loader: 'raw-loader' },
      {
        loader: 'postcss-loader',
        options: {
          ident: 'embedded',
          plugins: postCssPlugins,
          sourceMap: cssSourceMap,
        },
      },
      ...(use as webpack.Loader[]),
    ],
  }));

  // load global css as css files
  if (globalStylePaths.length > 0) {
    rules.push(...baseRules.map(({ test, use }) => {
      return {
        include: globalStylePaths,
        test,
        use: [
          buildOptions.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
          // style-loader still has issues with relative url()'s with sourcemaps enabled;
          // even with the convertToAbsoluteUrls options as it uses 'document.location'
          // which breaks when used with routing.
          // Once style-loader 1.0 is released the following conditional won't be necessary
          // due to this 1.0 PR: https://github.com/webpack-contrib/style-loader/pull/219
          buildOptions.extractCss ? RawCssLoader : 'raw-loader',
          {
            loader: 'postcss-loader',
            options: {
              // postcssPluginsFactory contains special logic for 'extracted' ident.
              ident: buildOptions.extractCss ? 'extracted' : 'embedded',
              plugins: postCssPlugins,
              sourceMap: cssSourceMap,
            },
          },
          ...(use as webpack.Loader[]),
        ],
      };
    }));
  }

  if (buildOptions.extractCss) {
    // extract global css from js files into own css file
    extraPlugins.push(
      new MiniCssExtractPlugin({ filename: `[name]${hashFormat.extract}.css` }));
    // suppress empty .js files in css only entry points
    extraPlugins.push(new SuppressExtractedTextChunksWebpackPlugin());
  }

  return {
    entry: entryPoints,
    module: { rules },
    plugins: extraPlugins,
  };
}
