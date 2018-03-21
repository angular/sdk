/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
  move,
  schematic,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
  NodePackageLinkTask,
  RepositoryInitializerTask,
} from '@angular-devkit/schematics/tasks';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as NgNewOptions } from './schema';


export default function (options: NgNewOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }

    if (!options.directory) {
      options.directory = options.name;
    }
    let packageTask;
    if (!options.skipInstall) {
      packageTask = context.addTask(new NodePackageInstallTask(options.directory));
      if (options.linkCli) {
        packageTask = context.addTask(
          new NodePackageLinkTask('@angular/cli', options.directory),
          [packageTask],
        );
      }
    }
    if (!options.skipGit) {
      context.addTask(
        new RepositoryInitializerTask(
          options.directory,
          options.commit,
        ),
        packageTask ? [packageTask] : [],
      );
    }

    const workspaceOptions: WorkspaceOptions = {
      name: options.name,
      version: options.version,
      newProjectRoot: options.newProjectRoot || 'projects',
    };
    const applicationOptions: ApplicationOptions = {
      name: options.name,
      inlineStyle: options.inlineStyle,
      inlineTemplate: options.inlineTemplate,
      viewEncapsulation: options.viewEncapsulation,
      routing: options.routing,
      style: options.style,
      skipTests: options.skipTests,
    };

    return chain([
      schematic('workspace', workspaceOptions),
      schematic('application', applicationOptions),
      move(options.directory || options.name),
    ])(host, context);
  };
}
