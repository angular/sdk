/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as autoprefixer from 'autoprefixer';
import * as path from 'path';
import { loader } from 'webpack';
import { OutputHashing } from '../../browser/schema';
import { getOutputHashFormat } from '../models/webpack-configs/utils';
import PostcssCliResources from '../plugins/postcss-cli-resources';
import { findUp } from './find-up';
const postcssImports = require('postcss-import');
const postcssUrl = require('postcss-url');


interface PostcssUrlAsset {
  url: string;
  hash: string;
  absolutePath: string;
}

export interface PostcssPluginsFactoryOptions {
  projectRoot: string;
  deployUrl?: string;
  baseHref?: string;
  maximumInlineSize?: number;
  outputHashing?: OutputHashing;
}

export function postcssPluginsFactory(options: PostcssPluginsFactoryOptions) {
  const projectRoot = options.projectRoot;
  // Determine hashing format.
  const hashFormat = getOutputHashFormat(options.outputHashing);
  // Convert absolute resource URLs to account for base-href and deploy-url.
  const baseHref = options.baseHref || '';
  const deployUrl = options.deployUrl || '';
  // Maximum resource size to inline (KiB)
  const maximumInlineSize = options.maximumInlineSize || 10;

  return (loader: loader.LoaderContext) => [
    postcssImports({
      resolve: (url: string, context: string) => {
        return new Promise<string>((resolve, reject) => {
          let hadTilde = false;
          if (url && url.startsWith('~')) {
            url = url.substr(1);
            hadTilde = true;
          }
          loader.resolve(context, (hadTilde ? '' : './') + url, (err: Error, result: string) => {
            if (err) {
              if (hadTilde) {
                reject(err);

                return;
              }
              loader.resolve(context, url, (err: Error, result: string) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            } else {
              resolve(result);
            }
          });
        });
      },
      load: (filename: string) => {
        return new Promise<string>((resolve, reject) => {
          loader.fs.readFile(filename, (err: Error, data: Buffer) => {
            if (err) {
              reject(err);

              return;
            }

            const content = data.toString();
            resolve(content);
          });
        });
      },
    }),
    postcssUrl({
      filter: ({ url }: PostcssUrlAsset) => url.startsWith('~'),
      url: ({ url }: PostcssUrlAsset) => {
        // Note: This will only find the first node_modules folder.
        const nodeModules = findUp('node_modules', projectRoot);
        if (!nodeModules) {
          throw new Error('Cannot locate node_modules directory.');
        }
        const fullPath = path.join(nodeModules, url.substr(1));

        return path.relative(loader.context, fullPath).replace(/\\/g, '/');
      },
    }),
    postcssUrl([
      {
        // Only convert root relative URLs, which CSS-Loader won't process into require().
        filter: ({ url }: PostcssUrlAsset) => url.startsWith('/') && !url.startsWith('//'),
        url: ({ url }: PostcssUrlAsset) => {
          if (deployUrl.match(/:\/\//) || deployUrl.startsWith('/')) {
            // If deployUrl is absolute or root relative, ignore baseHref & use deployUrl as is.
            return `${deployUrl.replace(/\/$/, '')}${url}`;
          } else if (baseHref.match(/:\/\//)) {
            // If baseHref contains a scheme, include it as is.
            return baseHref.replace(/\/$/, '') +
              `/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
          } else {
            // Join together base-href, deploy-url and the original URL.
            // Also dedupe multiple slashes into single ones.
            return `/${baseHref}/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
          }
        },
      },
      {
        // TODO: inline .cur if not supporting IE (use browserslist to check)
        filter: (asset: PostcssUrlAsset) => {
          return maximumInlineSize > 0 && !asset.hash && !asset.absolutePath.endsWith('.cur');
        },
        url: 'inline',
        // NOTE: maxSize is in KB
        maxSize: maximumInlineSize,
        fallback: 'rebase',
      },
      { url: 'rebase' },
    ]),
    PostcssCliResources({
      deployUrl: loader.loaders[loader.loaderIndex].options.ident == 'extracted' ? '' : deployUrl,
      loader,
      filename: `[name]${hashFormat.file}.[ext]`,
    }),
    autoprefixer({ grid: true }),
  ];
}
