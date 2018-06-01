/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as NgNewOptions } from './schema';


describe('Ng New Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: NgNewOptions = {
    name: 'foo',
    directory: 'bar',
    version: '6.0.0',
  };

  it('should create files of a workspace', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files.indexOf('/bar/angular.json')).toBeGreaterThanOrEqual(0);
  });

  it('should create files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const files = tree.files;
    expect(files.indexOf('/bar/src/tsconfig.app.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/bar/src/main.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/bar/src/app/app.module.ts')).toBeGreaterThanOrEqual(0);
  });

  it('should should set the prefix in angular.json and in app.component.ts', () => {
    const options = { ...defaultOptions, prefix: 'pre' };

    const tree = schematicRunner.runSchematic('ng-new', options);
    const content = tree.readContent('/bar/angular.json');
    expect(content).toMatch(/"prefix": "pre"/);
  });

  it('should set strict options in tsconfig.json', () => {
    const options = { ...defaultOptions, strict: true };
    const tree = schematicRunner.runSchematic('ng-new', options);
    const tsconfig = JSON.parse(tree.readContent('/bar/tsconfig.json'));

    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitThis).toBe(true);
    expect(tsconfig.compilerOptions.alwaysStrict).toBe(true);
    expect(tsconfig.compilerOptions.strictFunctionTypes).toBe(true);
  });
});
