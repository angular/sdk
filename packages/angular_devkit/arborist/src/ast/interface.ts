/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path } from '@angular-devkit/core';

type AstSource<SourceT extends {}> = SourceT & {};
type AstNode<NodeT extends {}> = NodeT & {};

interface AstHost<NodeT, SourceT> {
  getSourceForPath(path: Path): AstSource<SourceT>;

  getChildren(node: AstNode<NodeT>): AstNode<NodeT>[];
}

interface AstStateMachine {
  queueSource<SourceT extends {}>(source: AstSource<SourceT>): void;
  queueChildrenOfNode<NodeT extends {}>(node: AstNode<NodeT>): void;
  queueNode<NodeT extends {}>(node: AstNode<NodeT>): void;

  start(visitor: AstVisitor): void;

  skipFile(): void;
  skipChildren(): void;
  stop(): void;
}

export enum AstVisitorResult {
  Continue = 0,
  SkipChildren = 1,
  SkipSource = 2,
  Stop = 3,
}

interface AstVisitor {
  <NodeT extends {} = {}, SourceT extends {} = {}>(
    node: AstNode<NodeT>,
    source: AstSource<SourceT>,
    context: AstStateMachine,
  ): AstVisitorResult;
}
