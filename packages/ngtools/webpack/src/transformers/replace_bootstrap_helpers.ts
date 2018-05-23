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

export interface PlatformBootstrapOptions {
  dynamicPlatformName: string;
  staticPlatformName: string;
  staticPlatformPath: string;
}

export interface BootstrapReplaceOptions extends PlatformBootstrapOptions {
  factoryClassName: string;
  factoryModulePath: string;
}

export function replaceBootstrap(
  shouldTransform: (fileName: string) => boolean,
  getEntryModule: () => { path: string, className: string } | null,
  getTypeChecker: () => ts.TypeChecker,
  replaceFunctions: ((identifiers: ts.Identifier[], sourceFile: ts.SourceFile, platformOptions: PlatformBootstrapOptions) => TransformOperation[])[],
  platformOptions: PlatformBootstrapOptions
): ts.TransformerFactory<ts.SourceFile> {

  const standardTransform: StandardTransform = function (sourceFile: ts.SourceFile) {
    const entryModule = getEntryModule();

    if (!shouldTransform(sourceFile.fileName) || !entryModule) {
      return [];
    }

    // Find all identifiers.
    const entryModuleIdentifiers = collectDeepNodes<ts.Identifier>(sourceFile,
      ts.SyntaxKind.Identifier)
      .filter(identifier => identifier.text === entryModule.className);

    const relativeEntryModulePath = relative(dirname(sourceFile.fileName), entryModule.path);
    const normalizedEntryModulePath = `./${relativeEntryModulePath}`.replace(/\\/g, '/');
    const factoryClassName = entryModule.className + 'NgFactory';
    const factoryModulePath = normalizedEntryModulePath + '.ngfactory';

    const bootstrapReplaceOptions: BootstrapReplaceOptions = {
      ...platformOptions,
      factoryClassName,
      factoryModulePath,
    };

    return replaceFunctions.reduce((ops, fn) => 
      [
        ...ops,
        ...fn(entryModuleIdentifiers, sourceFile, bootstrapReplaceOptions)
      ], []);
  };

  return makeTransform(standardTransform, getTypeChecker);
}

// Figure out if it's a `platformDynamic().bootstrapModule(AppModule)` call.
export function replacePlatformBootstrap(
  identifiers: ts.Identifier[],
  sourceFile: ts.SourceFile,
  bootstrapOptions: BootstrapReplaceOptions
): TransformOperation[] {

  const ops: TransformOperation[] = [];

  identifiers.forEach(identifier => {

    if (!(
      identifier.parent
      && identifier.parent.kind === ts.SyntaxKind.CallExpression
    )) {
      return;
    }

    const callExpr = identifier.parent as ts.CallExpression;

    if (callExpr.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
      return;
    }

    const propAccessExpr = callExpr.expression as ts.PropertyAccessExpression;

    if (propAccessExpr.name.text !== 'bootstrapModule'
      || propAccessExpr.expression.kind !== ts.SyntaxKind.CallExpression) {
      return;
    }

    const bootstrapModuleIdentifier = propAccessExpr.name;
    const innerCallExpr = propAccessExpr.expression as ts.CallExpression;

    if (!(
      innerCallExpr.expression.kind === ts.SyntaxKind.Identifier
      && (innerCallExpr.expression as ts.Identifier).text === bootstrapOptions.dynamicPlatformName
    )) {
      return;
    }

    const dynamicPlatformIdentifier = innerCallExpr.expression as ts.Identifier;

    const idPlatformStatic = ts.createUniqueName('__NgCli_bootstrap_');
    const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');

    // Add the transform operations.
    ops.push(
      // Replace the entry module import.
      ...insertStarImport(sourceFile, idNgFactory, bootstrapOptions.factoryModulePath),
      new ReplaceNodeOperation(sourceFile, identifier,
        ts.createPropertyAccess(idNgFactory, ts.createIdentifier(bootstrapOptions.factoryClassName))),
      // Replace the platformDynamic import.
      ...insertStarImport(sourceFile, idPlatformStatic, bootstrapOptions.staticPlatformPath),
      new ReplaceNodeOperation(sourceFile, dynamicPlatformIdentifier,
        ts.createPropertyAccess(idPlatformStatic, bootstrapOptions.staticPlatformName)),
      new ReplaceNodeOperation(sourceFile, bootstrapModuleIdentifier,
        ts.createIdentifier('bootstrapModuleFactory')),
    );
  });

  return ops;
}
