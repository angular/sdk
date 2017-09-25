/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import { normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import 'rxjs/add/operator/merge';
import * as ts from 'typescript';
import * as stringUtils from '../strings';
import { addProviderWithInjectionTokenToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { insertImport } from '../utility/route-utils';
import { Schema as InterceptorOptions } from './schema';


function addDeclarationToNgModule(options: InterceptorOptions): Rule {
  return (host: Tree) => {
    if (!options.module) {
      return host;
    }

    const modulePath = options.module;
    const text = host.read(modulePath);
    if (text === null) {
      throw new SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = text.toString('utf-8');

    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const interceptorPath = `/${options.sourceDir}/${options.path}/`
                          + (options.flat ? '' : stringUtils.dasherize(options.name) + '/')
                          + stringUtils.dasherize(options.name)
                          + '.interceptor';
    const relativePath = buildRelativePath(modulePath, interceptorPath);

    const addToProviders = addProviderWithInjectionTokenToModule(source, modulePath,
      stringUtils.classify(`${options.name}Interceptor`), relativePath,
      { injectionToken: 'HTTP_INTERCEPTORS', multi: true });
    const httpInterceptorsImport = insertImport(source, modulePath,
      'HTTP_INTERCEPTORS',
      '@angular/common');

    const changes = [httpInterceptorsImport, ...addToProviders];

    const recorder = host.beginUpdate(modulePath);
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(recorder);

    return host;
  };
}

export default function (options: InterceptorOptions): Rule {
  options.path = options.path ? normalize(options.path) : options.path;
  const sourceDir = options.sourceDir;
  if (!sourceDir) {
    throw new SchematicsException(`sourceDir option is required.`);
  }

  return (host: Tree, context: SchematicContext) => {
    if (options.module) {
      options.module = findModuleFromOptions(host, options);
    }

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
      template({
        ...stringUtils,
        ...options as object,
      }),
      move(sourceDir),
    ]);

    return chain([
      branchAndMerge(chain([
        addDeclarationToNgModule(options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
