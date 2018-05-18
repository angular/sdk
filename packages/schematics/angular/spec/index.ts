/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  filter,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace } from '../utility/config';
import { parseName } from '../utility/parse-name';
import { Schema as PipeOptions } from './schema';

const supportedTypes = ['component', 'directive', 'guard', 'service', 'pipe', 'module'];

export default function (options: PipeOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    if (!options.project) {
      throw new SchematicsException('Option (project) is required.');
    }
    const project = workspace.projects[options.project];

    if (options.path === undefined) {
      const projectDirName = project.projectType === 'application' ? 'app' : 'lib';
      options.path = `/${project.root}/src/${projectDirName}`;
    }

    const parsedPath = parseName(options.path, options.name);

    const [, name, type] = parsedPath.name.replace(/\.ts$/, '').match(/(.*)\.([^.]+)$/) || [
      null,
      null,
      null,
    ];

    if (!name || !type) {
      throw new SchematicsException(
        'The provided name / file should look like name.type (e.g. component-name.component)'
        + ' or name.type.ts (e.g. component-name.component.ts).',
      );
    }

    if (!supportedTypes.includes(type)) {
      const ex = `The type "${ type }" is not supported. Please use one of [${
        supportedTypes.join(', ')
      }].`;

      throw new SchematicsException(ex);
    }

    options.name = name;
    options.path = parsedPath.path;

    const templateSource = apply(url(`../${type}/files`), [
      filter(path => path.endsWith('.spec.ts')),
      template({
        ...strings,
        'if-flat': () => '',
        ...options,
      }),
      move(parsedPath.path),
    ]);

    return mergeWith(templateSource)(host, context);
  };
}
