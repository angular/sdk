# NG CLI Workspace

> What should happen on `ng new`???

## CLI 1.x

Currently, `ng new my-app` creates a single application in `src/` (with the main `NgModule` in `src/app/`), with all the global files being in the root of your new application. There's no concept of projects, no support for libraries, and really only support for one application as far as e2e and linting is supported.

## CLI 6.x

CLI 6.0 will support having multiple applications, libraries and e2e tests natively, we need to revisit this layout as it doesn't make much sense.

This includes three parts; 

1. semantic information about projects (applications an libraries), for tools that need to read or understand your code structure,
1. build and tool information, for tools that need to read and understand how your tools should be configured (e.g. how to run a linter), and
1. tool-specific configuration, that is understood by the tool being run.

With Bazel, part 1 and 2 are part of the WORKSPACE and BAZEL files, while part 3 is part of `bazel.rc`. With CLI 1.x all of the three are part of `angular-cli.json` file.

The proposal for CLI 6.0 is to have 2 files; and `angular-workspace.json` (by default) which contains the semantic project information and the build information, and `angular-cli.json` which will contain ONLY CLI configurations.

Another tool, say StackBlitz or WebStorm, should use the `angular-workspace.json` file to understand the workspace structure, and their own configuration files (for WebStorm, that would be an `.idea/` folder.

## Migration
A script describing how to move from the 1.7 configuration to 6.0 will be described below.

# Source Directory Structure

There are three possible ways we can implement the schematics in 6.0;

1. keep the current `new` schematics, and only change `application` and `library`,
1. move the project in a new root folder (e.g. `projects/`), requiring a migration from the user, or
1. let the user keep its old structure, but generate new applications and libraries inside its own folder (e.g. `projects/`).

Please note that, for flexibility, `projects/` should only be a default and kept in the workspace configuration.

## Proposed Solution

Most large corporations will have custom schematics, so the tooling and `ng new` experience should focus on the more common developer experience. Most people will have one or a few libraries, two or three apps (for end-to-end the libraries) and their main application (if any).

Using solution 1 above would be messy in this context. The main application would be in `src/` while new applications would be created in `projects/`. This would be confusing for users and not very efficient.

Solution 2 would require the user to change their project and have a huge delta in a single commit.

Solution 3 is probably the best. Create new projects with a new structure where applications and libraries co-exist in a single place, but have the migration step not touch the files (other than the workspace configuration).

### Directory structure

Here's what a project with 2 applications and 2 libraries would look like. Note that this would have been created with `ng new my-app`.

```python
/
  angular-workspace.json
  angular-cli.json
  tsconfig.json  # For IDEs and Editors
  tslint.json  # By default. Apps could use per-project tslint configuration. 
  # Other files as well, like .editorconfig, etc etc.

  projects/
    my-app/
      main.ts
      tsconfig.app.json  # For the application itself.
      tsconfig.spec.json
      test.ts
      polyfills.ts
      app/
        app.module.ts
        app.component.ts
        ...

    schematics-cli/
      main.ts
      tsconfig.json

    my-app-e2e/  # For the my-app application tests proper.
      test.ts
      tsconfig.e2e.json

    my-lib1/
      tsconfig.lib.json
      tsconfig.spec.json
      package.json
      index.ts
      ...

    my-lib2/
      ... # Same as above
```

Points of interests:

1. this supports `ng generate library` in a 1.7 layout, by first creating the `projects/` directory.
1. `e2e` are considered different from applications and libraries, but don't have a special project type. They just have different targets, and they're not Angular applications (regular apps).

### Workspace Configuration
Example `angular-workspace.json` configuration for the project above:

Requirements:

1. Semantics about the project (like do I want spec files in my library)
2. Semantics about my tools (like should I use AOT by default on an app)
3. 

```js
{
  root: "projects/",

  "angular-cli": {
    "$globalOverride": "${HOME}/.angular-cli.json",
    "schematics": {
      "defaultCollection": "@schematics/angular",
    },
    "warnings": {
      "showDeprecation": false,
    }
  },
  "schematics": {
    "@schematics/angular": {
      "*": {
        skipImport: true,
        "packageManager": "yarn",
      },
      "application": {
        spec: false
      },
    }
  },

  "projects": {
    "my-app": {
      projectRoot: "projects/my-app",
      projectType: "application",

      schematics: {
        "@schematics/angular": {
          "*": {
            spec: false,
          },
        }
      },
      architect: {
        "targets": {
          "build": {
            "builder": "@angular-devkit/build-webpack:browser",
            "transforms": [
              {
                plugin: "@angular-devkit/architect-transforms:replacement",
                file: "environments/environment.ts",
                configurations: {
                  "prod": "environments/environment.prod.ts"
                }
              }
            },
            'options': {
              'outputPath': '../dist',
              'index': 'index.html',
              'main': 'main.ts',
              'polyfills': 'polyfills.ts',
              'tsConfig': 'tsconfig.app.json',
              'styles': [{ 'input': 'styles.css' }],
              'assets': [
                { 'glob': 'assets' },
                { 'glob': 'favicon.ico' },
              ],
              'progress': false
            },
            'configurations': {
              'production': {
                'optimizationLevel': 1,
                'outputHashing': 'all',
                'sourceMap': false,
                'extractCss': true,
                'namedChunks': false,
                'aot': true,
                'extractLicenses': true,
                'vendorChunk': false,
                'buildOptimizer': true
              }
            }
          }
        }
      }
    },
    "old-app" {
      root: "src"
    }
  }
}
```
