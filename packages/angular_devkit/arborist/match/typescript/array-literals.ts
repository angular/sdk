/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { allOf } from '../boolean';
import { isTypeScript } from './kind';


export function arrayLiteral() {
  return allOf(
    isTypeScript(),
    (node: ts.Node) => {
      return node.kind == ts.SyntaxKind.ArrayLiteralExpression;
    },
  );
}
