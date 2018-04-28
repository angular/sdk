/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { Compiler } from 'webpack';
import { ReplaceSource } from 'webpack-sources';
import { purifyReplacements } from './purify';

export class PurifyPlugin {
  public apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('build-optimizer-purify', compilation => {
      compilation.hooks.optimizeChunkAssets.tap('build-optimizer-purify', chunks => {
        chunks.forEach(chunk => {
          (chunk.files as string[])
            .filter(fileName => fileName.endsWith('.js'))
            .forEach(fileName => {
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

      });
    });
  }
}
