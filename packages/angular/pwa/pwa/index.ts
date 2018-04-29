/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import { Path, join } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  branchAndMerge,
  chain,
  externalSchematic,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { getWorkspace } from '../utility/config';
import { Schema as PwaOptions } from './schema';


function addServiceWorker(options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Adding service worker...');

    return externalSchematic('@schematics/angular', 'service-worker', options)(host, context);
  };
}

export default function (options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }
    const project = workspace.projects[options.project];
    if (project.projectType !== 'application') {
      throw new SchematicsException(`PWA requires a project type of "application".`);
    }

    const assetPath = join(project.root as Path, 'src', 'assets');

    options.title = options.title || options.project;

    const templateSource = apply(url('./files/assets'), [
      template({
        ...options,
      }),
      move(assetPath),
    ]);

    context.addTask(new NodePackageInstallTask());

    return chain([
      addServiceWorker(options),
      branchAndMerge(chain([
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
