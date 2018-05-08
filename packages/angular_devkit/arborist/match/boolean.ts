/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Matcher, MatcherContext } from '@angular-devkit/arborist';


export function any(): Matcher<{}, {}> {
  return () => true;
}
export function none(): Matcher<{}, {}> {
  return () => false;
}


export function allOf<ST, NT>(...matchers: Matcher<ST, NT>[]): Matcher<ST, NT> {
  return (node: NT, context: MatcherContext<ST, NT>) => {
    return matchers.every(matcher => matcher(node, context));
  };
}


export function anyOf(...matchers: Matcher<{}, {}>[]): Matcher<{}, {}> {
  return (node: {}, context: MatcherContext<{}, {}>) => {
    return matchers.some(matcher => matcher(node, context));
  };
}


export function oneOf<ST, NT>(...matchers: Matcher<ST, NT>[]): Matcher<ST, NT> {
  return (node: NT, context: MatcherContext<ST, NT>) => {
    let matched = false;
    for (const matcher of matchers) {
      const result = matcher(node, context);
      if (result) {
        if (matched) {
          return false;
        }
        matched = true;
      }
    }

    return matched;
  };
}


export function firstOfFile<ST, NT>(matcher: Matcher<ST, NT>): Matcher<ST, NT> {
  return (node: NT, context: MatcherContext<ST, NT>) => {
    if (matcher(node, context)) {
      context.skipFile();

      return true;
    }

    return false;
  };
}


export function first<ST, NT>(matcher: Matcher<ST, NT>): Matcher<ST, NT> {
  let found = false;

  return (node: NT, context: MatcherContext<ST, NT>) => {
    if (found) {
      return false;
    }
    if (matcher(node, context)) {
      context.complete();
      found = true;

      return true;
    }

    return false;
  };
}
