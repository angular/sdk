/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Matcher, MatcherContext } from '@angular-devkit/arborist';
import { nullMatcher } from './null';


export function descendants<SourceT, NodeT>(
  ...matchers: Matcher<SourceT, NodeT>[],
): Matcher<SourceT, NodeT> {
  if (matchers.length == 1) {
    return matchers[0];
  } else if (matchers.length < 1) {
    return nullMatcher();
  }

  return (node: NodeT, context: MatcherContext<SourceT, NodeT>) => {
    const result = matchers[0](node, context);
    if (result) {
      context.language.visitChildrenOfNode(
        node,
        context.source,
        context.arborist.createVisitorFromMatcher(descendants(...matchers.slice(1)), context),
      );
    }

    // Never match intermediate steps.
    return false;
  };
}


export function descendantsOrSelf<SourceT, NodeT>(
  ...matchers: Matcher<SourceT, NodeT>[],
): Matcher<SourceT, NodeT> {
  if (matchers.length == 1) {
    return matchers[0];
  } else if (matchers.length < 1) {
    return nullMatcher();
  }

  return (node: NodeT, context: MatcherContext<SourceT, NodeT>) => {
    const result = matchers[0](node, context);
    if (result) {
      context.language.visitNode(
        node,
        context.source,
        context.arborist.createVisitorFromMatcher(descendantsOrSelf(...matchers.slice(1)), context),
      );
    }

    // Never match intermediate steps.
    return false;
  };
}
