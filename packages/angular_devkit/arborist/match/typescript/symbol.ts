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
import { StringMatcherOptions, stringMatches } from '../strings';
import { isTypeScript } from './kind';


export function symbolName(
  options: StringMatcherOptions,
): languages.typescript.TypeScriptLanguageMatcher {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => {
      let id: ts.Identifier | null = null;

      if (node.kind == ts.SyntaxKind.Identifier) {
        id = node as ts.Identifier;
      } else {
        const maybeNamedNode = node as { name?: ts.Node };
        if (maybeNamedNode.name && maybeNamedNode.name.kind == ts.SyntaxKind.Identifier) {
          id = maybeNamedNode.name as ts.Identifier;
        }
      }

      if (!id) {
        return false;
      }

      return stringMatches(id.text, options);
    },
  );
}
