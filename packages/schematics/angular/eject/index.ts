/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Path,
  basename,
  dirname,
  join,
  normalize,
  relative,
  resolve,
  strings,
} from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addBuilderToProject, getWorkspace, getWorkspacePath } from '../utility/config';
import { addToPackageJson } from '../utility/package-json';
import { Schema as EjectOptions } from './schema';

export default function (options: EjectOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    const projectName = options.projectName;
    const project = workspace.projects[projectName];

    if (!project.architect || !project.architect['build']
      || project.architect['build'].builder !== '@angular-devkit/build-angular:browser') {
      throw new SchematicsException(
        `Could not find default target for the '${projectName}' project. `
        + `Please make sure it contains a target called 'build' that uses the `
        + `'@angular-devkit/build-angular:browser' builder.`,
      );
    }

    const workspaceRoot = dirname(normalize(getWorkspacePath(host)));
    const builderOptions = project.architect['build'].options;
    const projectRoot = join(workspaceRoot, project.root);
    const sourceRoot = project.sourceRoot
      ? join(workspaceRoot, project.sourceRoot)
      : join(projectRoot, 'src');
    const relativePathToWorkspaceRoot = relative(projectRoot, workspaceRoot) || './';

    // Helper to process styles/scripts array.
    // Note: this does not take into account lazy styles/scripts, which should actually get
    // their own entry point.
    const extraEntryParser = (entry: string | { input: string }) =>
      typeof entry === 'string' ? entry : entry.input;

    // Helper to process assets array.
    const assetsParser = (rawAsset: string | { glob: string, input: string, output: string }) => {
      // Normalize asset pattern.
      let asset;
      if (typeof rawAsset === 'string') {
        const assetPath = normalize(rawAsset);
        let glob: string, input: Path;

        // If it exists in the host, then it is a file and not a directory.
        if (host.exists(assetPath)) {
          glob = basename(assetPath);
          input = dirname(assetPath);
        } else {
          glob = '**/*';
          input = assetPath;
        }

        const output = relative(sourceRoot, resolve(workspaceRoot, input));
        asset = { glob, input, output };
      } else {
        asset = {
          glob: rawAsset.glob,
          input: normalize(rawAsset.input),
          output: normalize(rawAsset.output),
        };
      }

      // Convert it into CopyWebpackPlugin options.
      const context = asset.input.endsWith('/') ? asset.input : asset.input + '/';
      const to = asset.output.endsWith('/') ? asset.output : asset.output + '/';

      return {
        context,
        // Now we remove starting slash to make Webpack place it from the output root.
        to: to.replace(/^\//, ''),
        glob: asset.glob,
      };
    };

    // Required fields in builder.
    const main = builderOptions.main;
    const outputPath = builderOptions.outputPath;
    const tsConfig = builderOptions.tsConfig;
    const index = builderOptions.index;

    if (main === undefined || outputPath === undefined
      || tsConfig === undefined || index === undefined) {
      throw new SchematicsException(
        `The 'build' target of the '${projectName}' project must contain the following options: `
        + `'main', 'outputPath', 'tsConfig' and 'index'. `,
      );
    }

    // Optional fields in builder.
    const polyfills = builderOptions.polyfills;
    const assets: { context: string, to: string, glob: string }[] =
      (builderOptions.assets || []).map(assetsParser);
    const styles: string[] = (builderOptions.styles || []).map(extraEntryParser);
    const scripts: string[] = (builderOptions.scripts || []).map(extraEntryParser);

    // Compose strings to use in templates.
    const stylesTpl = styles.map(style =>
      `    path.resolve(workspaceRoot, '${style}'),`).join('\n');
    const scriptsTpl = scripts.map(script =>
      `          path.resolve(workspaceRoot, '${script}'),`).join('\n');
    // This one gets ugly. Check the 'should template assets' test to see how it should turn out.
    const assetsTpl = assets.map((asset, idx) => `{
          context: path.resolve(workspaceRoot, '${asset.context}'),
          to: '${asset.to}',
          from: { glob: '${asset.glob}', dot: true },
        }`).join(', ');

    const entryPoints = ['main'];
    if (styles) { entryPoints.unshift('styles'); }
    if (scripts) { entryPoints.unshift('scripts'); }
    if (polyfills) { entryPoints.unshift('polyfills'); }
    const entryPointsTpl = `['${entryPoints.join(`', '`)}']`;

    // New webpack builders.
    const webpackBuilderName = 'build-webpack';
    const webpackDevServerBuilderName = 'serve-webpack';
    const optionsAndConfigurations = {
      options: { webpackConfig: 'webpack.config.js' },
      configurations: {
        production: { webpackConfig: 'webpack.config.prod.js' },
      },
    };
    const webpackBuilder = {
      builder: '@angular-devkit/build-webpack:webpack',
      ...optionsAndConfigurations,
    };
    const webpackDevServerBuilder = {
      builder: '@angular-devkit/build-webpack:webpack-dev-server',
      ...optionsAndConfigurations,
    };

    // New dependencies.
    const partialPackageJson = {
      devDependencies: {
        '@ngtools/webpack': '^6.0.0',
        '@angular-devkit/build-webpack': '^6.0.0',
        'copy-webpack-plugin': '^4.5.1',
        'less': '^3.0.4',
        'less-loader': '^4.1.0',
        'mini-css-extract-plugin': '~0.4.0',
        'node-sass': '^4.9.0',
        'postcss-loader': '^2.1.5',
        'raw-loader': '^0.5.1',
        'sass-loader': '^7.0.1',
        'stylus': '^0.54.5',
        'style-loader': '^0.21.0',
        'uglifyjs-webpack-plugin': '^1.2.5',
        'webpack': '~4.8.1',
        'webpack-dev-server': '^3.1.4',
      },
    };

    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        projectRoot,
        relativePathToWorkspaceRoot,
        main,
        outputPath,
        tsConfig,
        index,
        polyfills,
        assetsTpl,
        stylesTpl,
        scriptsTpl,
        entryPointsTpl,
      }),
      move(projectRoot),
    ]);

    return chain([
      branchAndMerge(mergeWith(templateSource)),
      addBuilderToProject(projectName, webpackBuilderName, webpackBuilder),
      addBuilderToProject(projectName, webpackDevServerBuilderName, webpackDevServerBuilder),
      addToPackageJson('package.json', partialPackageJson),
      (_tree: Tree, context: SchematicContext) => {
        context.addTask(new NodePackageInstallTask());
      },
    ])(host, context);
  };
}
