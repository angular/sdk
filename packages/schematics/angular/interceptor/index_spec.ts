/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { createAppModule, getFileContent } from '../utility/test';
import { Schema as InterceptorOptions } from './schema';


describe('Interceptor Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: InterceptorOptions = {
    name: 'foo',
    path: 'app',
    sourceDir: 'src',
    spec: true,
    module: undefined,
    flat: true,
  };

  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
  });

  it('should create a interceptor', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('interceptor', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.interceptor.spec.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/src/app/foo.interceptor.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should import into a specified module', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('interceptor', options, appTree);
    const appModule = getFileContent(tree, '/src/app/app.module.ts');

    expect(appModule).toMatch(/import { FooInterceptor } from '.\/foo.interceptor'/);
  });

  it('should fail if specified module does not exist', () => {
    const options = { ...defaultOptions, module: '/src/app/app.moduleXXX.ts' };
    let thrownError: Error | null = null;
    try {
      schematicRunner.runSchematic('interceptor', options, appTree);
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).toBeDefined();
  });

  it('should respect the spec flag', () => {
    const options = { ...defaultOptions, spec: false };

    const tree = schematicRunner.runSchematic('interceptor', options, appTree);
    const files = tree.files;
    expect(files.indexOf('/src/app/foo.interceptor.spec.ts')).toEqual(-1);
    expect(files.indexOf('/src/app/foo.interceptor.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should provide with the module flag', () => {
    const options = { ...defaultOptions, module: 'app.module.ts' };

    const tree = schematicRunner.runSchematic('interceptor', options, appTree);
    const content = getFileContent(tree, '/src/app/app.module.ts');
    expect(content).toMatch(/import.*HTTP_INTERCEPTORS.*from '@angular\/common';/);
    expect(content).toMatch(/import.*FooInterceptor.*from '.\/foo.interceptor';/);
    expect(content)
      .toMatch(
        /providers:\s*\[{ provide: HTTP_INTERCEPTORS, useClass: FooInterceptor, multi: true }\]/m);
  });

  it('should not provide without the module flag', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('interceptor', options, appTree);
    const content = getFileContent(tree, '/src/app/app.module.ts');
    expect(content).not.toMatch(/import.*HTTP_INTERCEPTORS.*from '@angular\/common';/);
    expect(content).not.toMatch(/import.*FooInterceptor.*from '.\/foo.interceptor';/);
    expect(content)
      .not
      .toMatch(
        /providers:\s*\[{ provide: HTTP_INTERCEPTORS, useClass: FooInterceptor, multi: true }\]/m);
  });
});
