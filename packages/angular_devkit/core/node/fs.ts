/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';

enum FileErrors {
  NO_FILE_OR_DIR = 'ENOENT',
  NOT_A_DIR = 'ENOTDIR',
}

export function isFile(filePath: string): boolean {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    if (e && (e.code === FileErrors.NO_FILE_OR_DIR || e.code === FileErrors.NOT_A_DIR)) {
      return false;
    }
    throw e;
  }

  return stat.isFile() || stat.isFIFO();
}


export function isDirectory(filePath: string): boolean {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    if (e && (e.code === FileErrors.NO_FILE_OR_DIR || e.code === FileErrors.NOT_A_DIR)) {
      return false;
    }
    throw e;
  }

  return stat.isDirectory();
}
