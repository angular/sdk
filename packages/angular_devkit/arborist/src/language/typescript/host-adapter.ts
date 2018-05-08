/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  FileDoesNotExistException,
  Path,
  extname,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import * as ts from 'typescript';


export class CompilerHostAdapter implements ts.CompilerHost {
  private _sourceFileCache = new Map<Path, ts.SourceFile>();
  private _fallBack: ts.CompilerHost;

  constructor(private _host: virtualFs.SyncDelegateHost<{}>, options: ts.CompilerOptions) {
    this._fallBack = ts.createCompilerHost(options);
  }

  /** From ts.ModuleResolutionHost **/
  fileExists(fileName: string): boolean {
    return this._host.exists(normalize(fileName));
  }
  readFile(fileName: string): string {
    const content = this._host.read(normalize(fileName));

    return content ? new Buffer(content).toString() : '';
  }

  directoryExists(directoryName: string): boolean {
    const p = normalize(directoryName);

    return this._host.exists(p) && this._host.isDirectory(p);
  }

  // realpath(path: string): string {
  //
  // }

  //
  // getDirectories?(path: string): string[] {
  //   return this._host.list(normalize(path));
  // }

  getSourceFile(fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile {
    const path = normalize(fileName);
    let maybeSourceFile = this._sourceFileCache.get(path);
    if (!maybeSourceFile) {
      const maybeContent = this._host.read(path);
      if (!maybeContent) {
        throw new FileDoesNotExistException(path);
      }

      maybeSourceFile = ts.createSourceFile(
        fileName,
        new Buffer(maybeContent).toString(),
        languageVersion,
      );
      this._sourceFileCache.set(path, maybeSourceFile);
    }

    return maybeSourceFile;
  }
  //
  // getSourceFileByPath?(fileName: string,
  //                      path: ts.Path,
  //                      languageVersion: ts.ScriptTarget,
  //                      onError?: (message: string) => void): ts.SourceFile {
  // }
  // getCancellationToken?(): ts.CancellationToken;
  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return this._fallBack.getDefaultLibFileName(options);
  }
  getDefaultLibLocation?(): string {
    if (this._fallBack.getDefaultLibLocation) {
      return this._fallBack.getDefaultLibLocation();
    }

    return '';
  }
  get writeFile(): ts.WriteFileCallback {
    return (fileName: string, data: string): void => {
      const p = normalize(fileName);
      this._sourceFileCache.delete(p);
      this._host.write(p, virtualFs.stringToFileBuffer(data));
    };
  }
  getCurrentDirectory(): string {
    return this._fallBack.getCurrentDirectory();
  }
  getDirectories(path: string): string[] {
    const normalizedPath = normalize(path);

    return this._host
               .list(normalizedPath)
               .filter((x: Path) => this._host.isDirectory(join(normalizedPath, x)));
  }
  getCanonicalFileName(fileName: string): string {
    return normalize(fileName);
  }
  useCaseSensitiveFileNames(): boolean {
    return true;
  }
  getNewLine(): string {
    return '\n';
  }
  // resolveModuleNames?(moduleNames: string[], containingFile: string): ts.ResolvedModule[];
  /**
   * This method is a companion for 'resolveModuleNames' and is used to resolve 'types' references
   * to actual type declaration files
   */
  // resolveTypeReferenceDirectives?(typeReferenceDirectiveNames: string[],
  //                                 containingFile: string): ts.ResolvedTypeReferenceDirective[];
  // getEnvironmentVariable?(name: string): string;
}


export class ParseConfigHostAdapter implements ts.ParseConfigHost {
  constructor(private _host: virtualFs.SyncDelegateHost<{}>) {}

  get useCaseSensitiveFileNames(): boolean {
    return true;
  }

  private _createMatcher(patterns: string[]) {
    const pattern = '^('
      + patterns
        .map(ex => '('
          + ex
            .replace(/[\-\[\]{}()+?./\\^$|]/g, '\\$&')
            .replace(/(\\\\|\\\/)\*\*/g, '((\/|\\\\).+?)?')
            .replace(/\*/g, '[^/\\\\]*')
          + ')')
        .join('|')
      + ')($|/|\\\\)';

    return new RegExp(pattern);
  }

  private _match(root: Path,
                 dir: Path,
                 extensions: string[],
                 excludes: RegExp,
                 includes: RegExp): Array<string> {
    return this._host.list(join(root, dir))
      .map(path => {
        if (this._host.isDirectory(join(root, dir, path))) {
          return join(dir, path) + '/';
        } else {
          return join(dir, path);
        }
      })
      // Excludes.
      .filter(path => {
        return !excludes.test(path);
      })
      // Includes.
      .filter(path => includes.test(path))
      // Recursively look for sub directories.
      .reduce((prev: string[], curr: Path) => {
        if (curr.endsWith('/')) {
          return prev.concat(this._match(root, curr, extensions, excludes, includes));
        } else {
          if (extensions.indexOf(extname(curr)) != -1) {
            return prev.concat(join(root, curr));
          } else {
            return prev;
          }
        }
      }, []);
  }

  readDirectory(rootDir: string,
                extensions: string[],
                excludes: string[],
                includes: string[]): string[] {
    return this._match(
      normalize(rootDir),
      normalize(''),
      extensions,
      this._createMatcher(excludes),
      this._createMatcher(includes),
    );
  }

  readFile(path: string): string {
    return new Buffer(this._host.read(normalize(path))).toString();
  }

  /**
   * Gets a value indicating whether the specified path exists and is a file.
   * @param path The path to test.
   */
  fileExists(path: string): boolean {
    return this._host.exists(normalize(path));
  }
}
