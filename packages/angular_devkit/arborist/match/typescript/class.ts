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


export function decorator(): languages.typescript.TypeScriptLanguageMatcher {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => {
      return node.kind == ts.SyntaxKind.Decorator;
    },
  );
}


export function classDeclaration(
  className?: StringMatcherOptions,
): languages.typescript.TypeScriptLanguageMatcher {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => {
      if (node.kind == ts.SyntaxKind.ClassDeclaration) {
        const declaration = node as ts.ClassDeclaration;
        if (className === undefined) {
          return true;
        } else if (declaration.name === undefined) {
          return false;
        }

        const classNameStr = declaration.name.text;

        return stringMatches(classNameStr, className);
      } else {
        return false;
      }
    },
  );
}
