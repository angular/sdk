/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Match, MatcherContext } from '@angular-devkit/arborist';
import { languages } from '@angular-devkit/arborist';
import { dirname, join } from '@angular-devkit/core';
import { PartialObserver } from 'rxjs/Observer';
import * as ts from 'typescript';
import { allOf, anyOf } from '../boolean';
import { descendants } from '../descendants';
import { typescript } from '../index';
import { component } from './component';


export function inTemplate(
  htmlMatcher: languages.html.HtmlLanguageMatcher,
): languages.typescript.TypeScriptLanguageMatcher {
  return descendants(
    // Any class declaration.
    typescript.classDeclaration(),
    typescript.decorator(),
    typescript.functionCall({ equals: 'Component' }),
    allOf(
      (_node: {}, context: MatcherContext<{}, {}>) => {
        return !!context.path;
      },
      anyOf(
        // Find the templateUrl property on any objects.
        allOf(
          typescript.objectProperty({ equals: 'templateUrl' }),
          (property: ts.PropertyAssignment, context) => {
            let value = '';
            switch (property.initializer.kind) {
              case ts.SyntaxKind.StringLiteral:
                value = (property.initializer as ts.StringLiteral).text;
                break;

              default:
                return false;
            }

            // tslint:disable-next-line:non-null-operator
            context.arborist.matchFile(join(dirname(context.path !), value), htmlMatcher)
              .subscribe(context as PartialObserver<Match<{}>>);

            return false;
          },
        ),
        allOf(
          typescript.objectProperty({ equals: 'template' }),
          (property: ts.PropertyAssignment, context) => {
            const htmlLanguage = context.arborist.getLanguageByName('HTML');
            if (!htmlLanguage) {
              return false;
            }

            let value = '';
            switch (property.initializer.kind) {
              case ts.SyntaxKind.StringLiteral:
                value = (property.initializer as ts.StringLiteral).text;
                break;

              default:
                return false;
            }

            context.arborist.matchText(
              htmlLanguage,
              value,
              context.path,
              htmlMatcher,
              {
                positionMap: position => {
                  const start = context.language.getStartOfNode(
                    property.initializer,
                    context.source,
                  );

                  return {
                    offset: start.offset + position.offset + 1,
                    line: start.line + position.line,
                    character: start.character + position.character + 1,
                  };
                },
              },
            )
              .subscribe(context);

            return false;
          },
        ),
      ),
    ),
  );
}
