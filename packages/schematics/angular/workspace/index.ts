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
  Tree,
  apply,
  filter,
  mergeWith,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from './schema';

export default function (options: WorkspaceOptions): Rule {
  return (host: Tree, context: SchematicContext) => {

    return mergeWith(apply(url('./files'), [
      options.editor === 'vscode' ? noop() : filter(path => path.indexOf('vscode') === -1),
      template({
        utils: strings,
        ...options,
        'dot': '.',
        latestVersions,
      }),
    ]))(host, context);
  };
}
