/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Path,
  PathFragment,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { Matcher, MatcherContext } from '../../arborist/interface';
import {
  Language,
  LanguageVisitor,
  Position,
  VisitorResult,
} from '../interface';
import * as parse5 from './parse5/lib';


export type HtmlLanguageVisitor<CT> = LanguageVisitor<HtmlLanguageSource, HtmlLanguageNode, CT>;
export type HtmlLanguageMatcher = Matcher<HtmlLanguageSource, HtmlLanguageNode>;
export type HtmlLanguageMatcherContext = MatcherContext<HtmlLanguageSource, HtmlLanguageNode>;


export const HtmlLanguageToken = {};


export type HtmlLanguageSource = {
  readonly text: string;
  readonly document: parse5.AST.Default.Document;
};

export type HtmlLanguageNode = parse5.AST.Default.Element
                             | parse5.AST.Default.TextNode
                             | parse5.AST.Default.CommentNode;


export class HtmlLanguage implements Language<HtmlLanguageSource, HtmlLanguageNode> {
  private _hostPointer: virtualFs.SyncDelegateHost<{}>;
  private _host: virtualFs.SyncDelegateHost<{}>;

  constructor(host: virtualFs.Host, private _root: Path) {
    this._host = new virtualFs.SyncDelegateHost(host);
    this._hostPointer = new virtualFs.SyncDelegateHost(new virtualFs.ScopedHost(host, _root));
  }

  get allFiles() {
    const result: Path[] = [];
    const host = this._hostPointer;
    const root = this._root;

    function _recursive(p: Path) {
      if (host.isDirectory(p)) {
        host.list(p).forEach((f: PathFragment) => _recursive(join(p, f)));
      } else if (p.endsWith('.html')) {
        result.push(join(root, p));
      }
    }

    _recursive(normalize('/'));

    return result;
  }
  get name() {
    return 'HTML';
  }
  get token() {
    return HtmlLanguageToken;
  }

  private _getPositionOfOffset(offset: number, source: HtmlLanguageSource | null): Position {
    if (!source) {
      return {
        offset,
        line: -1,
        character: -1,
      };
    }

    const lines = source.text.split(/\n\r?/);
    for (let character = offset, line = 0; line < lines.length; line++) {
      if (lines[line].length >= character) {
        return {
          offset,
          line: line + 1,
          character: character + 1,
        };
      }
      character -= lines[line].length + 1;  // +1 because of \n.
    }

    return {
      offset,
      line: Infinity,
      character: Infinity,
    };
  }

  getStartOfNode(node: HtmlLanguageNode, source: HtmlLanguageSource | null): Position {
    if (!node.__location) {
      return {
        offset: -1,
        line: -1,
        character: -1,
      };
    }

    return this._getPositionOfOffset(node.__location.startOffset, source);
  }
  getEndOfNode(node: HtmlLanguageNode, source: HtmlLanguageSource | null): Position {
    if (!node.__location) {
      return {
        offset: -1,
        line: -1,
        character: -1,
      };
    }

    return this._getPositionOfOffset(node.__location.endOffset, source);
  }
  getTextOfNode(node: HtmlLanguageNode, source: HtmlLanguageSource | null): string {
    return source
      ? source.text.substring(
          this.getStartOfNode(node, source).offset,
          this.getEndOfNode(node, source).offset,
        )
      : '';
  }

  private _visitChildren<ContextT>(
    node: parse5.AST.Default.ParentNode,
    source: HtmlLanguageSource | null,
    visitor: LanguageVisitor<HtmlLanguageSource, HtmlLanguageNode, ContextT>,
    context?: ContextT,
  ) {
    const children = (('childNodes' in node) ? node.childNodes : []) as HtmlLanguageNode[];
    for (const child of children) {
      let result: VisitorResult;
      if (!(child as { __location?: parse5.MarkupData.Location }).__location) {
        if ('childNodes' in child) {
          result = this._visitChildren(
            child as parse5.AST.Default.ParentNode,
            source,
            visitor,
            context,
          );
        } else {
          continue;
        }
      } else {
        result = this._visit(child as HtmlLanguageNode, source, visitor, context);
      }
      if (result === VisitorResult.Stop) {
        return VisitorResult.Stop;
      } else if (result === VisitorResult.SkipFile) {
        return VisitorResult.SkipFile;
      }
    }

    return VisitorResult.Continue;
  }

  private _visit<ContextT>(
    node: HtmlLanguageNode,
    source: HtmlLanguageSource | null,
    visitor: LanguageVisitor<HtmlLanguageSource, HtmlLanguageNode, ContextT>,
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
        return this._visitChildren(node as parse5.AST.Default.ParentNode, source, visitor, context);
    }
  }

  getSourceForPath(path: Path): HtmlLanguageSource | null {
    const text = new Buffer(this._host.read(path)).toString();
    if (!text) {
      return null;
    }

    return {
      text,
      document: parse5.parse(text, { locationInfo: true }) as parse5.AST.Default.Document,
    };
  }

  createNodeFromText(text: string) {
    const document = parse5.parse(text, { locationInfo: true }) as parse5.AST.Default.Document;

    return {
      node: document as parse5.AST.Default.Node as HtmlLanguageNode,
      source: {
        text,
        document,
      },
    };
  }

  visitAll<ContextT>(visitor: HtmlLanguageVisitor<ContextT>, context?: ContextT) {
    this.allFiles.forEach(fileName => this.visitPath<ContextT>(fileName, visitor, context));
  }

  visitChildrenOfNode<ContextT>(
    node: HtmlLanguageNode,
    source: HtmlLanguageSource | null,
    visitor: HtmlLanguageVisitor<ContextT>,
    context?: ContextT,
  ) {
    this._visitChildren(node as parse5.AST.Default.ParentNode, source, visitor, context);
  }

  visitNode<ContextT>(
    node: HtmlLanguageNode,
    source: HtmlLanguageSource | null,
    visitor: HtmlLanguageVisitor<ContextT>,
    context?: ContextT,
  ) {
    if (node.nodeName == '#document') {
      this._visitChildren(node as parse5.AST.Default.ParentNode, source, visitor, context);
    } else {
      this._visit(node, source, visitor, context);
    }
  }

  visitPath<ContextT>(
    path: Path,
    visitor: HtmlLanguageVisitor<ContextT>,
    context?: ContextT,
  ) {
    const sourceFile = this.getSourceForPath(path);

    if (sourceFile === null) {
      return;
    }
    this._visitChildren(sourceFile.document, sourceFile, visitor, context);
  }
}
