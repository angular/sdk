
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { latestVersions } from './latest-versions';

interface PackageJson {
  dependencies?: Object & { [key: string]: string };
  devDependencies?: Object & { [key: string]: string };
}

export const PATH_TO_PACKAGE_JSON = '/package.json';

/**
 * Generate a `Rule` for adding the specified dependencies/devDependencies to `package.json`.
 *
 * @param depsToAdd - A list of dependencies to add in the form `<dep-name>@<version>`. Using the
 *     special value `{{NG_VERSION}}` as version, will use the same version as `@angular/core` (if
 *     present in `package.json`) or the latest Angular version.
 * @param dev - If `true`, add the specified dependencies to `devDependencies`. Default: `false`
 */
export function addDependencies(depsToAdd: string[], dev = false): Rule {
  return (host: Tree, context: SchematicContext) => {
    const buffer = host.read(PATH_TO_PACKAGE_JSON);
    if (buffer === null) {
      throw new SchematicsException(`Could not read '${PATH_TO_PACKAGE_JSON}'.`);
    }

    const pkg = JSON.parse(buffer.toString()) as PackageJson;
    const destinationKey = dev ? 'devDependencies' : 'dependencies';
    const destination = pkg[destinationKey] || {};
    const ngVersion = (pkg.dependencies && pkg.dependencies['@angular/core']) ||
                      latestVersions.Angular;

    depsToAdd
        .map(dep => {
          const [pkgName, version] = dep.split(/(?!^)@/);

          if (!version) {
            throw new SchematicsException(
                `Missing version info for dependency '${dep}'. (Expected '${pkgName}@<VERSION>'.)`);
          }

          return {pkgName, version: (version === '{{NG_VERSION}}') ? ngVersion : version};
        })
        .filter(({pkgName}) => {
          // Do not overwrite existing user dependencies.
          if (destination.hasOwnProperty(pkgName)) {
            context.logger.debug(`Skipping existing ${dev ? 'dev ' : ''}dependency '${pkgName}'`);

            return false;
          }

          return true;
        })
        .forEach(({pkgName, version}) => {
          context.logger.debug(`Adding ${dev ? 'dev ' : ''}dependency (${pkgName} @ ${version})`);
          destination[pkgName] = version;
        });

    pkg[destinationKey] = sortKeys(destination);
    host.overwrite(PATH_TO_PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');

    return host;
  };
}

// tslint:disable-next-line:no-any
function sortKeys<T extends { [key: string]: any }>(unsortedObj: T): T {
  const sortedObj = {} as T;

  Object.keys(unsortedObj)
      .sort()
      .forEach(key => sortedObj[key] = unsortedObj[key]);

  return sortedObj;
}
