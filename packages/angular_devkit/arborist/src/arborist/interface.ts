/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path } from '@angular-devkit/core';
import { Language, Position } from '../language/interface';
import { Arborist } from './arborist';

/**
 * A Context passed along a node to the matcher.
 */
export interface MatcherContext<SourceT, NodeT> {
  readonly arborist: Arborist;

  readonly language: Language<SourceT, NodeT>;
  readonly path: Path | null;
  readonly source: SourceT | null;

  readonly parentContext: MatcherContext<SourceT, NodeT> | null;

  next(match: Match<NodeT>): void;
  error(err: Error): void;
  complete(): void;

  stop(): void;  // Alias of complete().
  skipFile(): void;

  readonly doneFile: boolean;
  readonly done: boolean;
}


export interface Match<NodeT> {
  readonly language: Language<{}, {}>;
  readonly node: NodeT;

  readonly path: Path | null;
  readonly start: Position;
  readonly end: Position;
  readonly text: string;
}


export type Matcher<SourceT, NodeT>
  = (node: NodeT, context: MatcherContext<SourceT, NodeT>) => boolean;
