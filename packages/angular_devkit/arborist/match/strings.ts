/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { predicate } from '@angular-devkit/core';

export interface StringMatcherOptionsInternal {
  startsWith?: string;
  endsWith?: string;
  contains?: string;
  matches?: RegExp;
  equals?: string;
}
export type StringMatcherOptions = predicate.PredicateOption<StringMatcherOptionsInternal>;


export function stringMatches(text: string, options: StringMatcherOptions): boolean {
  return predicate.runPredicate((options: StringMatcherOptionsInternal) => {
    if (options.contains && text.indexOf(options.contains) == -1) {
      return false;
    }
    if (options.startsWith && !text.startsWith(options.startsWith)) {
      return false;
    }
    if (options.endsWith && !text.endsWith(options.endsWith)) {
      return false;
    }
    if (options.matches && text.match(options.matches) == null) {
      return false;
    }
    if (options.equals && text !== options.equals) {
      return false;
    }

    return true;
  }, options);
}
