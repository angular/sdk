/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { getFirstNgModuleName } from '../utility/ast-utils';
import { getWorkspace } from '../utility/config';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { Schema as ServiceOptions } from './schema';

function getModuleNameFromPath(host: Tree, modulePath: Path) {
  if (!host.exists(modulePath)) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }

  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} cannot be read.`);
  }
  const sourceText = text.toString('utf-8');
  const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

  return getFirstNgModuleName(source);
}

function stripTsExtension(path: string): string {
  if (!path.endsWith('.ts')) {
    throw new SchematicsException(`File ${path} is not a Typescript file.`);
  }

  return path.substr(0, path.length - 3);
}

export default function (options: ServiceOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    let providedByModule = '';
    let providedInPath = '';

    const workspace = getWorkspace(host);
    if (!options.project) {
      options.project = Object.keys(workspace.projects)[0];
    }
    const project = workspace.projects[options.project];

    if (options.path === undefined) {
      options.path = `/${project.root}/src/app`;
    }

    if (options.module) {
      const modulePath = findModuleFromOptions(host, options);
      if (!modulePath || !host.exists(modulePath)) {
        throw new Error('Specified module does not exist');
      }
      providedByModule = getModuleNameFromPath(host, modulePath) || '';

      if (!providedByModule) {
        throw new SchematicsException(`module option did not point to an @NgModule.`);
      }

      const servicePath = `/${options.path}/`
        + (options.flat ? '' : strings.dasherize(options.name) + '/')
        + strings.dasherize(options.name)
        + '.service';

      providedInPath = stripTsExtension(buildRelativePath(servicePath, modulePath));
    }

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
      template({
        ...strings,
        'if-flat': (s: string) => options.flat ? '' : s,
        ...options,
        providedIn: providedByModule,
        providedInPath: providedInPath,
      }),
      move(parsedPath.path),
    ]);

    return mergeWith(templateSource)(host, context);
  };
}
