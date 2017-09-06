/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';
import { purify } from './purify';


interface Chunk {
  files: string[];
}

export class PurifyPlugin {
  constructor() { }
  public apply(compiler: webpack.Compiler): void {
    // tslint:disable-next-line:no-any
    compiler.plugin('compilation', (compilation: any) => {
      compilation.plugin('optimize-chunk-assets', (chunks: Chunk[], callback: () => void) => {
        chunks.forEach((chunk: Chunk) => {
          chunk.files
            .filter((fileName: string) => fileName.endsWith('.js'))
            .forEach((fileName: string) => {
              const purifiedSource = purify(compilation.assets[fileName].source());
              compilation.assets[fileName]._cachedSource = purifiedSource;
              compilation.assets[fileName]._source.source = () => purifiedSource;
            });
        });
        callback();
      });
    });
  }
}

