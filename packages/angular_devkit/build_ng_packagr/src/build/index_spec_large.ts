/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TargetSpecifier } from '@angular-devkit/architect';
import { TestProjectHost, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';


// TODO: replace this with an "it()" macro that's reusable globally.
let linuxOnlyIt: typeof it = it;
if (process.platform.startsWith('win')) {
  linuxOnlyIt = xit;
}

const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
const workspaceRoot = join(devkitRoot, 'tests/@angular_devkit/build_ng_packagr/ng-packaged/');
export const host = new TestProjectHost(workspaceRoot);

export enum Timeout {
  Basic = 30000,
  Standard = Basic * 1.5,
}

describe('NgPackagr Builder', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  linuxOnlyIt('works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'lib', target: 'build' };

    runTargetSpec(host, targetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  linuxOnlyIt('tests works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'lib', target: 'test' };

    runTargetSpec(host, targetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Standard);

  it('lint works', (done) => {
    const targetSpec: TargetSpecifier = { project: 'lib', target: 'lint' };

    runTargetSpec(host, targetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);
});
