/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import {
  Rule,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  normalizePath,
  template,
  url,
} from '@angular-devkit/schematics';
import * as stringUtils from '../strings';
import { Schema as EnumOptions } from './schema';


export default function (options: EnumOptions): Rule {
  options.path = options.path ? normalizePath(options.path) : options.path;

  const templateSource = apply(url('./files'), [
    template({
      ...stringUtils,
      ...options as object,
    }),
    move(options.sourceDir !),
  ]);

  return chain([
    branchAndMerge(chain([
      mergeWith(templateSource),
    ])),
  ]);
}
