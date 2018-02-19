/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { basename } from 'path';

export function makeOutfileName(path: string) {
  // TODO: should maybe be prefixed wit hthe project name?
  return basename(path).replace('.ts', '.js');
}
