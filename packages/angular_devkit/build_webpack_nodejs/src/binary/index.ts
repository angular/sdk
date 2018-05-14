/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuildEvent, Builder, BuilderConfiguration,
   BuilderContext, BuilderDescription } from '@angular-devkit/architect';
import { getSystemPath } from '@angular-devkit/core';
import { ChildProcess, fork } from 'child_process';
import { resolve } from 'path';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, tap } from 'rxjs/operators';
import * as treeKill from 'tree-kill';
import { NodejsBuildBuilderOptions } from '../build';
import { makeOutfileName } from '../utils/make-outfile-name';

export interface BinaryBuilderOptions {
  inspect: boolean;
  args: string[];
  buildTarget: string;
  verbose: boolean;
}

export class BinaryBuilder implements Builder<BinaryBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(target: BuilderConfiguration<BinaryBuilderOptions>): Observable<BuildEvent> {
    const root = getSystemPath(this.context.workspace.root);
    const options = target.options;
    let subProcess: ChildProcess|null = null;

    // TODO: probably need handling of this ChildProcess
    const killProcess: () => Observable<void> = () => {
      return new Observable(obs => {
        if (!subProcess) {
          obs.next();
          obs.complete();
        } else {
          treeKill(subProcess.pid, 'SIGTERM', (err) => {
            if (err) {
              obs.error(err);
            }
            obs.next();
            obs.complete();
        });
        }
      });
    };

    const runProcess = (outfile: string) => {
      return new Observable(obs => {
        subProcess = fork(outfile, [], {
          // TODO: should be configurable to inspecet-brk
          execArgv: options.args.concat(options.inspect ? ['--inspect'] : []),
        });
        obs.next();

        return () => killProcess();
      });
    };

    const restart = () => killProcess().pipe(switchMap(() => runProcess(outfile)));

    const builderConfig = this._getBuildBuilderConfig(options);
    const outFileName = makeOutfileName(builderConfig.options.main);
    const outfile = resolve(root, builderConfig.options.outputPath, outFileName);

    if (builderConfig.options.hmr) {
      // in HMR mode the users handles restarting the process
      // we should only do that on an error
      return this._startBuild(builderConfig).pipe(
        switchMap(() => {
          // only start it if it's never been run
          if (!subProcess) {
            return runProcess(outfile);
          } else {
            return new Observable(obs => obs.next());
          }
        }),
        // if something happens we'll restart it for the user
        catchError(err => {
          // this.context.logger.error('An error occured, restarting process');
          // this.context.logger.error(err);

          return restart();
        }),
        map(() => ({success: true})),
      );
    } else {
      return this._startBuild(builderConfig).pipe(
        // should always ensure the process is killed
        mergeMap(() => restart()),
        map(() => ({success: true})),
      );
    }


  }

  private _startBuild(builderConfig: BuilderConfiguration<NodejsBuildBuilderOptions>) {
    let buildDescription: BuilderDescription;

    return this.context.architect.getBuilderDescription(builderConfig).pipe(
      tap(description => buildDescription = description),
      concatMap(buildDescription => this.context.architect.validateBuilderOptions(
        builderConfig, buildDescription)),
      map(() => this.context.architect.getBuilder(buildDescription, this.context)),
      concatMap(builder => builder.run(builderConfig)),
    );
  }

  private _getBuildBuilderConfig(options: BinaryBuilderOptions) {
    const [project, targetName, configuration] = options.buildTarget.split(':');
    const overrides = { watch: true, verbose: options.verbose };
    const targetSpec = { project, target: targetName, configuration, overrides };

    return this.context.architect.getBuilderConfiguration<NodejsBuildBuilderOptions>(targetSpec);
  }
}


export default BinaryBuilder;
