/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as webpack from 'webpack';
import { RealWebpackConfig } from './config';


const WELL_KNOWN_NON_BUNDLEABLE_MODULES = [
  'pg',
];

export function getWebpackProdConfig(extraExternals: string[]) {
  const externals = WELL_KNOWN_NON_BUNDLEABLE_MODULES.concat(extraExternals);

  const webpackConfig: RealWebpackConfig = {
    devtool: 'source-map',
    externals: [
      function(context, request, callback: Function) {
        if (externals.includes(request)) {
          // not bundled
          return callback(null, 'commonjs ' + request);
        }
        // bundled
        callback();
      },
    ],
    plugins: [
      new webpack.NoEmitOnErrorsPlugin(),
    ],
  };

  return webpackConfig;

}
