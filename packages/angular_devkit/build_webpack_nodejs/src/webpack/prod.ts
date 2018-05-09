/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as webpack from 'webpack';
import { RealWebpackConfig } from './config';

export function getWebpackProdConfig() {

  const webpackConfig: RealWebpackConfig = {
    devtool: 'source-map',
    plugins: [
      new webpack.NoEmitOnErrorsPlugin(),
    ],
  };

  return webpackConfig;

}
