/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { getForcePureCallTransformer, testForcePureCall } from './force-pure-call';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getForcePureCallTransformer] }).content;

describe('force-pure-call', () => {
  it('forces pure call on makeDecorator', () => {
    const input = tags.stripIndent`
      var Component = /*@__PURE__*/ makeDecorator('Component', function (c) {
          if (c === void 0) { c = {}; }
          return (Object.assign({ changeDetection: ChangeDetectionStrategy.Default }, c));
      }, Directive);
    `;

    expect(testForcePureCall(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
  });

  it('forces pure call on makeDecorator', () => {
    // tslint:disable:max-line-length
    const input = tags.stripIndent`
      var Input = /*@__PURE__*/ makePropDecorator('Input', function (bindingPropertyName) { return ({ bindingPropertyName: bindingPropertyName }); });
    `;

    expect(testForcePureCall(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
  });

  it('forces pure call on makeDecorator', () => {
    // tslint:disable:max-line-length
    const input = tags.stripIndent`
      var Inject = /*@__PURE__*/ makeParamDecorator('Inject', function (token) { return ({ token: token }); });
    `;

    expect(testForcePureCall(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
  });

  it('forces pure call on makeDecorator', () => {
    const input = tags.stripIndent`
      var /** @type {?} */ metaCtor = /*@__PURE__*/ makeMetadataCtor(props);
    `;

    expect(testForcePureCall(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
  });

  it('tests false for files that do not have pure call already', () => {
    const input = tags.stripIndent`
      var /** @type {?} */ metaCtor = makeMetadataCtor(props);
    `;

    expect(testForcePureCall(input)).toBeFalsy();
  });
});
