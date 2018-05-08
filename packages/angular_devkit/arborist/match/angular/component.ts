/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { languages, MatcherContext } from '@angular-devkit/arborist';
import { allOf, any, typescript } from '@angular-devkit/arborist/match';
import { dirname, normalize } from '@angular-devkit/core';
import * as ts from 'typescript';
import { descendants } from '../descendants';
import { record } from '../record';


function _isNgComponentSymbol(
  node: ts.CallExpression,
  context: languages.typescript.TypeScriptLanguageMatcherContext,
) {
  if (!context.source) {
    return false;
  }

  const language = context.language as languages.typescript.TypeScriptLanguage;
  const tc = language.program.getTypeChecker();

  const angularCoreModuleName = language.resolveModuleName('@angular/core', context.source);
  if (!angularCoreModuleName.resolvedModule) {
    return false;
  }
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

  // Assert this is Component. This is Angular specific code because Angular could technically
  // name their declaration anything and re-export it under a different name.
  if (symbol.escapedName != 'Component') {
    return false;
  }

  // Find all declarations (there can be multiple).
  const declarations = symbol.getDeclarations() || [];

  return declarations.some(x => x.getSourceFile().fileName.startsWith(angularCoreRoot));
}


export function component(): languages.typescript.TypeScriptLanguageMatcher {
  return allOf(
    typescript.isTypeScript(),
    descendants(
      typescript.classDeclaration(),
      typescript.decorator(),
      _isNgComponentSymbol,
    ),
  );
}
