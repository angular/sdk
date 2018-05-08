/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path } from '@angular-devkit/core';
import { Observable, Subscriber } from 'rxjs';
import { Language, LanguageVisitor, Position, VisitorResult } from '../language/interface';
import { Match, Matcher, MatcherContext } from './interface';


export interface MatchOptions<SourceT, NodeT> {
  language?: Language<SourceT, NodeT>;
  parentContext?: MatcherContext<SourceT, NodeT> | null;
  positionMap?: (position: Position) => Position;
}


export class Arborist {
  private _languages = new Set<Language<{}, {}>>();

  constructor() {}

  registerLanguage(language: Language<{}, {}>) {
    this._languages.add(language);
  }
  getLanguageByName(languageName: string): Language<{}, {}> | null {
    for (const h of this._languages.values()) {
      if (h.name == languageName) {
        return h;
      }
    }

    return null;
  }

  createMatchFromNode<SourceT, NodeT>(
    node: NodeT,
    context: MatcherContext<SourceT, NodeT>,
    positionMap?: (position: Position) => Position,
  ): Match<NodeT> {
    const language = context.language;
    const source = context.source;

    return {
      language: language,
      path: context.path,
      node,
      get start() {
        return positionMap
          ? positionMap(language.getStartOfNode(node, source))
          : language.getStartOfNode(node, source);
      },
      get end() {
        return positionMap
          ? positionMap(language.getEndOfNode(node, source))
          : language.getEndOfNode(node, source);
      },
      get text() {
        return language.getTextOfNode(node, source);
      },
    };
  }

  createVisitorFromMatcher<SourceT, NodeT>(
    matcher: Matcher<SourceT, NodeT>,
    context: MatcherContext<SourceT, NodeT>,
    positionMap?: (position: Position) => Position,
  ): LanguageVisitor<SourceT, NodeT, MatcherContext<SourceT, NodeT>> {
    return (node: NodeT) => {
      if (context.done || context.doneFile) {
        return VisitorResult.SkipFile;
      }

      const result = matcher(node, context);
      if (result === true) {
        context.next(this.createMatchFromNode(node, context, positionMap));
      }

      return VisitorResult.Continue;
    };
  }

  private _matchFileInternal(language: Language<{}, {}>,
                             path: Path,
                             matcher: Matcher<{}, {}>,
                             parentContext: MatcherContext<{}, {}> | null,
                             obs: Subscriber<Match<{}>>,
                             stop: () => void,
                             isDone: () => boolean,
                             positionMap?: (position: Position) => Position,
  ) {
    let doneFile = false;

    const context: MatcherContext<{}, {}> = {
      arborist: this,

      path,
      language: language as Language<{}, {}>,
      source: language.getSourceForPath(path),

      parentContext: parentContext || null,

      next(match: Match<{}>) { obs.next(match); },
      complete() { obs.complete(); stop(); },
      error(err: Error) { obs.error(err); stop(); },
      stop() { obs.complete(); stop(); },
      skipFile() { doneFile = true; },

      get doneFile() { return doneFile; },
      get done() { return isDone(); },
    };

    language.visitPath(path, this.createVisitorFromMatcher(matcher, context, positionMap));
  }

  matchText<SourceT, NodeT>(
    language: Language<SourceT, NodeT>,
    text: string,
    path: Path | null,
    matcher: Matcher<SourceT, NodeT>,
    options?: MatchOptions<SourceT, NodeT>,
  ): Observable<Match<NodeT>> {
    let doneFile = false;

    return new Observable<Match<NodeT>>(obs => {
      const node = language.createNodeFromText(text, path);
      if (!node) {
        return;
      }

      const context = {
        arborist: this,

        path,
        language: language as Language<{}, {}>,
        source: node.source,

        parentContext: options && options.parentContext || null,

        next(match: Match<NodeT>) { obs.next(match); },
        complete() { obs.complete(); doneFile = true; },
        error(err: Error) { obs.error(err); doneFile = true; },
        stop() { obs.complete(); doneFile = true; },
        skipFile() { doneFile = true; },

        get doneFile() { return doneFile; },
        get done() { return doneFile; },
      };

      language.visitNode(
        node.node,
        node.source,
        this.createVisitorFromMatcher(matcher, context, options && options.positionMap),
      );
    });
  }

