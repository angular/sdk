/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { from } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import { host, request, runTargetSpec } from '../utils';


describe('Dev Server Builder', () => {
  const webpackTargetSpec = { project: 'app', target: 'serve' };

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    runTargetSpec(host, webpackTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => from(request('http://localhost:8080/bundle.js'))),
      tap(response => expect(response).toContain(`console.log('hello world')`)),
      take(1),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
