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


export function functionCall(
  functionName: StringMatcherOptions,
): languages.typescript.TypeScriptLanguageMatcher {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => {
      if (node.kind == ts.SyntaxKind.CallExpression) {
        const call = node as ts.CallExpression;

        let functionStr = '';
        switch (call.expression.kind) {
          case ts.SyntaxKind.Identifier:
            functionStr = (call.expression as ts.Identifier).text;
            break;

          default:
            return false;
        }

        return stringMatches(functionStr, functionName);
      } else {
        return false;
      }
    },
  );
}