  matchFile<SourceT, NodeT>(
    path: Path,
    matcher: Matcher<SourceT, NodeT>,
    options?: MatchOptions<SourceT, NodeT>,
  ): Observable<Match<NodeT>> {
    let doneAll = false;

    return new Observable<Match<NodeT>>(obs => {
      this._languages.forEach(language => {
        language.allFiles.filter(p => p == path).forEach(p => {
          if (doneAll) {
            return;
          }
          this._matchFileInternal(
            language,
            p,
            matcher,
            options && options.parentContext || null,
            obs,
            () => doneAll = true,
            () => doneAll,
            options && options.positionMap,
          );
        });
      });
    });
  }

  matchLanguage<SourceT, NodeT>(
    language: Language<SourceT, NodeT>,
    matcher: Matcher<SourceT, NodeT>,
    options?: MatchOptions<SourceT, NodeT>,
  ): Observable<Match<NodeT>> {
    return new Observable(obs => {
      let done = false;
      language.allFiles.forEach(path => {
        if (done) {
          return;
        }

        this._matchFileInternal(
          language,
          path,
          matcher,
          options && options.parentContext || null,
          obs,
          () => done = true,
          () => done,
          options && options.positionMap,
        );
      });
    });
  }

  matchNode<SourceT, NodeT>(
    node: NodeT,
    path: Path | null,
    language: Language<SourceT, NodeT>,
    matcher: Matcher<SourceT, NodeT>,
  ): Observable<Match<NodeT>> {
    return new Observable<Match<NodeT>>(obs => {
      let done = false;
      const context: MatcherContext<{}, {}> = {
        arborist: this,

        path: path,
        language: language,
        source: path && language.getSourceForPath(path),

        parentContext: null,

        next(match: Match<NodeT>) { obs.next(match); },
        complete() { obs.complete(); done = true; },
        error(err: Error) { obs.error(err); done = true; },
        stop() { obs.complete(); done = true; },
        skipFile() { done = true; },

        get doneFile() { return done; },
        get done() { return done; },
      };

      language.visitNode(
        node,
        path && language.getSourceForPath(path),
        this.createVisitorFromMatcher(matcher, context),
      );
    });
  }

  submatch<SourceT, NodeT>(
    match: Match<NodeT>,
    matcher: Matcher<SourceT, NodeT>,
  ): Observable<Match<NodeT>> {
    return new Observable<Match<NodeT>>(obs => {
      let done = false;
      const context: MatcherContext<{}, {}> = {
        arborist: this,

        path: match.path,
        language: match.language,
        source: match.path && match.language.getSourceForPath(match.path),

        parentContext: null,

        next(match: Match<NodeT>) { obs.next(match); },
        complete() { obs.complete(); done = true; },
        error(err: Error) { obs.error(err); done = true; },
        stop() { obs.complete(); done = true; },
        skipFile() { done = true; },

        get doneFile() { return done; },
        get done() { return done; },
      };

      match.language.visitNode(
        match.node,
        match.path && match.language.getSourceForPath(match.path),
        this.createVisitorFromMatcher(matcher, context),
      );
    });
  }

  match<SourceT, NodeT>(
    matcher: Matcher<SourceT, NodeT>,
    options?: MatchOptions<SourceT, NodeT>,
  ): Observable<Match<NodeT>> {
    return new Observable<Match<NodeT>>(obs => {
      let done = false;
      this._languages.forEach(language => {
        if (done || (options && options.language && language !== options.language)) {
          return;
        }

        language.allFiles.forEach(path => {
          if (done) {
            return;
          }

          this._matchFileInternal(
            language,
            path,
            matcher,
            options && options.parentContext || null,
            obs,
            () => done = true,
            () => done,
            options && options.positionMap,
          );
        });
      });
      obs.complete();
    });
  }
}
