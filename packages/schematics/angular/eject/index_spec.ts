/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as EjectOptions } from './schema';


describe('Eject Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: EjectOptions = {
    projectName: 'foo',
  };
  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const appOptions: ApplicationOptions = {
    name: 'foo',
    projectRoot: '',
    skipPackageJson: false,
  };

  let workspaceTree: UnitTestTree;
  beforeEach(() => {
    workspaceTree = schematicRunner.runSchematic('workspace', workspaceOptions);
    workspaceTree = schematicRunner.runSchematic('application', appOptions, workspaceTree);
    // Add a script so we can test that too.
    workspaceTree.overwrite('angular.json', workspaceTree.readContent('angular.json')
      .replace('"scripts": []', '"scripts": ["src/scripts.js"]'));
  });

  it('should create files', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const files = tree.files;
    expect(files.indexOf('/webpack.config.js')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/webpack.config.prod.js')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/webpack.config.factory.js')).toBeGreaterThanOrEqual(0);
  });

  it('should template workspace root', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(`const workspaceRoot = path.resolve(__dirname, './');`);
  });

  it('should template output path', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(tags.trimNewlines`
    output: {
      path: path.resolve(workspaceRoot, 'dist/foo'),
      filename: '[name].js',
    },
    `);
  });

  it('should template entry points', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(tags.trimNewlines`
    entry: {
      main: path.resolve(workspaceRoot, 'src/main.ts'),
      polyfills: path.resolve(workspaceRoot, 'src/polyfills.ts'),
      styles: globalStylesEntryPoints,
    },
    `);
  });

  it('should template index plugin', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(tags.trimNewlines`
      new IndexHtmlWebpackPlugin({
        input: path.resolve(workspaceRoot, 'src/index.html'),
        entrypoints: ['polyfills', 'scripts', 'styles', 'main'],
      }),
    `);
  });

  it('should template styles', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(tags.trimNewlines`
  const globalStylesEntryPoints = [
    path.resolve(workspaceRoot, 'src/styles.css'),
  ];
    `);
  });

  it('should template scripts', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(tags.trimNewlines`
        scripts: [
          path.resolve(workspaceRoot, 'src/scripts.js'),
        ],
    `);
  });

  it('should template assets', () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const fileContent = tree.readContent('/webpack.config.factory.js');
    expect(fileContent).toContain(tags.trimNewlines`
      new CopyWebpackPlugin(
        [{
          context: path.resolve(workspaceRoot, 'src/'),
          to: '',
          from: { glob: 'favicon.ico', dot: true },
        }, {
          context: path.resolve(workspaceRoot, 'src/assets/'),
          to: 'assets/',
          from: { glob: '**/*', dot: true },
        }],
        { ignore: ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'] }
      ),
    `);
  });

  it(`should add packages to package json devDependencies`, () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const packageJson = JSON.parse(tree.readContent('/package.json'));
    expect(packageJson.devDependencies['webpack']).toBeTruthy();
    expect(packageJson.devDependencies['webpack-dev-server']).toBeTruthy();
  });

  it(`should add builders to workspace`, () => {
    const tree = schematicRunner.runSchematic('eject', defaultOptions, workspaceTree);
    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects['foo'].architect['build-webpack']).toEqual({
      builder: '@angular-devkit/build-webpack:webpack',
      options: { webpackConfig: 'webpack.config.js' },
      configurations: {
        production: { webpackConfig: 'webpack.config.prod.js' },
      },
    });
    expect(workspace.projects['foo'].architect['serve-webpack']).toEqual({
      builder: '@angular-devkit/build-webpack:webpack-dev-server',
      options: { webpackConfig: 'webpack.config.js' },
      configurations: {
        production: { webpackConfig: 'webpack.config.prod.js' },
      },
    });
  });
});
