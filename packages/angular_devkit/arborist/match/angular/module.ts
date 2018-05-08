/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { languages } from '@angular-devkit/arborist';
import { allOf, typescript } from '@angular-devkit/arborist/match';
import { dirname, normalize } from '@angular-devkit/core';
import * as ts from 'typescript';
import { descendants } from '../descendants';
import { record } from '../record';


function _isNgModuleSymbol(
  node: ts.CallExpression,
  context: languages.typescript.TypeScriptLanguageMatcherContext,
) {
  if (!context.source) {
    return false;
  }

  const language = context.language as languages.typescript.TypeScriptLanguage;
  const tc = language.program.getTypeChecker();

  const angularCoreModuleName = language.resolveModuleName('@angular/core', context.source);
  const angularCoreRoot = dirname(normalize(angularCoreModuleName.resolvedModule.resolvedFileName));

  if (!angularCoreModuleName.resolvedModule) {
    return false;
  }

  let symbol: ts.Symbol = tc.getSymbolAtLocation(node.expression);

  if (!symbol) {
    return false;
  }

  // Resolve the symbol back to its declaration.
  while (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = tc.getAliasedSymbol(symbol);
  }

  // Assert this is NgModule. This is Angular specific code because Angular could technically
  // name their declaration anything and re-export it under a different name.
  if (symbol.escapedName != 'NgModule') {
    return false;
  }

  // Find all declarations (there can be multiple).
  const declarations = symbol.getDeclarations() || [];

  if (declarations.some(x => x.getSourceFile().fileName.startsWith(angularCoreRoot))) {
    return true;
  }

  return false;
}


export function module(): languages.typescript.TypeScriptLanguageMatcher {
  return descendants(
    typescript.classDeclaration(),
    typescript.decorator(),
    allOf(
      typescript.isKind(ts.SyntaxKind.CallExpression),
      _isNgModuleSymbol,
    ),
    (node: ts.CallExpression, context: any) => {
      context.next(context.arborist.createMatchFromNode(node.parent.parent.parent, context));
      return false;
    },
  );
}
