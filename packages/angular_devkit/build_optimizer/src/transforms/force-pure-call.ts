/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


const pureFunctionComment = '@__PURE__';
const callExprWhitelist = [
  'makeDecorator',
  'makePropDecorator',
  'makeParamDecorator',
  'makeMetadataCtor',
];

export function testForcePureCall(content: string) {
  // Should match be /\/\*@__PURE__\*\/ (makeDecorator|etc)\(/, where 'etc' is all others in the
  // whitelist, separated by '|';
  const regex = [
    /\/\*@__PURE__\*\/ /,
    `(${callExprWhitelist.join('|')})`,
    /\(/,
  ].map(x => typeof x === 'string' ? x : x.source).join('');

  return new RegExp(regex).test(content);
}

// This transform exists as a workaround for the following TS issues:
// - https://github.com/Microsoft/TypeScript/issues/17689
// - https://github.com/Microsoft/TypeScript/issues/17606
// It forces call expressions in a whitelist to have a leading PURE comment.
// Once TS fixes this problem for call expressions, Build Optimizer should be updated and this
// transform removed.
export function getForcePureCallTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Check if node is a TS whitelisted call expression and add comment.
        if (isWhitelistedCallExpression(node)) {
          const newNode = ts.addSyntheticLeadingComment(
            node, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false);

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitEachChild(sf, visitor, context);
    };

    return transformer;
  };
}

function isWhitelistedCallExpression(node: ts.Node) {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  if (!ts.isIdentifier(node.expression)) {
    return false;
  }

  if (callExprWhitelist.indexOf(node.expression.text) === -1) {
    return false;
  }

  return true;
}
