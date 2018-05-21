/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';
import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';


export interface PackageJsonPartialType {
  scripts?: JsonObject;
  dependencies?: JsonObject;
  devDependencies?: JsonObject;
  optionalDependencies?: JsonObject;
  peerDependencies?: JsonObject;
}

const allowedSections = [
  'scripts',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

export function addToPackageJson(path: string, partialPackageJson: PackageJsonPartialType): Rule {
  return (host: Tree, context: SchematicContext) => {
    const source = host.read(path);

    if (!source) {
      throw new SchematicsException(`Could not find (${path})`);
    }

    const sourceText = source.toString('utf-8');
    const packageJson = JSON.parse(sourceText);

    for (const sectionKey of allowedSections) {
      const section = (partialPackageJson as JsonObject)[sectionKey] as JsonObject;
      if (!section) {
        continue;
      }

      if (!packageJson[sectionKey]) {
        packageJson[sectionKey] = {};
      }

      let sectionModified = false;

      for (const entryKey of Object.keys(section)) {
        if (packageJson[sectionKey][entryKey]) {
          // Keep existing versions if they are present.
          continue;
        }

        sectionModified = true;

        // Otherwise add it.
        packageJson[sectionKey][entryKey] = section[entryKey];
      }

      // If we modified the section, sort the keys alphabetically.
      if (sectionModified) {
        const sortedKeys = Object.keys(packageJson[sectionKey]).sort();
        const sortedObject: { [k: string]: string } = {};
        sortedKeys.forEach(k => sortedObject[k] = packageJson[sectionKey][k]);
        packageJson[sectionKey] = sortedObject;
      }
    }

    host.overwrite(path, JSON.stringify(packageJson, null, 2));
  };
}
