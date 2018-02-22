#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { buildOptimizer } from './build-optimizer';


if (process.argv.length < 3 || process.argv.length > 5) {
  throw new Error(`
    build-optimizer should be called with either one or two arguments:

      build-optimizer input.js
      build-optimizer input.js output.js

    An additional '--side-effects-free' flag can be used after other arguments to force
    optimizations for side effect free modules.

    By default the side effect free optimizations are only applied to Angular modules via a regex
    based path whitelist (e.g. /[\\/]node_modules[\\/]@angular[\\/]core[\\/]/ ).
  `);
}

const currentDir = process.cwd();

const inputFile = process.argv[2];
const tsOrJsRegExp = /\.(j|t)s$/;
const sideEffectFreeFlag = '--side-effect-free';
let isSideEffectFree = false;

if (!inputFile.match(tsOrJsRegExp)) {
  throw new Error(`Input file must be .js or .ts.`);
}

if (process.argv[3] === sideEffectFreeFlag || process.argv[4] === sideEffectFreeFlag) {
  process.argv.pop();
  isSideEffectFree = true;
}

// Use provided output file, or add the .bo suffix before the extension.
const outputFile = process.argv[3] || inputFile.replace(tsOrJsRegExp, (subStr) => `.bo${subStr}`);

const boOutput = buildOptimizer({
  inputFilePath: join(currentDir, inputFile),
  outputFilePath: join(currentDir, outputFile),
  emitSourceMap: true,
  isSideEffectFree,
});

if (boOutput.emitSkipped) {
  console.log('Nothing to emit.');
} else {
  writeFileSync(join(currentDir, outputFile), boOutput.content);
  writeFileSync(join(currentDir, `${outputFile}.map`), JSON.stringify(boOutput.sourceMap));
  console.log('Emitted:');
  console.log(`  ${outputFile}`);
  console.log(`  ${outputFile}.map`);
}
