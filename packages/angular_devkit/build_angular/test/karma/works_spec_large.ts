/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { host, karmaTargetSpec, workspaceRoot } from '../utils';


describe('Karma Builder', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('runs', (done) => {
    runTargetSpec(workspaceRoot, host, karmaTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('fails with broken compilation', (done) => {
    host.writeMultipleFiles({
      'src/app/app.component.spec.ts': '<p> definitely not typescript </p>',
    });
    runTargetSpec(workspaceRoot, host, karmaTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports ES2015 target', (done) => {
    host.replaceInFile('tsconfig.json', '"target": "es5"', '"target": "es2015"');
    runTargetSpec(workspaceRoot, host, karmaTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
