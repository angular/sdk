/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {addDeclarationToModule} from '../utility/ast-utils';
import {InsertChange} from '../utility/change';

import {
  Rule,
  Tree,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  normalizePath,
  template,
  url,
} from '@angular-devkit/schematics';
import * as stringUtils from '../strings';

import * as ts from 'typescript';
import 'rxjs/add/operator/merge';


function addDeclarationToNgModule(options: any): Rule {
  return (host: Tree) => {
    if (options.skipImport) {
      return host;
    }

    let closestModule = options.sourceDir + '/' + options.path;
    const allFiles = host.files;

    let modulePath: string | null = null;
    const moduleRe = /\.module\.ts$/;
    while (closestModule) {
      const normalizedRoot = normalizePath(closestModule);
      const matches = allFiles.filter(p => moduleRe.test(p) && p.startsWith(normalizedRoot));

      if (matches.length == 1) {
        modulePath = matches[0];
        break;
      } else if (matches.length > 1) {
        throw new Error('More than one module matches. Use skipImport option to skip importing '
          + 'the component into the closest module.');
      }
      closestModule = closestModule.split('/').slice(0, -1).join('/');
    }

    if (!modulePath) {
      throw new Error('Could not find an NgModule for the new component. Use the skipImport '
        + 'option to skip importing components in NgModule.');
    }

    const sourceText = host.read(modulePath) !.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const componentModule = '.' + options.path + '/'
                          + (options.flat ? stringUtils.dasherize(options.name) + '/' : '')
                          + stringUtils.dasherize(options.name)
                          + '.component';
    const changes = addDeclarationToModule(source, modulePath,
                                           stringUtils.classify(options.name),
                                           componentModule);
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


export default function(options: any): Rule {
  const templateSource = apply(url('./files'), [
    options.spec ? noop() : filter(path => !path.endsWith('.spec.ts')),
    options.inlineStyle ? filter(path => !path.endsWith('.__styleext__')) : noop(),
    options.inlineTemplate ? filter(path => !path.endsWith('.html')) : noop(),
    template({
      ...stringUtils,
      'if-flat': (s: string) => options.flat ? '' : s,
      ...options
    }),
    move(options.sourceDir)
  ]);

  return chain([
    branchAndMerge(chain([
      filter(path => path.endsWith('.module.ts') && !path.endsWith('-routing.module.ts')),
      addDeclarationToNgModule(options),
      mergeWith(templateSource)
    ]))
  ]);
}
