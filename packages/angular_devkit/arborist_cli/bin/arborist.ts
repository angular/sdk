#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Arborist, languages } from '@angular-devkit/arborist';
import { angular, first, html } from '@angular-devkit/arborist/match';
import {
  logging,
  normalize,
  resolve,
  terminal,
} from '@angular-devkit/core';
import { NodeJsSyncHost, createConsoleLogger } from '@angular-devkit/core/node';
import * as minimist from 'minimist';


const {
  blue,
  bold,
  green,
  yellow,
} = terminal;


/**
 * Show usage of the CLI tool, and exit the process.
 */
function usage(exitCode = 0): never {
  logger.info(`
    arborist query [options, ...]

    A query is a string that refers to matchers. See documentation.

    Options:
        --help                    Show this message.
        --tsconfig=path/tsconfig  Add a tsconfig host to the Arborist program.
        --html=path               Add an HTML host to the Arborist program, with path as root.

  `.replace(/^\s\s\s\s/g, ''));  // To remove the indentation.

  process.exit(exitCode);
  throw 0;  // The node typing sometimes don't have a never type for process.exit().
}


/** Parse the command line. */
const argv = minimist(process.argv.slice(2), {
  boolean: [ 'help', 'verbose' ],
  string: [ 'tsconfig', 'html' ],
});
/** Create the DevKit Logger used through the CLI. */
const logger = createConsoleLogger(argv['verbose']);

if (argv.help) {
  usage();
}


const arborist = new Arborist();
const host = new NodeJsSyncHost();

if (argv['tsconfig']) {
  const tsConfigPath = resolve(normalize(process.cwd()), normalize(argv['tsconfig']));
  arborist.registerLanguage(new languages.typescript.TypeScriptLanguage(host, tsConfigPath));
}
if (argv['html']) {
  const htmlPath = resolve(normalize(process.cwd()), normalize(argv['html']));
  arborist.registerLanguage(new languages.html.HtmlLanguage(host, htmlPath));
}
debugger;

arborist.match(angular.component())
//   first(
//     angular.inTemplate(
//       html.tagName({ startsWith: 'mat-' }),
//     ),
//   ),
// )
.subscribe(match => {
  const start = match.start;
  const end = match.end;
  logger.info(
    green(match.path || '???')
    + yellow(`@(${start.line}, ${start.character})..(${end.line}, ${end.character}) `)
    + blue(`[${match.language.name}]`) + green(':'),
  );

  new logging.IndentLogger('node-text', logger, bold(blue('|')))
    .info(match.text);
  logger.info('');
});
