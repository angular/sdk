/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { angularHost, basicHost } from '../test-utils';


describe('Webpack Builder basic test', () => {
  describe('basic app', () => {
    const outputPath = normalize('dist');
    const webpackTargetSpec = { project: 'app', target: 'build' };

    beforeEach(done => basicHost.initialize().subscribe(undefined, done.fail, done));
    afterEach(done => basicHost.restore().subscribe(undefined, done.fail, done));

    it('works', (done) => {
      runTargetSpec(basicHost, webpackTargetSpec).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          expect(basicHost.scopedSync().exists(join(outputPath, 'bundle.js'))).toBe(true);
        }),
      ).subscribe(undefined, done.fail, done);
    }, 30000);
  });

  describe('Angular app', () => {
    const outputPath = normalize('dist/foo');
    const webpackTargetSpec = { project: 'app', target: 'build-webpack' };

    beforeEach(done => angularHost.initialize().subscribe(undefined, done.fail, done));
    afterEach(done => angularHost.restore().subscribe(undefined, done.fail, done));

    it('works', (done) => {
      runTargetSpec(angularHost, webpackTargetSpec).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          expect(angularHost.scopedSync().exists(join(outputPath, 'runtime.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'runtime.js.map'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'main.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'polyfills.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'polyfills.js.map'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'styles.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'styles.js.map'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'vendor.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'vendor.js.map'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'favicon.ico'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'index.html'))).toBe(true);
        }),
      ).subscribe(undefined, done.fail, done);
    }, 30000);

    it('works with prod config', (done) => {
      const targetSpec = { ...webpackTargetSpec, configuration: 'production' };
      runTargetSpec(angularHost, targetSpec).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          expect(angularHost.scopedSync().exists(join(outputPath, 'runtime.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'main.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(false);
          expect(angularHost.scopedSync().exists(join(outputPath, 'polyfills.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'styles.css'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'vendor.js'))).toBe(false);
          expect(angularHost.scopedSync().exists(join(outputPath, 'favicon.ico'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'index.html'))).toBe(true);
        }),
      ).subscribe(undefined, done.fail, done);
    }, 60000);
  });
});
