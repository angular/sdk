/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { languages } from '@angular-devkit/arborist';
import { allOf } from '../boolean';
import { StringMatcherOptions, stringMatches } from '../strings';
import { isHtml } from './language';


export function tagName(options?: StringMatcherOptions): languages.html.HtmlLanguageMatcher {
  return allOf(
    isHtml(),
    (node: languages.html.HtmlLanguageNode) => {
      if ('tagName' in node) {
        return options === undefined
               || stringMatches((node as { tagName: string }).tagName, options);
      } else {
        return false;
      }
    },
  );
}
