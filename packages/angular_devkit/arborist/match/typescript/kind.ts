/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { languages } from '@angular-devkit/arborist';
import { allOf } from '../boolean';


export function isTypeScript(): languages.typescript.TypeScriptLanguageMatcher {
  return (_node: ts.Node, context: languages.typescript.TypeScriptLanguageMatcherContext) => {
    if (context.language.token !== languages.typescript.TypeScriptLanguageToken) {
      context.skipFile();

      return false;
    }

    return true;
  };
}


export function isKind(kind: ts.SyntaxKind): languages.typescript.TypeScriptLanguageMatcher {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => node.kind === kind,
  );
}
