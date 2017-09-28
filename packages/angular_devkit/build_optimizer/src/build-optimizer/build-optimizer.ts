/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { readFileSync } from 'fs';
import { TransformJavascriptOutput, transformJavascript } from '../helpers/transform-javascript';
import { getFoldFileTransformer } from '../transforms/class-fold';
import { getImportTslibTransformer, testImportTslib } from '../transforms/import-tslib';
import { getPrefixClassesTransformer, testPrefixClasses } from '../transforms/prefix-classes';
import { getPrefixFunctionsTransformer } from '../transforms/prefix-functions';
import { getScrubFileTransformer, testScrubFile } from '../transforms/scrub-file';
import { getWrapEnumsTransformer, testWrapEnums } from '../transforms/wrap-enums';


const whitelistedAngularModules = [
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)animations(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)common(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)compiler(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)core(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)forms(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)http(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)platform-browser-dynamic(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)platform-browser(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)platform-webworker-dynamic(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)platform-webworker(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)router(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)upgrade(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)material(\\|\/)/,
  /(\\|\/)node_modules(\\|\/)@angular(\\|\/)cdk(\\|\/)/,
];

export interface BuildOptimizerOptions {
  content?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
}

export function buildOptimizer(options: BuildOptimizerOptions): TransformJavascriptOutput {

  const { inputFilePath } = options;
  let { content } = options;

  if (!inputFilePath && content === undefined) {
    throw new Error('Either filePath or content must be specified in options.');
  }

  if (content === undefined) {
    content = readFileSync(inputFilePath as string, 'UTF-8');
  }

  // Determine which transforms to apply.
  const getTransforms = [];

  if (testWrapEnums(content)) {
    getTransforms.push(getWrapEnumsTransformer);
  }

  if (testImportTslib(content)) {
    getTransforms.push(getImportTslibTransformer);
  }

  if (testPrefixClasses(content)) {
    getTransforms.push(getPrefixClassesTransformer);
  }

  if (inputFilePath
    && whitelistedAngularModules.some((re) => re.test(inputFilePath))
  ) {
    getTransforms.push(
      // getPrefixFunctionsTransformer is rather dangerous, apply only to known pure modules.
      // It will mark both `require()` calls and `console.log(stuff)` as pure.
      // We only apply it to whitelisted modules, since we know they are safe.
      // getPrefixFunctionsTransformer needs to be before getFoldFileTransformer.
      getPrefixFunctionsTransformer,
      getScrubFileTransformer,
      getFoldFileTransformer,
    );
  } else if (testScrubFile(content)) {
    getTransforms.push(
      getScrubFileTransformer,
      getFoldFileTransformer,
    );
  }

  return transformJavascript({ ...options, getTransforms, content });
}
