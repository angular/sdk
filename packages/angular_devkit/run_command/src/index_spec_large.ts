/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Workspace } from '@angular-devkit/architect';
import { logging, normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { concatMap, tap } from 'rxjs/operators';
import { CommandRunnerOptions } from './';


// TODO: TestLogger is duplicated from devkit/build-webpack.
// It should instead be in a common package.
class TestLogger extends logging.Logger {
  private _latestEntries: logging.LogEntry[] = [];
  constructor(name: string, parent: logging.Logger | null = null) {
    super(name, parent);
    this.subscribe((entry) => this._latestEntries.push(entry));
  }

  clear() {
    this._latestEntries = [];
  }

  includes(message: string) {
    return this._latestEntries.some((entry) => entry.message.includes(message));
  }

  test(re: RegExp) {
    return this._latestEntries.some((entry) => re.test(entry.message));
  }
}

describe('Command Runner', () => {
  const host = new NodeJsSyncHost();
  // This dir is fine as root, we're just going to test node binaries.
  const workspaceRoot = normalize(__dirname);
  const architect = new Architect(normalize(workspaceRoot), host);

  const makeWorkspace = (options: CommandRunnerOptions): Workspace => ({
    name: 'spec',
    version: 1,
    root: '',
    defaultProject: 'app',
    projects: {
      app: {
        root: './',
        projectType: 'application',
        defaultTarget: 'command',
        targets: {
          command: {
            builder: `${normalize('../')}:command`,
            options: { ...options as {} },
          },
        },
      },
    },
  });

  it('works', (done) => {
    const logger = new TestLogger('command-runner');
    const options = { command: 'node', args: ['-e', `console.log('hello world');`] };
    architect.loadWorkspaceFromJson(makeWorkspace(options)).pipe(
      concatMap(() => architect.run(architect.getTarget(), { logger })),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('hello world')).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('defaults cwd to project root', (done) => {
    const logger = new TestLogger('command-runner-cwd');
    const options = { command: 'node', args: ['-e', `console.log(process.cwd());`] };
    architect.loadWorkspaceFromJson(makeWorkspace(options)).pipe(
      concatMap(() => architect.run(architect.getTarget(), { logger })),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.test(/src/)).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports changing cwd', (done) => {
    const logger = new TestLogger('command-runner-change-cwd');
    const options = {
      command: 'node',
      args: ['-e', `console.log(process.cwd());`],
      cwd: '../',
    };
    architect.loadWorkspaceFromJson(makeWorkspace(options)).pipe(
      concatMap(() => architect.run(architect.getTarget(), { logger })),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.test(/src/)).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
