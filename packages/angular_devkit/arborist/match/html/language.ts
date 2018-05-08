/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { languages } from '@angular-devkit/arborist';

export function isHtml(): languages.html.HtmlLanguageMatcher {
  return (_node: {}, context: languages.html.HtmlLanguageMatcherContext) => {
    if (context.language.token !== languages.html.HtmlLanguageToken) {
      context.skipFile();

      return false;
    }

    return true;
  };
}
