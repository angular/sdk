/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import {
    PlatformBootstrapOptions,
    replacePlatformBootstrap,
    replaceBootstrap
} from './replace_bootstrap_helpers';

export function replaceBrowserBootstrap(
  shouldTransform: (fileName: string) => boolean,
  getEntryModule: () => { path: string, className: string } | null,
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {

  const platformOptions: PlatformBootstrapOptions = {
    dynamicPlatformName: 'platformBrowserDynamic',
    staticPlatformName: 'platformBrowser',
    staticPlatformPath: '@angular/platform-browser'
  };

  const replaceFunctions = [
    replacePlatformBootstrap
  ];

  return replaceBootstrap(
    shouldTransform,
    getEntryModule,
    getTypeChecker,
    replaceFunctions,
    platformOptions
  );
}
