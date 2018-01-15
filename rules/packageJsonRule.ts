/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as lint from 'tslint';
import * as ts from 'typescript';


interface PackageJsonMatchInfo {
  name: string;
  dependencies: string[];
}
const packageJsonCache = new Map<string, PackageJsonMatchInfo>();

const NODE_MODULES = [
  'child_process',
  'crypto',
  'fs',
  'https',
  'os',
  'path',
  'process',
  'url',
  'vm',
  'zlib',
];


function _findPackageJsonFromFile(filePath: string): PackageJsonMatchInfo {
  const dirPath = path.dirname(filePath);
  const maybeInfo = packageJsonCache.get(dirPath);
  if (maybeInfo) {
    return maybeInfo;
  }

  if (!dirPath || dirPath == filePath) {
    throw new Error('Could not find a package.json');
  }

  if (fs.existsSync(path.join(dirPath, 'package.json'))) {
    const content = fs.readFileSync(path.join(dirPath, 'package.json')).toString();
    const packageJson = JSON.parse(content);
    const name = packageJson.name;

    const info = {
      name,
      dependencies: [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {}),
      ],
    };
    packageJsonCache.set(dirPath, info);

    return info;
  }

  const info = _findPackageJsonFromFile(dirPath);
  packageJsonCache.set(dirPath, info);

  return info;
}

let projectFiles: Set<string>;

function _shouldCheckFile(fileName: string) {
  if (!projectFiles) {
    const regex = 'packages/**/*.ts';
    const projectBaseDir = path.join(__dirname, '../..');

    // Run the tests.
    const allFiles =
      glob.sync(regex)
        .map(p => path.relative(projectBaseDir, p));

    const tsConfigPath = path.join(projectBaseDir, 'tsconfig.json');
    const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

    const pattern = '^('
      + (tsConfig.config.exclude as string[])
        .map(ex => '('
          + ex.split(/[\/\\]/g).map(f => f
            .replace(/[\-\[\]{}()+?.^$|]/g, '\\$&')
            .replace(/^\*\*/g, '(.+?)?')
            .replace(/\*/g, '[^/\\\\]*'))
            .join('[\/\\\\]')
          + ')')
        .join('|')
      + ')($|/|\\\\)';
    const excludeRe = new RegExp(pattern);
    projectFiles = new Set(
      allFiles.filter(x => !excludeRe.test(x))
        .map(x => path.join(projectBaseDir, x)),
    );
  }

  // Spec files only uses the root package.json which we don't check here.
  return projectFiles.has(fileName)
    && !fileName.endsWith('_spec.ts');
}

export class Rule extends lint.Rules.AbstractRule {
  public static metadata: lint.IRuleMetadata = {
    ruleName: 'package-json',
    type: 'style',
    description: `Ensure imports are inside the closest package.json.`,
    rationale: `Imported packages should be listed as part of the package.json.`,
    options: null,
    optionsDescription: `Not configurable.`,
    typescriptOnly: false,
  };

  public apply(sourceFile: ts.SourceFile): lint.RuleFailure[] {
    return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
  }
}


class Walker extends lint.RuleWalker {
  walk(sourceFile: ts.SourceFile) {
    super.walk(sourceFile);

    if (!_shouldCheckFile(sourceFile.fileName)) {
      return;
    }

    const statements = sourceFile.statements;
    const imports = (
      statements.filter(s => s.kind == ts.SyntaxKind.ImportDeclaration) as ts.ImportDeclaration[]);

    const packageInfo = _findPackageJsonFromFile(sourceFile.fileName);

    for (const decl of imports) {
      const moduleSpecifier = (decl as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral;
      let moduleName = moduleSpecifier.text;
      if (moduleName.startsWith('.')) {
        continue;
      }
      if (moduleName.startsWith('@')) {
        // Need to get the scope as well.
        moduleName = moduleName.split('/').slice(0, 2).join('/');
      } else {
        moduleName = moduleName.split('/')[0];
      }

      if (NODE_MODULES.indexOf(moduleName) != -1) {
        continue;
      }

      if (packageInfo.dependencies.indexOf(moduleName) == -1) {
        this.addFailureAt(
          decl.getStart(),
          decl.getWidth(),
          'This import is not part of its package.json: ' + JSON.stringify(moduleName),
        );
      }
    }
  }
}
