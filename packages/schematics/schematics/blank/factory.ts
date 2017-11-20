/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonAstObject,
  JsonObject,
  JsonValue,
  Path,
  camelize,
  dasherize,
  normalize,
  parseJsonAst,
} from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  Tree,
  UpdateRecorder,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { Schema } from './schema';


function appendPropertyInAstObject(
  recorder: UpdateRecorder,
  node: JsonAstObject,
  propertyName: string,
  value: JsonValue,
  indent = 4,
) {
  const indentStr = '\n' + new Array(indent + 1).join(' ');

  if (node.properties.length > 0) {
    // Insert comma.
    const last = node.properties[node.properties.length - 1];
    recorder.insertRight(last.start.offset + last.text.replace(/\s+$/, '').length, ',');
  }

  recorder.insertLeft(
    node.end.offset - 1,
    '  '
    + `"${propertyName}": ${JSON.stringify(value, null, 2).replace(/\n/g, indentStr)}`
    + indentStr.slice(0, -2),
  );
}

function addSchematicToCollectionJson(
  collectionPath: Path,
  schematicName: string,
  description: JsonObject,
): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const collectionJsonContent = tree.read(collectionPath);
    if (!collectionJsonContent) {
      throw new Error('Invalid collection path: ' + collectionPath);
    }
    const collectionJsonAst = parseJsonAst(collectionJsonContent.toString('utf-8'));
    if (collectionJsonAst.kind !== 'object') {
      throw new Error('Invalid collection content.');
    }

    for (const property of collectionJsonAst.properties) {
      if (property.key.value == 'schematics') {
        if (property.value.kind !== 'object') {
          throw new Error('Invalid collection.json; schematics needs to be an object.');
        }

        const recorder = tree.beginUpdate(collectionPath);
        appendPropertyInAstObject(recorder, property.value, schematicName, description);
        tree.commitUpdate(recorder);

        return tree;
      }
    }

    throw new Error('Could not find the "schematics" property in collection.json.');
  };
}


export default function (options: Schema): Rule {
  const schematicsVersion = require('@angular-devkit/schematics/package.json').version;
  const coreVersion = require('@angular-devkit/core/package.json').version;

  // Verify if we need to create a full project, or just add a new schematic.
  return (tree: Tree, context: SchematicContext) => {
    let collectionPath: Path | undefined;
    try {
      const packageJsonContent = tree.read('/package.json');
      if (packageJsonContent) {
        const packageJson = JSON.parse(packageJsonContent.toString('utf-8'));
        if ('schematics' in packageJson) {
          const p = normalize(packageJson['schematics']);
          if (tree.exists(p)) {
            collectionPath = p;
          }
        }
      }
    } catch (_) {
    }

    let source = apply(url('./schematic-files'), [
        template({
          ...options as object,
          coreVersion,
          schematicsVersion,
          dot: '.',
          camelize,
          dasherize,
        }),
      ]);

    // Simply create a new schematic project.
    if (!collectionPath) {
      collectionPath = normalize('/' + options.name + '/src/collection.json');
      source = apply(url('./project-files'), [
        template({
          ...options as object,
          coreVersion,
          schematicsVersion,
          dot: '.',
          camelize,
          dasherize,
        }),
        mergeWith(source),
        move(options.name),
      ]);
    }

    return chain([
      mergeWith(source),
      addSchematicToCollectionJson(collectionPath, dasherize(options.name), {
        description: 'A blank schematic.',
        factory: './' + dasherize(options.name) + '/index#' + camelize(options.name),
      }),
    ])(tree, context);
  };
}
