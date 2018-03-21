import * as vm from 'vm';
import * as path from 'path';
import { RawSource } from 'webpack-sources';

const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');


interface CompilationOutput {
  outputName: string;
  source: string;
}

export class WebpackResourceLoader {
  private _parentCompilation: any;
  private _context: string;
  private _resourceDependencies = new Map<string, string[]>();
  private _cachedResources = new Map<string, string>();

  constructor() {}

  update(parentCompilation: any) {
    this._parentCompilation = parentCompilation;
    this._context = parentCompilation.context;
  }

  getResourceDependencies(filePath: string) {
    return this._resourceDependencies.get(filePath) || [];
  }

  private _compile(filePath: string): Promise<CompilationOutput> {

    if (!this._parentCompilation) {
      throw new Error('WebpackResourceLoader cannot be used without parentCompilation');
    }

    // Simple sanity check.
    if (filePath.match(/\.[jt]s$/)) {
      return Promise.reject('Cannot use a JavaScript or TypeScript file for styleUrl.');
    }

    const outputOptions = { filename: filePath };
    const relativePath = path.relative(this._context || '', filePath);
    const childCompiler = this._parentCompilation.createChildCompiler(relativePath, outputOptions);
    childCompiler.context = this._context;

    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new SingleEntryPlugin(this._context, filePath).apply(childCompiler);
    new LoaderTargetPlugin('node').apply(childCompiler);

    childCompiler.hooks.thisCompilation.tap('ngtools-webpack', (compilation: any) => {
      compilation.hooks.additionalAssets.tapAsync('ngtools-webpack',
      (callback: (err?: Error) => void) => {
        if (this._cachedResources.has(compilation.fullHash)) {
          callback();
          return;
        }

        const asset = compilation.assets[filePath];
        if (asset) {
          this._evaluate({ outputName: filePath, source: asset.source() })
            .then(output => {
              compilation.assets[filePath] = new RawSource(output);
              callback();
            })
            .catch(err => callback(err));
        } else {
          callback();
        }
      });
    });

    // Compile and return a promise
    return new Promise((resolve, reject) => {
      childCompiler.compile((err: Error, childCompilation: any) => {
        // Resolve / reject the promise
        if (childCompilation && childCompilation.errors && childCompilation.errors.length) {
          const errorDetails = childCompilation.errors.map(function (error: any) {
            return error.message + (error.error ? ':\n' + error.error : '');
          }).join('\n');
          reject(new Error('Child compilation failed:\n' + errorDetails));
        } else if (err) {
          reject(err);
        } else {
          Object.keys(childCompilation.assets).forEach(assetName => {
            if (assetName !== filePath && this._parentCompilation.assets[assetName] == undefined) {
              this._parentCompilation.assets[assetName] = childCompilation.assets[assetName];
            }
          });

          // Save the dependencies for this resource.
          this._resourceDependencies.set(filePath, childCompilation.fileDependencies);

          const compilationHash = childCompilation.fullHash;
          if (this._cachedResources.has(compilationHash)) {
            resolve({
              outputName: filePath,
              source: this._cachedResources.get(compilationHash),
            });
          } else {
            const source = childCompilation.assets[filePath].source();
            this._cachedResources.set(compilationHash, source);
            resolve({ outputName: filePath, source });
          }
        }
      });
    });
  }

  private _evaluate({ outputName, source }: CompilationOutput): Promise<string> {
    try {
      // Evaluate code
      const evaluatedSource = vm.runInNewContext(source, undefined, { filename: outputName });

      if (typeof evaluatedSource == 'string') {
        return Promise.resolve(evaluatedSource);
      }

      return Promise.reject('The loader "' + outputName + '" didn\'t return a string.');
    } catch (e) {
      return Promise.reject(e);
    }
  }

  get(filePath: string): Promise<string> {
    return this._compile(filePath)
      .then((result: CompilationOutput) => result.source);
  }
}
