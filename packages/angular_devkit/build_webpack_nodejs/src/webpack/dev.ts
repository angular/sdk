/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as webpack from 'webpack';
import * as nodeExterals from 'webpack-node-externals';
import { BuildOptions } from './common';
import { RealWebpackConfig } from './config';

export function getWebpackDevConfig(options: BuildOptions) {
  const webpackConfig: RealWebpackConfig = {
    devtool: 'eval-source-map',
    externals: [
      nodeExterals({
        whitelist: options.hmr ? [`webpack/hot/poll?${options.hmrPollInterval}`] : [],
      }),
    ],
    plugins: [
      new webpack.NamedModulesPlugin(),
    ],
  };

  return webpackConfig;

}
