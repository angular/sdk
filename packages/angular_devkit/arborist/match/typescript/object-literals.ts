/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Matcher } from '@angular-devkit/arborist';
import * as ts from 'typescript';
import {
  TypeScriptLanguageMatcher,
  TypeScriptLanguageMatcherContext,
} from '../../src/language/typescript';
import { allOf } from '../boolean';
import { StringMatcherOptions, stringMatches } from '../strings';
import { isTypeScript } from './kind';


export function objectLiteral() {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => {
      return node.kind == ts.SyntaxKind.ObjectLiteralExpression;
    },
  );
}


export function objectProperty(
  keyMatches: StringMatcherOptions,
  propertyMatcher?: TypeScriptLanguageMatcher,
): Matcher<ts.SourceFile, ts.Node> {
  return allOf(
    isTypeScript(),
    (node: ts.Node, context: TypeScriptLanguageMatcherContext) => {
      if (node.kind === ts.SyntaxKind.PropertyAssignment) {
        let key = '';
        const property = node as ts.PropertyAssignment;

        switch (property.name.kind) {
          case ts.SyntaxKind.Identifier:
            key = (property.name as ts.Identifier).text;
            break;
          case ts.SyntaxKind.StringLiteral:
            key = (property.name as ts.StringLiteral).text;
            break;

          default:
            return false;
        }

        if (!stringMatches(key, keyMatches)) {
          return false;
        }

        if (propertyMatcher) {
          return propertyMatcher((node as ts.PropertyAssignment).initializer, context);
        } else {
          return true;
        }
      }

      return false;
    },
  );
}
