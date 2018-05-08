/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  FileDoesNotExistException,
  JsonParseMode,
  Path,
  dirname,
  join,
  normalize,
  parseJson,
  virtualFs,
} from '@angular-devkit/core';
import * as ts from 'typescript';
import { Matcher, MatcherContext } from '../../arborist/interface';
import {
  Language,
  LanguageVisitor,
  Position,
  VisitorResult,
} from '../interface';
import { CompilerHostAdapter, ParseConfigHostAdapter } from './host-adapter';


export type TypeScriptLanguageSource = ts.SourceFile;
export type TypeScriptLanguageNode = ts.Node;


export type TypeScriptLanguageVisitor<CT>
  = LanguageVisitor<TypeScriptLanguageSource, TypeScriptLanguageNode, CT>;
export type TypeScriptLanguageMatcher
  = Matcher<TypeScriptLanguageSource, TypeScriptLanguageNode>;
export type TypeScriptLanguageMatcherContext
  = MatcherContext<TypeScriptLanguageSource, TypeScriptLanguageNode>;


export const TypeScriptLanguageToken = {};


export class TypeScriptLanguage implements Language<TypeScriptLanguageSource,
                                                    TypeScriptLanguageNode> {
  private _compilerHost: CompilerHostAdapter;
  private _program: ts.Program;
  private _host: virtualFs.SyncDelegateHost<{}>;

  constructor(host: virtualFs.Host, tsConfigPath: Path) {
    this._host = new virtualFs.SyncDelegateHost<{}>(host);
    if (this._host.isDirectory(tsConfigPath)) {
      tsConfigPath = join(tsConfigPath, 'tsconfig.json');
    }
    const configContent = this._host.read(tsConfigPath);
    if (!configContent) {
      throw new FileDoesNotExistException(tsConfigPath);
    }

    const parsedConfigHost = new ParseConfigHostAdapter(this._host);
    const json = parseJson(new Buffer(configContent).toString(), JsonParseMode.CommentsAllowed);

    const parsedConfig = ts.parseJsonConfigFileContent(
      json,
      parsedConfigHost,
      dirname(tsConfigPath),
      undefined,
      tsConfigPath,
    );

    this._compilerHost = new CompilerHostAdapter(this._host, parsedConfig.options);
    this._program = ts.createProgram(
      parsedConfig.fileNames,
      parsedConfig.options,
      this._compilerHost,
    );
  }

  get allFiles() {
    return this._program.getRootFileNames().map(name => normalize(name));
  }
  get name() {
    return 'TypeScript';
  }
  get program() {
    return this._program;
  }
  get token() {
    return TypeScriptLanguageToken;
  }

  resolveModuleName(moduleName: string, source: TypeScriptLanguageSource) {
    return ts.resolveModuleName(
      moduleName,
      source.fileName,
      this._program.getCompilerOptions(),
      this._compilerHost,
    );
  }

  private _positionOf(offset: number, sourceFile: TypeScriptLanguageSource | null): Position {
    if (!sourceFile) {
      return {
        offset,
        line: 0,
        character: 0,
      };
    }

    const lac = sourceFile.getLineAndCharacterOfPosition(offset);

    return {
      offset,
      line: lac.line,
      character: lac.character,
    };
  }

  getStartOfNode(node: TypeScriptLanguageNode, source: TypeScriptLanguageSource | null): Position {
    return this._positionOf(node.getStart(source || undefined), source);
  }
  getEndOfNode(node: TypeScriptLanguageNode, source: TypeScriptLanguageSource | null): Position {
    return this._positionOf(node.getEnd(), source);
  }
  getTextOfNode(node: TypeScriptLanguageNode, source: TypeScriptLanguageSource | null): string {
    return node.getText(source || undefined);
  }


  private _visit<ContextT>(
    node: TypeScriptLanguageNode,
    source: TypeScriptLanguageSource | null,
    visitor: LanguageVisitor<TypeScriptLanguageSource, TypeScriptLanguageNode, ContextT>,
    context?: ContextT,
  ) {
    const result = visitor(node, context);

    switch (result) {
      case VisitorResult.Stop:
        return VisitorResult.Stop;
      case VisitorResult.SkipChildren:
        return VisitorResult.Continue;
      case VisitorResult.SkipFile:
        return VisitorResult.SkipFile;

      case VisitorResult.Continue:
        const children = node.getChildren(source || undefined);
        for (const child of children) {
          const result = this._visit(child, source, visitor, context);
          if (result === VisitorResult.Stop) {
            return VisitorResult.Stop;
          } else if (result === VisitorResult.SkipFile) {
            return VisitorResult.SkipFile;
          }
        }

        return VisitorResult.Continue;
    }
  }

  getSourceForPath(path: Path): TypeScriptLanguageSource | null {
    if (!this._host.isFile(path)) {
      return null;
    }

    return this._compilerHost.getSourceFile(path, ts.ScriptTarget.Latest);
  }

  createNodeFromText(text: string, path?: Path) {
    const sourceFile = ts.createSourceFile(path || '-', text, ts.ScriptTarget.Latest, true);

    return {
      node: sourceFile,
      source: sourceFile,
    };
  }

  visitAll<ContextT>(visitor: TypeScriptLanguageVisitor<ContextT>, context?: ContextT) {
    this.allFiles.forEach(fileName => this.visitPath<ContextT>(fileName, visitor, context));
  }

  visitChildrenOfNode<ContextT>(
    node: TypeScriptLanguageNode,
    source: TypeScriptLanguageSource | null,
    visitor: TypeScriptLanguageVisitor<ContextT>,
    context?: ContextT,
  ) {
    const children = node.getChildren(source || undefined);
    for (const child of children) {
      const result = this._visit(child, source, visitor, context);
      if (result === VisitorResult.Stop) {
        return VisitorResult.Stop;
      } else if (result === VisitorResult.SkipFile) {
        return VisitorResult.SkipFile;
      }
    }

    return VisitorResult.Continue;
  }

  visitNode<ContextT>(
    node: TypeScriptLanguageNode,
    source: TypeScriptLanguageSource | null,
    visitor: TypeScriptLanguageVisitor<ContextT>,
    context?: ContextT,
  ) {
    this._visit(node, source, visitor, context);
  }

  visitPath<ContextT>(
    path: Path,
    visitor: TypeScriptLanguageVisitor<ContextT>,
    context?: ContextT,
  ) {
    const sourceFile = this.getSourceForPath(path);

    if (sourceFile === null) {
      return;
    }
    this._visit(sourceFile, sourceFile, visitor, context);
  }
}
