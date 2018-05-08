/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { MemoryHost, normalize, tags } from '@angular-devkit/core';
import { HtmlLanguage, HtmlLanguageNode } from '../language/html/language';
import { Arborist } from './arborist';
import { MatcherContext } from './interface';

const { stripIndents } = tags;


fdescribe('Arborist', () => {
  it('works with HTML', () => {
    const host = new MemoryHost({
      '/html/file.html': stripIndents`
        <html>
          <component ngIf="hello"></component>
        </html>
      `,
    });

    const arborist = new Arborist();
    arborist.registerLanguage(new HtmlLanguage(host, normalize('/')));

    const matching = arborist.match((node: HtmlLanguageNode, context: MatcherContext<{}, {}>) => {
      console.log(node);
      context.language.visitChildrenOfNode(node, context.source, )
      if (!('tagName' in node)) {
        return false;
      }


      return true;
    });

    matching.subscribe(x => console.log(x));
  });
});
