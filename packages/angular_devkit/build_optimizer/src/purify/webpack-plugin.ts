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
              const originalAsset = compilation.assets[fileName];
              const purifiedSource = purify(originalAsset.source());
              const serialized = new Buffer(purifiedSource);
              // Overwrite asset with purified version.
              compilation.assets[fileName] = {
                source: () => serialized,
                size: () => serialized.length,
                map: () => originalAsset.map(),
              };
            });
        });
        callback();
      });
    });
  }
}

