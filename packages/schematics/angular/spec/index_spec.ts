/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as SpecOptions } from './schema';


describe('Spec Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );

  const defaultOptions: SpecOptions = {
    name: '',
    project: 'bar',
  };

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,
  };

  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    appTree = schematicRunner.runSchematic('application', appOptions, appTree);
  });

  function testCreatedSpec(schematic: string, options: any) {
    let tree = schematicRunner.runSchematic(schematic, options, appTree);

    expect(tree.files.includes(`/projects/bar/src/app/foo/foo.${ schematic }.spec.ts`)).toBeFalsy();
    expect(tree.files.includes(`/projects/bar/src/app/foo/foo.${ schematic }.ts`)).toBeTruthy();

    tree = schematicRunner.runSchematic('spec', { ...defaultOptions, name: 'foo/foo.' + schematic }, tree);

    expect(tree.files.includes(`/projects/bar/src/app/foo/foo.${ schematic }.spec.ts`)).toBeTruthy();
    expect(tree.files.includes(`/projects/bar/src/app/foo/foo.${ schematic }.ts`)).toBeTruthy();
  }

  it('should create a spec for module', () => {
    testCreatedSpec('module', {
      name: 'foo',
      spec: false,
      flat: false,
      project: 'bar',
    });
  });

  it('should create a spec for component', () => {
    testCreatedSpec('component', {
      name: 'foo',
      inlineStyle: false,
      inlineTemplate: false,
      changeDetection: 'Default',
      styleext: 'css',
      spec: false,
      export: false,
      project: 'bar',
    });
  });

  it('should create a spec for directive', () => {
    testCreatedSpec('directive', {
      name: 'foo',
      spec: false,
      export: false,
      prefix: 'app',
      flat: false,
      project: 'bar',
    });
  });

  it('should create a spec for service', () => {
    testCreatedSpec('service', {
      name: 'foo',
      spec: false,
      flat: false,
      project: 'bar',
    });
  });

  it('should create a spec for guard', () => {
    testCreatedSpec('guard', {
      name: 'foo/foo', // foo folder here because guard flat parameter is ignored...
      spec: false,
      flat: false,
      project: 'bar',
    });
  });

  it('should create a spec for pipe', () => {
    testCreatedSpec('pipe', {
      name: 'foo',
      spec: false,
      export: false,
      flat: false,
      project: 'bar',
    });
  });

  it('should throw for not allowed types', () => {
    expect(() => schematicRunner.runSchematic('spec', { ...defaultOptions, name: 'foo/foo' }, appTree)).toThrow();
    expect(() => schematicRunner.runSchematic('spec', { ...defaultOptions, name: 'foo/service' }, appTree)).toThrow();
    expect(() => schematicRunner.runSchematic('spec', { ...defaultOptions, name: 'foo/foo.abc' }, appTree)).toThrow();
  });
});
