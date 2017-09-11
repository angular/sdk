/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { drilldownNodes } from '../helpers/ast-utils';


export function testWrapEnums(content: string) {
  const regexes = [
    // tslint:disable:max-line-length
    /var (\S+) = \{\};\r?\n(\1\.(\S+) = \d+;\r?\n)+\1\[\1\.(\S+)\] = "\4";\r?\n(\1\[\1\.(\S+)\] = "\S+";\r?\n*)+/,
    /var (\S+);(\/\*@__PURE__\*\/)*\r?\n\(function \(\1\) \{\s+(\1\[\1\["(\S+)"\] = 0\] = "\4";(\s+\1\[\1\["\S+"\] = \d\] = "\S+";)*\r?\n)\}\)\(\1 \|\| \(\1 = \{\}\)\);/,
  // tslint:enable:max-line-length
  ];

  return regexes.some((regex) => regex.test(content));
}

function isBlockLike(node: ts.Node): node is ts.BlockLike {
  return node.kind === ts.SyntaxKind.Block
      || node.kind === ts.SyntaxKind.ModuleBlock
      || node.kind === ts.SyntaxKind.CaseClause
      || node.kind === ts.SyntaxKind.DefaultClause
      || node.kind === ts.SyntaxKind.SourceFile;
}

// NOTE: 'isXXXX' helper functions can be replaced with native TS helpers with TS 2.4+

function isVariableStatement(node: ts.Node): node is ts.VariableStatement {
  return node.kind === ts.SyntaxKind.VariableStatement;
}

function isIdentifier(node: ts.Node): node is ts.Identifier {
  return node.kind === ts.SyntaxKind.Identifier;
}

function isObjectLiteralExpression(node: ts.Node): node is ts.ObjectLiteralExpression {
  return node.kind === ts.SyntaxKind.ObjectLiteralExpression;
}

export function getWrapEnumsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const result = visitBlockStatements(sf.statements, context);

      return ts.updateSourceFileNode(sf, result);
    };

    return transformer;
  };
}

function visitBlockStatements(
  statements: Array<ts.Statement>,
  context: ts.TransformationContext,
): Array<ts.Statement> {

  // copy of statements to modify; lazy initialized
  let updatedStatements: Array<ts.Statement> | undefined;

  const visitor: ts.Visitor = (node) => {
    if (isBlockLike(node)) {
      const result = visitBlockStatements(node.statements, context);
      if (result === node.statements) {
        return node;
      }
      switch (node.kind) {
        case ts.SyntaxKind.Block:
          return ts.updateBlock(node as ts.Block, result);
        case ts.SyntaxKind.ModuleBlock:
          return ts.updateModuleBlock(node as ts.ModuleBlock, result);
        case ts.SyntaxKind.CaseClause:
          const clause = node as ts.CaseClause;

          return ts.updateCaseClause(clause, clause.expression, result);
        case ts.SyntaxKind.DefaultClause:
          return ts.updateDefaultClause(node as ts.DefaultClause, result);
        default:
          return node;
      }
    } else {
      return ts.visitEachChild(node, visitor, context);
    }
  };

  // 'oIndex' is the original statement index; 'uIndex' is the updated statement index
  for (let oIndex = 0, uIndex = 0; oIndex < statements.length; oIndex++, uIndex++) {
    const currentStatement = statements[oIndex];

    // these can't contain an enum declaration
    if (currentStatement.kind === ts.SyntaxKind.ImportDeclaration) {
      continue;
    }

    // enum declarations must:
    //   * not be last statement
    //   * be a variable statement
    //   * have only one declaration
    //   * have an identifer as a declaration name
    if (oIndex < statements.length - 1
        && isVariableStatement(currentStatement)
        && currentStatement.declarationList.declarations.length === 1) {

      const variableDeclaration = currentStatement.declarationList.declarations[0];
      if (isIdentifier(variableDeclaration.name)) {
        const name = variableDeclaration.name.text;

        if (!variableDeclaration.initializer) {
          const enumStatements = findTs2_3EnumStatements(name, statements[oIndex + 1]);
          if (enumStatements.length > 0) {
            // found an enum
            if (!updatedStatements) {
              updatedStatements = statements.slice();
            }
            // create wrapper and replace variable statement and IIFE
            updatedStatements.splice(uIndex, 2, createWrappedEnum(
              name,
              currentStatement,
              enumStatements,
            ));
            // skip IIFE statement
            oIndex++;
            continue;
          }
        } else if (isObjectLiteralExpression(variableDeclaration.initializer)
                   && variableDeclaration.initializer.properties.length === 0) {
          const nextStatements = statements.slice(oIndex + 1);
          const enumStatements = findTs2_2EnumStatements(name, nextStatements);
          if (enumStatements.length > 0) {
            // found an enum
            if (!updatedStatements) {
              updatedStatements = statements.slice();
            }
            // create wrapper and replace variable statement and enum member statements
            updatedStatements.splice(uIndex, enumStatements.length + 1, createWrappedEnum(
              name,
              currentStatement,
              enumStatements,
            ));
            // skip enum member declarations
            oIndex += enumStatements.length;
            continue;
          }
        }

      }
    }

    const result = ts.visitNode(currentStatement, visitor);
    if (result !== currentStatement) {
      if (!updatedStatements) {
        updatedStatements = statements.slice();
      }
      updatedStatements[uIndex] = result;
    }
  }

  // if changes, return updated statements
  // otherwise, return original array instance
  return updatedStatements ? updatedStatements : statements;
}

