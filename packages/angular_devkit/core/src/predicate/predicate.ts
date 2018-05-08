/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export type PredicateOption<T> = T & {
  and?: PredicateOption<T>;
  or?: PredicateOption<T>;
  not?: PredicateOption<T>;
  xor?: PredicateOption<T>;
};


export function runPredicate<T>(fn: (t: T) => boolean, option?: PredicateOption<T>): boolean {
  if (!option) {
    return true;
  }

  if (option.and) {
    if (!runPredicate(fn, option.and)) {
      return false;
    }
  }

  if (option.or) {
    if (runPredicate(fn, option.or)) {
      return true;
    }
  }

  const result = fn(option);
  if (option.xor) {
    if (result === runPredicate(fn, option.xor)) {
      return false;
    }
  }

  if (option.not) {
    return result && !runPredicate(fn, option.not);
  }

  return result;
}
