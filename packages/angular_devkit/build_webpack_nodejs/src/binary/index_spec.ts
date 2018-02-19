/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, TargetSpecifier } from '@angular-devkit/architect';
import { experimental, join, normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { concatMap, take, tap } from 'rxjs/operators';

describe('Nodejs Binary', () => {
  const workspaceFile = normalize('angular.json');
  const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
  const workspaceRoot = join(devkitRoot,
    'tests/@angular_devkit/build_webpack_nodejs/hello-world-app/');

  // TODO: move TestProjectHost from build-angular to architect, or somewhere else, where it
  // can be imported from.
  const host = new NodeJsSyncHost();
  const workspace = new experimental.workspace.Workspace(workspaceRoot, host);

  it('works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'app1', target: 'binary' };

    return workspace.loadWorkspaceFromHost(workspaceFile).pipe(
      concatMap(ws => new Architect(ws).loadArchitect()),
      concatMap(arch => arch.run(arch.getBuilderConfiguration(targetSpec))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
