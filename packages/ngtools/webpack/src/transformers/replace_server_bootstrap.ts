/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, relative } from 'path';
import * as ts from 'typescript';
import { collectDeepNodes } from './ast_helpers';
import { insertStarImport } from './insert_import';
import { ReplaceNodeOperation, StandardTransform, TransformOperation } from './interfaces';
import { makeTransform } from './make_transform';
import {
  PlatformBootstrapOptions,
  replaceBootstrap,
  replacePlatformBootstrap
} from './replace_bootstrap_helpers';

export function replaceServerBootstrap(
  shouldTransform: (fileName: string) => boolean,
  getEntryModule: () => { path: string, className: string } | null,
  getTypeChecker: () => ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {

  const platformOptions: PlatformBootstrapOptions = {
    dynamicPlatformName: 'platformDynamicServer',
    staticPlatformName: 'platformServer',
    staticPlatformPath: '@angular/platform-server',
  };

  const replaceFunctions = [
    replacePlatformBootstrap,
    replaceRenderModule,
    replaceEntryModuleInObject
  ];

  return replaceBootstrap(
    shouldTransform,
    getEntryModule,
    getTypeChecker,
    replaceFunctions,
    platformOptions
  );
}

// Figure out if it is renderModule
function replaceRenderModule(
  identifiers: ts.Identifier[],
  sourceFile: ts.SourceFile,
  bootstrapOptions: PlatformBootstrapOptions
): TransformOperation[] {
  const ops: TransformOperation[] = [];

  identifiers.forEach(identifier => {
    if (!identifier.parent) {
      return;
    }

    if (identifier.parent.kind !== ts.SyntaxKind.CallExpression &&
      identifier.parent.kind !== ts.SyntaxKind.PropertyAssignment) {
      return;
    }

    if (identifier.parent.kind !== ts.SyntaxKind.CallExpression) {
      return;
    }

    const callExpr = identifier.parent as ts.CallExpression;
    if (callExpr.expression.kind !== ts.SyntaxKind.Identifier) {
      return;
    }

    const identifierExpr = callExpr.expression as ts.Identifier;

    if (identifierExpr.text !== 'renderModule') {
      return;
    }

    const renderModuleIdentifier = identifierExpr as ts.Identifier;

    const idPlatformServer = ts.createUniqueName('__NgCli_bootstrap_');
    const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

    ops.push(
      // Replace the entry module import.
      ...insertStarImport(sourceFile, idNgFactory, bootstrapOptions.factoryModulePath),
      new ReplaceNodeOperation(sourceFile, identifier,
        ts.createPropertyAccess(idNgFactory, ts.createIdentifier(bootstrapOptions.factoryClassName))),
      // Replace the renderModule import.
      ...insertStarImport(sourceFile, idPlatformServer, bootstrapOptions.staticPlatformPath),
      new ReplaceNodeOperation(sourceFile, renderModuleIdentifier,
        ts.createPropertyAccess(idPlatformServer, 'renderModuleFactory')),
    );
  });

  return ops;
}

// This is for things that accept a module as a property in a config object
// .ie the express engine
function replaceEntryModuleInObject(
  identifiers: ts.Identifier[],
  sourceFile: ts.SourceFile,
  bootstrapOptions: PlatformBootstrapOptions
): TransformOperation[] {
  return identifiers
    .filter(({ parent }) => parent && parent.kind === ts.SyntaxKind.PropertyAssignment)
    .reduce((ops: TransformOperation[], identifier) => {
      const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

      ops.push(
        ...insertStarImport(sourceFile, idNgFactory, bootstrapOptions.factoryModulePath),
        new ReplaceNodeOperation(sourceFile, identifier,
          ts.createPropertyAccess(idNgFactory, ts.createIdentifier(bootstrapOptions.factoryClassName))),
      );

      return ops;
    }, []);
}
