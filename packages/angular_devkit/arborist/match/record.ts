/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Matcher, MatcherContext } from '@angular-devkit/arborist';

/**
 * A matcher that records node in the middle of the run, if they match.
 */
export function record<ST, NT>(matcher: Matcher<ST, NT>): Matcher<ST, NT> {
  return (node: NT, context: MatcherContext<ST, NT>) => {
    const result = matcher(node, context);

    if (result) {
      context.next(context.arborist.createMatchFromNode(node, context));
    }

    return result;
  };
}
