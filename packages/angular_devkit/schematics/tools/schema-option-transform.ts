/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BaseException,
  schema,
} from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { of as observableOf } from 'rxjs/observable/of';
import { first } from 'rxjs/operators/first';
import { map } from 'rxjs/operators/map';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { tap } from 'rxjs/operators/tap';
import { SchematicDescription } from '../src';
import { FileSystemCollectionDescription, FileSystemSchematicDescription } from './description';

export type SchematicDesc =
  SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;


export class InvalidInputOptions extends BaseException {
  // tslint:disable-next-line:no-any
  constructor(options: any, errors: string[]) {
    super(`Schematic input does not validate against the Schema: ${JSON.stringify(options)}\n`
        + `Errors:\n  ${errors.join('\n  ')}`);
  }
}


// tslint:disable-next-line:no-any
function _deepCopy<T extends {[key: string]: any}>(object: T): T {
  return JSON.parse(JSON.stringify(object));
  // const copy = {} as T;
  // for (const key of Object.keys(object)) {
  //   if (typeof object[key] == 'object') {
  //     copy[key] = _deepCopy(object[key]);
  //     break;
  //   } else {
  //       copy[key] = object[key];
  //   }
  // }

  // return copy;
}


// This can only be used in NodeJS.
export function validateOptionsWithSchema(registry: schema.SchemaRegistry) {
  return <T extends {}>(schematic: SchematicDesc, options: T): Observable<T> => {
    // Prevent a schematic from changing the options object by making a copy of it.
    options = _deepCopy(options);

    if (schematic.schema && schematic.schemaJson) {
      // Make a deep copy of options.
      return registry
        .compile(schematic.schemaJson)
        .pipe(
          // This tap should not do anything, but if it is not here then the mergeMap below
          // does not seem to emit anything when there are multiple copies of RxJs
          // in node_modules.
          // This can be reproduced in https://github.com/filipesilva/schematics-rxjs-compat.
          // Running `npm run lib` will work, but if `rxjs@6.0.0-beta.1` is installed, which
          // forces each schematics package to have unhoist its RxJs version, then
          // schematics stops working.
          // This persists even after installing `rxjs@5.5.7` back, as long as
          // `npm ls rxjs` shows multiple RxJs packages.
          // TODO(filipesilva): followup on this.
          tap(() => {}),
          mergeMap(validator => validator(options)),
          first(),
          map(result => {
            if (!result.success) {
              throw new InvalidInputOptions(options, result.errors || ['Unknown reason.']);
            }

            return options;
          }),
        );
    }

    return observableOf(options);
  };
}
