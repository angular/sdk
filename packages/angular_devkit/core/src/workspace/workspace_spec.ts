/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tap } from 'rxjs/operators';
import { schema } from '..';
import { NodeJsSyncHost } from '../../node';
import { join, normalize } from '../virtual-fs';
import {
  ProjectNotFoundException,
  Workspace,
  WorkspaceNotYetLoadedException,
  projectFilter,
} from './workspace';
import { WorkspaceProject, WorkspaceSchema, WorkspaceTool } from './workspace-schema';

describe('Workspace', () => {
  const host = new NodeJsSyncHost();
  const root = normalize(__dirname);
  // The content of this JSON object should be kept in sync with the path below:
  // tests/@angular_devkit/core/workspace/angular-workspace.json
  const workspaceJson: WorkspaceSchema = {
    version: 1,
    newProjectRoot: './projects',
    defaultProject: 'app',
    cli: {
      '$globalOverride': '${HOME}/.angular-cli.json',
      'schematics': {
        'defaultCollection': '@schematics/angular',
      },
      'warnings': {
        'showDeprecation': false,
      },
    },
    schematics: {
      '@schematics/angular': {
        '*': {
          skipImport: true,
          'packageManager': 'yarn',
        },
        'application': {
          spec: false,
        },
      },
    },
    architect: {},
    projects: {
      app: {
        root: 'projects/app',
        sourceRoot: 'projects/app/src',
        projectType: 'application',
        prefix: 'app',
        cli: {},
        schematics: {
          '@schematics/angular': {
            '*': {
              spec: false,
            },
          },
        },
        architect: {
          build: {
            builder: '@angular-devkit/build-angular:browser',
            transforms: [
              {
                plugin: '@angular-devkit/architect-transforms:replacement',
                file: 'environments/environment.ts',
                configurations: {
                  production: 'environments/environment.prod.ts',
                },
              },
            ],
            options: {
              outputPath: '../dist',
              index: 'index.html',
              main: 'main.ts',
              polyfills: 'polyfills.ts',
              tsConfig: 'tsconfig.app.json',
              progress: false,
            },
            configurations: {
              production: {
                optimize: true,
                outputHashing: 'all',
                sourceMap: false,
                extractCss: true,
                namedChunks: false,
                aot: true,
                extractLicenses: true,
                vendorChunk: false,
                buildOptimizer: true,
              },
            },
          },
        },
      },
      lib: {
        root: 'projects/lib',
        projectType: 'library',
        prefix: 'lib',
        architect: {
          'build': {
            'builder': '@angular-devkit/build-ng-packagr:build',
            'options': {
              'project': 'projects/lib/ng-package.json',
            },
            'configurations': {
              'production': {
                'project': 'projects/lib/ng-package.prod.json',
              },
            },
          },
          test: {
            'builder': '@angular-devkit/build-angular:karma',
            'options': {
              'main': 'projects/lib/src/test.ts',
              'tsConfig': 'projects/lib/tsconfig.spec.json',
              'karmaConfig': 'projects/lib/karma.conf.js',
            },
          },
          lint: {
            'builder': '@angular-devkit/build-angular:tslint',
            'options': {
              'tsConfig': [
                'projects/lib/tsconfig.lint.json',
                'projects/lib/tsconfig.spec.json',
              ],
              'exclude': [
                '**/node_modules/**',
              ],
            },
          },
        },
      },
    },
  };

  const appProject = {
    ...workspaceJson.projects['app'],
    // Tools should not be returned when getting a project.
    cli: {},
    schematics: {},
    architect: {},
  } as {} as WorkspaceProject;

  it('loads workspace from json', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProject('app').root).toEqual(workspaceJson.projects['app'].root)),
    ).subscribe(undefined, done.fail, done);
  });

  it('loads workspace from host', (done) => {
    const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
    const workspaceRoot = join(devkitRoot, 'tests/@angular_devkit/core/workspace');
    const workspace = new Workspace(workspaceRoot, host);
    workspace.loadWorkspaceFromHost(normalize('angular-workspace.json')).pipe(
      tap((ws) => expect(ws.getProject('app').root).toEqual(workspaceJson.projects['app'].root)),
    ).subscribe(undefined, done.fail, done);
  });

  it('errors when workspace fails validation', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson({ foo: 'bar' })
      .subscribe(undefined, (err) => {
        expect(err).toEqual(jasmine.any(schema.SchemaValidationException));
        done();
      }, done.fail);
  });

  it('throws when getting information before workspace is loaded', () => {
    const workspace = new Workspace(root, host);
    expect(() => workspace.version).toThrow(new WorkspaceNotYetLoadedException());
  });

  it('throws when getting workspace tool before workspace is loaded', () => {
    const workspace = new Workspace(root, host);
    expect(() => workspace.getCli()).toThrow(new WorkspaceNotYetLoadedException());
  });

  it('gets workspace root', () => {
    const workspace = new Workspace(root, host);
    expect(workspace.root).toBe(root);
  });

  it('gets workspace host', () => {
    const workspace = new Workspace(root, host);
    expect(workspace.host).toBe(host);
  });

  it('gets workspace version', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.version).toEqual(workspaceJson.version)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace new project root', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.newProjectRoot).toEqual(workspaceJson.newProjectRoot)),
    ).subscribe(undefined, done.fail, done);
  });

  it('lists all project names', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.listProjectNames()).toEqual(['app', 'lib'])),
    ).subscribe(undefined, done.fail, done);
  });

  it('lists project names filtered by project property value', (done) => {
    const workspace = new Workspace(root, host);
    const librariesFilter: projectFilter = (project, name) => project.projectType === 'library';
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.listProjectNames(librariesFilter)).toEqual(['lib'])),
    ).subscribe(undefined, done.fail, done);
  });

  it('lists filtered project names', (done) => {
    const workspace = new Workspace(root, host);
    const nameFilter: projectFilter = (project, name) => name.startsWith('a');
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.listProjectNames(nameFilter)).toEqual(['app'])),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project by name', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProject('app')).toEqual(appProject)),
    ).subscribe(undefined, done.fail, done);
  });

  it('throws on missing project', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(() => ws.getProject('abc')).toThrow(new ProjectNotFoundException('abc'))),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets default project', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getDefaultProjectName()).toEqual('app')),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets default project when there is a single one', (done) => {
    const customWorkspaceJson: WorkspaceSchema = {
      ...workspaceJson,
      defaultProject: undefined,
      projects: { app: {...workspaceJson.projects.app}},
    };
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(customWorkspaceJson).pipe(
      tap((ws) => expect(ws.getDefaultProjectName()).toEqual('app')),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets default project returns null when there is none', (done) => {
    const customWorkspaceJson = { ...workspaceJson, defaultProject: undefined, projects: {} };
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(customWorkspaceJson).pipe(
      tap((ws) => expect(ws.getDefaultProjectName()).toEqual(null)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project by path', (done) => {
    const workspace = new Workspace(root, host);
    const appRoot = normalize(workspaceJson.projects.app.root);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectByPath(appRoot)).toEqual('app')),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets closest project by path', (done) => {
    const app = workspaceJson.projects['app'];
    const anotherAppRoot = join(normalize(app.root), 'folder');
    const customWorkspaceJson = { ...workspaceJson, projects: {
      ...workspaceJson.projects,
      'another-app': { ...app, root: anotherAppRoot},
    } };
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(customWorkspaceJson).pipe(
      tap((ws) => expect(ws.getProjectByPath(anotherAppRoot)).toEqual('another-app')),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace cli', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getCli()).toEqual(workspaceJson.cli as WorkspaceTool)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace schematics', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getSchematics()).toEqual(workspaceJson.schematics as WorkspaceTool)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets workspace architect', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getArchitect()).toEqual(workspaceJson.architect as WorkspaceTool)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project cli', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectCli('app'))
        .toEqual(workspaceJson.projects.app.cli as WorkspaceTool)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project schematics', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectSchematics('app'))
        .toEqual(workspaceJson.projects.app.schematics as WorkspaceTool)),
    ).subscribe(undefined, done.fail, done);
  });

  it('gets project architect', (done) => {
    const workspace = new Workspace(root, host);
    workspace.loadWorkspaceFromJson(workspaceJson).pipe(
      tap((ws) => expect(ws.getProjectArchitect('app'))
        .toEqual(workspaceJson.projects.app.architect as WorkspaceTool)),
    ).subscribe(undefined, done.fail, done);
  });

});
