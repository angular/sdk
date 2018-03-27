/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuildEvent, Builder, BuilderContext, Target } from '@angular-devkit/architect';
import { getSystemPath, normalize, resolve } from '@angular-devkit/core';
import { SpawnOptions, spawn } from 'child_process';
import { Observable } from 'rxjs/Observable';
const treeKill = require('tree-kill');


export interface CommandRunnerOptions {
  command: string;
  args: string[];
  cwd?: string;
}

export class CommandRunner implements Builder<CommandRunnerOptions> {

  constructor(public context: BuilderContext) { }

  run(target: Target<CommandRunnerOptions>): Observable<BuildEvent> {
    return new Observable(obs => {

      // Process options.
      const logger = this.context.logger;
      let command = target.options.command;
      const args = target.options.args;
      const cwd = getSystemPath(resolve(target.root, normalize(target.options.cwd || './')));

      const spawnOptions: SpawnOptions = { cwd };

      if (process.platform.startsWith('win')) {
        args.unshift('/c', command);
        command = 'cmd.exe';
        spawnOptions['stdio'] = 'pipe';
      }

      // Spawn the process.
      const childProcess = spawn(command, args, spawnOptions);

      // Pass output to logger.
      childProcess.stdout.on('data', (data: Buffer) => logger.info(data.toString('utf-8')));
      childProcess.stderr.on('data', (data: Buffer) => logger.error(data.toString('utf-8')));

      // Process event handling.

      // Killing processes cross platform can be hard, treeKill helps.ss
      const killChildProcess = () => {
        if (childProcess && childProcess.pid) {
          treeKill(childProcess.pid, 'SIGTERM');
        }
      };

      // Convert process exit codes and errors into observable events.
      const handleChildProcessExit = (code?: number, error?: Error) => {
        killChildProcess();
        if (error) {
          obs.error(error);
        }
        obs.next({ success: code === 0 });
        obs.complete();
      };
      childProcess.once('exit', handleChildProcessExit);
      childProcess.once('error', (err) => handleChildProcessExit(1, err));

      // Kill the child process when the parent process exits.
      process.once('exit', killChildProcess);

      // Cleanup on unsubscription.
      return () => childProcess.kill();
    });
  }
}

export default CommandRunner;
