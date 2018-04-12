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
import { getSystemPath } from '@angular-devkit/core';
import * as fs from 'fs';
import { resolve } from 'path';
import { Observable } from 'rxjs';
import { map  } from 'rxjs/operators';
import * as webpack from 'webpack';
import { readTsconfig } from '../copy-pasted-files/read-tsconfig';
import { statsErrorsToString, statsToString, statsWarningsToString,
} from '../copy-pasted-files/stats';
import { getWebpackStatsConfig } from '../copy-pasted-files/utils';
import { makeOutfileName } from '../utils/make-outfile-name';
import { getCommonWebpackConfig } from '../webpack/common';
import { getWebpackDevConfig } from '../webpack/dev';
import { getWebpackProdConfig } from '../webpack/prod';
const webpackMerge = require('webpack-merge');

export interface NodejsBuildBuilderOptions {
  main: string;
  outputPath: string;
  tsConfig: string;
  watch: boolean;
  optimization: boolean;
  externals: string[];
  verbose: boolean;

  pathReplacements: {path: string, replaceWith: string}[];

  progress: boolean;
  statsJson: boolean;
  extractLicenses: boolean;
  showCircularDependencies: boolean;
}

export class ServerBuilder implements Builder<NodejsBuildBuilderOptions> {
  constructor(public context: BuilderContext) {}

  run(target: BuilderConfiguration<NodejsBuildBuilderOptions>): Observable<BuildEvent> {
    const root = getSystemPath(this.context.workspace.root);
    const options = target.options;
    const outfileName = makeOutfileName(resolve(root, options.main));

    const absMain = resolve(root, options.main);
    const absOutDir = resolve(root, options.outputPath);
    const absTsConfig = resolve(root, target.options.tsConfig);

// TODO: Should these erros go through the Observable?
    if (!fs.existsSync(absMain)) {
      throw new Error(
`Unable to find entry file
    Relative Path: ${options.main}
    Absolute Path: ${absMain}
`);
    }

    if (!fs.existsSync(absTsConfig)) {
      throw new Error(
`Unable to find tsConfig file
    Relative Path: ${options.tsConfig}
    Absolute Path: ${absTsConfig}
`);
    }

    const commonWebpackConfig = getCommonWebpackConfig(
      absMain, absOutDir, absTsConfig, outfileName, options);
    const prodWebpackConfig = getWebpackProdConfig(options.externals);
    const devWebppackConfig = getWebpackDevConfig();

    const webpackConfig = webpackMerge(
      [commonWebpackConfig].concat(options.optimization ? prodWebpackConfig : devWebppackConfig),
    ) as webpack.Configuration;

    const tsConfig = readTsconfig(absTsConfig);

    if (tsConfig.options.paths) {
      Object.entries(tsConfig.options.paths).forEach(([importPath, values]) => {
        // tslint:disable-next-line:non-null-operator
        values.forEach(value => webpackConfig!.resolve!.alias![importPath] = resolve(root, value));
      });
    }

    if (options.pathReplacements) {
      options.pathReplacements
        // tslint:disable-next-line:non-null-operator
        .forEach(alias => webpackConfig!.resolve!.alias![alias.path] =
          resolve(root, alias.replaceWith));
    }

    const compiler = webpack(webpackConfig);

    return this.startWebpack(options.watch, compiler, options.verbose).pipe(
      map(success => ({success})),
    );
  }

  private startWebpack(watch: boolean, compiler: webpack.Compiler, verbose: boolean) {
    return new Observable<boolean>(obs => {
      const handler = (err: Error, stats: webpack.Stats) => {
        if (err) {
          return obs.error(err);
        }

        const statsConfig = getWebpackStatsConfig(verbose);
        const json = stats.toJson(statsConfig);
        if (verbose) {
          this.context.logger.info(stats.toString(statsConfig));
        } else {
          this.context.logger.info(statsToString(json, statsConfig));
        }

        if (stats.hasWarnings()) {
          this.context.logger.warn(statsWarningsToString(json, statsConfig));
        }
        if (stats.hasErrors()) {
          this.context.logger.error(statsErrorsToString(json, statsConfig));
        }

        obs.next(!stats.hasErrors());
      };

      if (watch) {
        const watching = compiler.watch({}, handler);

        return () => watching.close(() => {});
      } else {
        compiler.run((err, stats ) => {
          handler(err, stats);
          obs.complete();
        });
      }
    });
  }
}

export default ServerBuilder;
