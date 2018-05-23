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
import { LoggingCb, defaultLoggingCb } from '../webpack';
import { WebpackDevServerBuilderSchema } from './schema';


export class WebpackDevServerBuilder implements Builder<WebpackDevServerBuilderSchema> {

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
    loggingCb: LoggingCb = defaultLoggingCb,
  ): Observable<BuildEvent> {
    return new Observable(obs => {
      const devServerConfig = devServerCfg || webpackConfig.devServer || {};
      devServerConfig.host = devServerConfig.host || 'localhost';
      devServerConfig.port = devServerConfig.port || 8080;

      if (devServerConfig.stats) {
        webpackConfig.stats = devServerConfig.stats;
      }
      // Disable stats reporting by the devserver, we have our own logger.
      devServerConfig.stats = false;

      const webpackCompiler = webpack(webpackConfig);
      const server = new WebpackDevServer(webpackCompiler, devServerConfig);

      webpackCompiler.hooks.done.tap('build-webpack', (stats: webpack.Stats) => {
        // Log stats.
        loggingCb(stats, webpackConfig, this.context.logger);

        obs.next({ success: !stats.hasErrors() });
      });

      const httpServer = server.listen(
        devServerConfig.port,
        devServerConfig.host,
        (err) => {
          if (err) {
            obs.error(err);
          }
        },
      );

      // Node 8 has a keepAliveTimeout bug which doesn't respect active connections.
      // Connections will end after ~5 seconds (arbitrary), often not letting the full download
      // of large pieces of content, such as a vendor javascript file.  This results in browsers
      // throwing a "net::ERR_CONTENT_LENGTH_MISMATCH" error.
      // https://github.com/angular/angular-cli/issues/7197
      // https://github.com/nodejs/node/issues/13391
      // https://github.com/nodejs/node/commit/2cb6f2b281eb96a7abe16d58af6ebc9ce23d2e96
      if (/^v8.\d.\d+$/.test(process.version)) {
        httpServer.keepAliveTimeout = 30000; // 30 seconds
      }

      // Teardown logic. Close the server when unsubscribed from.
      return () => server.close();
    });
  }
}


export default WebpackDevServerBuilder;
