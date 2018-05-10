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
import { WebpackBuilderSchema } from './schema';

export class BrowserBuilder implements Builder<WebpackBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<WebpackBuilderSchema>): Observable<BuildEvent> {
    const root = this.context.workspace.root;

    const configPath = resolve(root, normalize(builderConfig.options.webpackConfig));
    const config = this.loadWebpackConfig(getSystemPath(configPath));

    return this.runWebpack(config);
  }

  public loadWebpackConfig(webpackConfigPath: string): webpack.Configuration {
    return require(webpackConfigPath) as webpack.Configuration;
  }

  public runWebpack(config: webpack.Configuration): Observable<BuildEvent> {
    return new Observable(obs => {
      const webpackCompiler = webpack(config);

      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return obs.error(err);
        }

        this.context.logger.info(stats.toString(config.stats));

        if (config.watch) {
          obs.next({ success: !stats.hasErrors() });

          // Never complete on watch mode.
          return;
        } else {
          obs.next({ success: !stats.hasErrors() });
          obs.complete();
        }
      };

      try {
        if (config.watch) {
          const watchOptions = config.watchOptions || {};
          const watching = webpackCompiler.watch(watchOptions, callback);

          // Teardown logic. Close the watcher when unsubscribed from.
          return () => watching.close(() => { });
        } else {
          webpackCompiler.run(callback);
        }
      } catch (err) {
        if (err) {
          this.context.logger.error(
            '\nAn error occured during the build:\n' + ((err && err.stack) || err));
        }
        throw err;
      }
    });
  }
}

export default BrowserBuilder;
