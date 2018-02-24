/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { getSystemPath, normalize, virtualFs } from '@angular-devkit/core';
import { TempScopedNodeJsSyncHost } from '@angular-devkit/core/node/testing';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Observable, concat } from 'rxjs';
import { catchError } from 'rxjs/operators';

describe('TsLintTaskExecutor', () => {

  it('works with config object', done => {
    const testRunner = new SchematicTestRunner(
      '@_/test',
      path.join(__dirname, 'test/collection.json'),
    );

    const host = new TempScopedNodeJsSyncHost();
    host.write(normalize('/file.ts'), virtualFs.stringToFileBuffer(`
      export function() { console.log(1); }
    `)).subscribe();
    const tree = new UnitTestTree(new HostTree(host));

    testRunner.runSchematicAsync('run-task', null, tree)
      .subscribe(undefined, done.fail, done);
  });

  it('shows errors with config object', done => {
    const testRunner = new SchematicTestRunner(
      '@_/test',
      path.join(__dirname, 'test/collection.json'),
    );

    const host = new TempScopedNodeJsSyncHost();
    host.write(normalize('/file.ts'), virtualFs.stringToFileBuffer(`
      // ${'...MORE_THAN_100'.repeat(10)}
      export function() { console.log(1); }
    `)).subscribe();
    const tree = new UnitTestTree(new HostTree(host));

    const messages: string[] = [];
    let error = false;

    concat(
      testRunner.runSchematicAsync('run-task', null, tree),
      new Observable<void>(obs => {
        process.chdir(getSystemPath(host.root));
        testRunner.logger.subscribe(x => messages.push(x.message));
        testRunner.engine.executePostTasks().subscribe(obs);
      }).pipe(
        catchError(() => {
          error = true;

          return [];
        }),
      ),
      new Observable<void>(obs => {
        expect(messages.find(msg => /\b80\b/.test(msg))).not.toBeUndefined();
        expect(error).toBe(true);

        obs.complete();
      }),
    ).subscribe(undefined, done.fail, done);
  });

  it('supports custom rules in the project (pass)', done => {
    const testRunner = new SchematicTestRunner(
      '@_/test',
      path.join(__dirname, 'test/collection.json'),
    );

    const host = new TempScopedNodeJsSyncHost();
    host.write(normalize('/file.ts'), virtualFs.stringToFileBuffer(`
      console.log('hello world');
    `)).subscribe();
    const tree = new UnitTestTree(new HostTree(host));

    const messages: string[] = [];

    concat(
      testRunner.runSchematicAsync('custom-rule', { shouldPass: true }, tree),
      new Observable<void>(obs => {
        process.chdir(getSystemPath(host.root));
        testRunner.logger.subscribe(x => messages.push(x.message));
        testRunner.engine.executePostTasks().subscribe(obs);
      }),
    ).subscribe(undefined, done.fail, done);
  });

  it('supports custom rules in the project (fail)', done => {
    const testRunner = new SchematicTestRunner(
      '@_/test',
      path.join(__dirname, 'test/collection.json'),
    );

    const host = new TempScopedNodeJsSyncHost();
    host.write(normalize('/file.ts'), virtualFs.stringToFileBuffer(`
      console.log('hello world');
    `)).subscribe();
    const tree = new UnitTestTree(new HostTree(host));

    const messages: string[] = [];
    let error = false;

    concat(
      testRunner.runSchematicAsync('custom-rule', { shouldPass: false }, tree),
      new Observable<void>(obs => {
        process.chdir(getSystemPath(host.root));
        testRunner.logger.subscribe(x => messages.push(x.message));
        testRunner.engine.executePostTasks().subscribe(obs);
      }).pipe(
        catchError(() => {
          error = true;

          return [];
        }),
      ),
      new Observable<void>(obs => {
        expect(messages.find(msg => /\bcustom-rule fail\b/.test(msg))).not.toBeUndefined();
        expect(error).toBe(true);

        obs.complete();
      }),
    ).subscribe(undefined, done.fail, done);
  });

});
