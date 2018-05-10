/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { Path, getSystemPath, normalize, resolve } from '@angular-devkit/core';
import { Observable } from 'rxjs';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import { WebpackDevServerBuilderSchema } from './schema';


export class DevServerBuilder implements Builder<WebpackDevServerBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<WebpackDevServerBuilderSchema>): Observable<BuildEvent> {
    const root = this.context.workspace.root;

    const configPath = resolve(root, normalize(builderConfig.options.webpackConfig));
    const config = this.loadWebpackConfig(getSystemPath(configPath));

    return this.runWebpackDevServer(config);
  }

  public loadWebpackConfig(webpackConfigPath: string): webpack.Configuration {
    return require(webpackConfigPath) as webpack.Configuration;
  }

  public runWebpackDevServer(
    webpackConfig: webpack.Configuration,
    devServerCfg?: WebpackDevServer.Configuration,
  ): Observable<BuildEvent> {
    return new Observable(obs => {
      const devServerConfig = devServerCfg || webpackConfig.devServer || {};
      devServerConfig.host = devServerConfig.host || 'localhost';
      devServerConfig.port = devServerConfig.port || 8080;

      const statsConfig = devServerConfig.stats || webpackConfig.stats;
      // Disable stats reporting by the devserver, we have our own logger.
      devServerConfig.stats = false;

      const webpackCompiler = webpack(webpackConfig);
      const server = new WebpackDevServer(webpackCompiler, devServerConfig);

      webpackCompiler.hooks.done.tap('build-webpack', (stats: webpack.Stats) => {
        this.context.logger.info(stats.toString(statsConfig));

        obs.next({ success: !stats.hasErrors() });
      });

      server.listen(
        devServerConfig.port,
        devServerConfig.host,
        (err) => {
          if (err) {
            obs.error(err);
          }
        },
      );

      // Teardown logic. Close the server when unsubscribed from.
      return () => server.close();
    });
  }
}


export default DevServerBuilder;
