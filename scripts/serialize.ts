/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging, strings } from '@angular-devkit/core';
import { SchemaClassFactory } from '@ngtools/json-schema';
import * as fs from 'fs';
import { extname } from 'path';


export function buildSchema(inFile: string, mimetype: string): string {
  const jsonSchema = JSON.parse(fs.readFileSync(inFile, 'utf-8'));
  const SchemaClass = SchemaClassFactory(jsonSchema);
  const schemaInstance = new SchemaClass({});

  let name = inFile.split(/[\/\\]/g).pop();
  if (name) {
    name = strings.classify(name.replace(/\.[^.]*$/, ''));
  }

  const license = `/**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */

    `.replace(/^ {4}/gm, '');

  return license + schemaInstance.$$serialize(mimetype, name);
}


export default function(opts: { _: string[], mimetype?: string }, logger: logging.Logger) {
  const inFile = opts._[0] as string;
  let outFile = opts._[1] as string;
  const mimetype = opts.mimetype || 'text/x.dts';

  if (!outFile) {
    const inExt = extname(inFile);
    outFile = inFile.replace(inExt, '.d.ts');
  }

  if (!inFile) {
    logger.fatal('Command serialize needs an input file.');
  } else {
    const output = buildSchema(inFile, mimetype);
    fs.writeFileSync(outFile, output, { encoding: 'utf-8' });
  }
}
