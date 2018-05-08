/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path } from '@angular-devkit/core';


export interface NodeRef<SourceT, NodeT> {
  node: NodeT;
  source: SourceT | null;
}

export interface Language<SourceT, NodeT> {
  readonly name: string;
  readonly allFiles: Path[];
  readonly token: {};

  visitAll<ContextT>(visitor: LanguageVisitor<SourceT, NodeT, ContextT>,
                     context?: ContextT): void;
  visitPath<ContextT>(path: Path,
                      visitor: LanguageVisitor<SourceT, NodeT, ContextT>,
                      context?: ContextT): void;
  visitNode<ContextT>(node: NodeT,
                      source: SourceT | null,
                      visitor: LanguageVisitor<SourceT, NodeT, ContextT>,
                      context?: ContextT): void;
  visitChildrenOfNode<ContextT>(node: NodeT,
                                source: SourceT | null,
                                visitor: LanguageVisitor<SourceT, NodeT, ContextT>,
                                context?: ContextT): void;

  getSourceForPath(path: Path): SourceT | null;
  createNodeFromText(text: string, path?: Path | null): NodeRef<SourceT, NodeT> | null;

  getStartOfNode(node: NodeT, source: SourceT | null): Position;
  getEndOfNode(node: NodeT, source: SourceT | null): Position;
  getTextOfNode(node: NodeT, source: SourceT | null): string;
}

export enum VisitorResult {
  Continue = 0,
  SkipChildren = 1,
  SkipFile = 2,
  Stop = 3,
}

export type LanguageVisitor<_ST, NT, CT> = (node: NT, context?: CT) => VisitorResult;

export interface Position {
  offset: number;
  line: number;
  character: number;
}
