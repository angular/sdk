/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import * as webpack from 'webpack';
import { ReplaceSource } from 'webpack-sources';
import { purifyReplacements } from './purify';


interface Chunk {
  files: string[];
}

export class PurifyPlugin {
  constructor() { }
  public apply(compiler: webpack.Compiler): void {
    let compilerPlugin: (callback: (compilation: any) => void) => void;
    let compilationPlugin: (compilation: any,
                            callback: (chunks: Chunk[], callback: () => void) => void) => void;
    if (compiler.hooks) { // Webpack 4
      compilerPlugin = (callback: (compilation: any) => void) =>
        compiler.hooks.compilation.tap('purify', callback);
      compilationPlugin = (compilation: any,
                           callback: (chunks: Chunk[], callback: () => void) => void) =>
        compilation.hooks.optimizeChunkAssets.tapAsync('purify', callback);
    } else { // Webpack 3
      compilerPlugin = (callback: (compilation: any) => void) =>
        compiler.plugin('compilation', callback);
      compilationPlugin = (compilation: any,
                           callback: (chunks: Chunk[], callback: () => void) => void) =>
        compilation.plugin('optimize-chunk-assets', callback);
    }
    compilerPlugin((compilation: any) => {
      compilationPlugin(compilation, (chunks: Chunk[], callback: () => void) => {
        chunks.forEach((chunk: Chunk) => {
          chunk.files
            .filter((fileName: string) => fileName.endsWith('.js'))
            .forEach((fileName: string) => {
              const inserts = purifyReplacements(compilation.assets[fileName].source());

              if (inserts.length > 0) {
                const replaceSource = new ReplaceSource(compilation.assets[fileName], fileName);
                inserts.forEach((insert) => {
                  replaceSource.insert(insert.pos, insert.content);
                });
                compilation.assets[fileName] = replaceSource;
              }
            });
        });
        callback();
      });
    });
  }
}