// TS 2.3 enums have statements that are inside a IIFE.
function findTs2_3EnumStatements(name: string, statement: ts.Statement): ts.ExpressionStatement[] {
  const enumStatements: ts.ExpressionStatement[] = [];
  const noNodes: ts.ExpressionStatement[] = [];

  const funcExpr = drilldownNodes<ts.FunctionExpression>(statement,
    [
      { prop: null, kind: ts.SyntaxKind.ExpressionStatement },
      { prop: 'expression', kind: ts.SyntaxKind.CallExpression },
      { prop: 'expression', kind: ts.SyntaxKind.ParenthesizedExpression },
      { prop: 'expression', kind: ts.SyntaxKind.FunctionExpression },
    ]);

  if (funcExpr === null) { return noNodes; }

  if (!(
    funcExpr.parameters.length === 1
    && funcExpr.parameters[0].name.kind === ts.SyntaxKind.Identifier
    && (funcExpr.parameters[0].name as ts.Identifier).text === name
  )) {
    return noNodes;
  }

  // In TS 2.3 enums, the IIFE contains only expressions with a certain format.
  // If we find any that is different, we ignore the whole thing.
  for (const innerStmt of funcExpr.body.statements) {

    const innerBinExpr = drilldownNodes<ts.BinaryExpression>(innerStmt,
      [
        { prop: null, kind: ts.SyntaxKind.ExpressionStatement },
        { prop: 'expression', kind: ts.SyntaxKind.BinaryExpression },
      ]);

    if (innerBinExpr === null) { return noNodes; }

    const exprStmt = innerStmt as ts.ExpressionStatement;

    if (!(innerBinExpr.operatorToken.kind === ts.SyntaxKind.FirstAssignment
        && innerBinExpr.left.kind === ts.SyntaxKind.ElementAccessExpression)) {
      return noNodes;
    }

    const innerElemAcc = innerBinExpr.left as ts.ElementAccessExpression;

    if (!(
      innerElemAcc.expression.kind === ts.SyntaxKind.Identifier
      && (innerElemAcc.expression as ts.Identifier).text === name
      && innerElemAcc.argumentExpression
      && innerElemAcc.argumentExpression.kind === ts.SyntaxKind.BinaryExpression
    )) {
      return noNodes;
    }

    const innerArgBinExpr = innerElemAcc.argumentExpression as ts.BinaryExpression;

    if (innerArgBinExpr.left.kind !== ts.SyntaxKind.ElementAccessExpression) {
      return noNodes;
    }

    const innerArgElemAcc = innerArgBinExpr.left as ts.ElementAccessExpression;

    if (!(
      innerArgElemAcc.expression.kind === ts.SyntaxKind.Identifier
      && (innerArgElemAcc.expression as ts.Identifier).text === name
    )) {
      return noNodes;
    }

    enumStatements.push(exprStmt);
  }

  return enumStatements;
}

// TS 2.2 enums have statements after the variable declaration, with index statements followed
// by value statements.
function findTs2_2EnumStatements(
  name: string,
  statements: ts.Statement[],
): ts.ExpressionStatement[] {
  const enumStatements: ts.ExpressionStatement[] = [];
  let beforeValueStatements = true;

  for (const stmt of statements) {
    // Ensure all statements are of the expected format and using the right identifer.
    // When we find a statement that isn't part of the enum, return what we collected so far.
    const binExpr = drilldownNodes<ts.BinaryExpression>(stmt,
      [
        { prop: null, kind: ts.SyntaxKind.ExpressionStatement },
        { prop: 'expression', kind: ts.SyntaxKind.BinaryExpression },
      ]);

    if (binExpr === null
      || (binExpr.left.kind !== ts.SyntaxKind.PropertyAccessExpression
        && binExpr.left.kind !== ts.SyntaxKind.ElementAccessExpression)
    ) {
      return beforeValueStatements ? [] : enumStatements;
    }

    const exprStmt = stmt as ts.ExpressionStatement;
    const leftExpr = binExpr.left as ts.PropertyAccessExpression | ts.ElementAccessExpression;

    if (!(leftExpr.expression.kind === ts.SyntaxKind.Identifier
        && (leftExpr.expression as ts.Identifier).text === name)) {
      return beforeValueStatements ? [] : enumStatements;
    }

    if (!beforeValueStatements && leftExpr.kind === ts.SyntaxKind.PropertyAccessExpression) {
      // We shouldn't find index statements after value statements.
      return [];
    } else if (beforeValueStatements && leftExpr.kind === ts.SyntaxKind.ElementAccessExpression) {
      beforeValueStatements = false;
    }

    enumStatements.push(exprStmt);
  }

  return enumStatements;
}

function createWrappedEnum(
  name: string,
  hostNode: ts.VariableStatement,
  statements: Array<ts.Statement>,
): ts.Statement {
  const pureFunctionComment = '@__PURE__';

  const innerVarStmt = ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList([
      ts.createVariableDeclaration(name, undefined, ts.createObjectLiteral()),
    ]),
  );

  const innerReturn = ts.createReturn(ts.createIdentifier(name));

  // NOTE: TS 2.4+ has a create IIFE helper method
  const iife = ts.createCall(
    ts.createParen(
      ts.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        undefined,
        ts.createBlock([
          innerVarStmt,
          ...statements,
          innerReturn,
        ]),
      ),
    ),
    undefined,
    [],
  );

  // Update existing host node with the pure comment before the variable declaration initializer.
  const variableDeclaration = hostNode.declarationList.declarations[0];
  const outerVarStmt = ts.updateVariableStatement(
    hostNode,
    hostNode.modifiers,
    ts.updateVariableDeclarationList(
      hostNode.declarationList,
      [
        ts.updateVariableDeclaration(
          variableDeclaration,
          variableDeclaration.name,
          variableDeclaration.type,
          ts.addSyntheticLeadingComment(
            iife, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false,
          ),
        ),
      ],
    ),
  );

  return outerVarStmt;
}
