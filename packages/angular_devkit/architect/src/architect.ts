/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BaseException,
  JsonObject,
  JsonParseMode,
  Path,
  dirname,
  getSystemPath,
  join,
  logging,
  normalize,
  parseJson,
  resolve,
  schema,
  virtualFs,
} from '@angular-devkit/core';
import { resolve as nodeResolve } from '@angular-devkit/core/node';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { concatMap, map } from 'rxjs/operators';
import {
  BuildEvent,
  Runner,
  RunnerConstructor,
  RunnerContext,
  RunnerDescription,
  RunnerPaths,
  RunnerPathsMap,
} from './runner';
import { Workspace } from './workspace';


export class ProjectNotFoundException extends BaseException {
  constructor(name?: string) {
    const nameOrDefault = name ? `Project '${name}'` : `Default project`;
    super(`${nameOrDefault} could not be found in workspace.`);
  }
}

export class TargetNotFoundException extends BaseException {
  constructor(name?: string) {
    const nameOrDefault = name ? `Target '${name}'` : `Default target`;
    super(`${nameOrDefault} could not be found in workspace.`);
  }
}

export class ConfigurationNotFoundException extends BaseException {
  constructor(name: string) {
    super(`Configuration '${name}' could not be found in project.`);
  }
}

export class SchemaValidationException extends BaseException {
  constructor(errors: string[]) {
    super(`Schema validation failed with the following errors:\n  ${errors.join('\n  ')}`);
  }
}

// TODO: break this exception apart into more granular ones.
export class RunnerCannotBeResolvedException extends BaseException {
  constructor(runner: string) {
    super(`Runner '${runner}' cannot be resolved.`);
  }
}

export class WorkspaceNotYetLoadedException extends BaseException {
  constructor() { super(`Workspace needs to be loaded before Architect is used.`); }
}

export class RunnerNotFoundException extends BaseException {
  constructor(runner: string) {
    super(`Runner ${runner} could not be found.`);
  }
}

export interface Target<OptionsT = {}> {
  root: Path;
  projectType: string;
  runner: string;
  options: OptionsT;
}

export interface TargetOptions<OptionsT = {}> {
  project?: string;
  target?: string;
  configuration?: string;
  overrides?: Partial<OptionsT>;
}
export class Architect {
  private readonly _workspaceSchemaPath = join(normalize(__dirname), 'workspace-schema.json');
  private readonly _runnersSchemaPath = join(normalize(__dirname), 'runners-schema.json');
  private _workspaceSchema: JsonObject;
  private _runnersSchema: JsonObject;
  private _architectSchemasLoaded = false;
  private _runnerPathsMap = new Map<string, RunnerPaths>();
  private _runnerDescriptionMap = new Map<string, RunnerDescription>();
  private _runnerConstructorMap = new Map<string, RunnerConstructor<{}>>();
  private _workspace: Workspace;

  constructor(private _root: Path, private _host: virtualFs.Host<{}>) { }

  loadWorkspaceFromHost(workspacePath: Path) {
    return this._loadArchitectSchemas().pipe(
      concatMap(() => this._loadJsonFile(join(this._root, workspacePath))),
      concatMap(json => this.loadWorkspaceFromJson(json as {} as Workspace)),
    );
  }

  loadWorkspaceFromJson(json: Workspace) {
    return this._loadArchitectSchemas().pipe(
      concatMap(() => this._validateAgainstSchema(json, this._workspaceSchema)),
      concatMap((validatedWorkspace: Workspace) => {
        this._workspace = validatedWorkspace;

        return of(this);
      }),
    );
  }

  private _loadArchitectSchemas() {
    if (this._architectSchemasLoaded) {
      return of(null);
    } else {
      return forkJoin(
        this._loadJsonFile(this._workspaceSchemaPath),
        this._loadJsonFile(this._runnersSchemaPath),
      ).pipe(
        concatMap(([workspaceSchema, runnersSchema]) => {
          this._workspaceSchema = workspaceSchema;
          this._runnersSchema = runnersSchema;

          return of(null);
        }),
      );
    }
  }

  getTarget<OptionsT>(options: TargetOptions = {}): Target<OptionsT> {
    let { project, target: targetName } = options;
    const { configuration, overrides } = options;

    if (!this._workspace) {
      throw new WorkspaceNotYetLoadedException();
    }

    project = project || this._workspace.defaultProject as string;
    const workspaceProject = this._workspace.projects[project];

    if (!workspaceProject) {
      throw new ProjectNotFoundException(project);
    }

    targetName = targetName || workspaceProject.defaultTarget as string;
    const workspaceTarget = workspaceProject.targets[targetName];

    if (!workspaceTarget) {
      throw new TargetNotFoundException(targetName);
    }

    const workspaceTargetOptions = workspaceTarget.options;
    let workspaceConfiguration;

    if (configuration) {
      workspaceConfiguration = workspaceTarget.configurations
        && workspaceTarget.configurations[configuration];

      if (!workspaceConfiguration) {
        throw new ConfigurationNotFoundException(configuration);
      }
    }

    // Resolve root for the target.
    // TODO: add Path format to JSON schemas
    const target: Target<OptionsT> = {
      root: resolve(this._root, normalize(workspaceProject.root)),
      projectType: workspaceProject.projectType,
      runner: workspaceTarget.runner,
      options: {
        ...workspaceTargetOptions,
        ...workspaceConfiguration,
        ...overrides as {},
      } as OptionsT,
    };

    // Return a copy of the target object, JSON validation changes objects and we don't
    // want the original properties to be modified.
    return JSON.parse(JSON.stringify(target));
  }

  // Will run the target using the target.
  run<OptionsT>(
    target: Target<OptionsT>,
    partialContext: Partial<RunnerContext> = {},
  ): Observable<BuildEvent> {
    const context: RunnerContext = {
      logger: new logging.NullLogger(),
      architect: this,
      host: this._host,
      ...partialContext,
    };

    let runnerDescription: RunnerDescription;

    return this.getRunnerDescription(target).pipe(
      concatMap(description => {
        runnerDescription = description;

        return this.validateRunnerOptions(target, runnerDescription);
      }),
      map(() => this.getRunner(runnerDescription, context)),
      concatMap(runner => runner.run(target)),
    );
  }

  getRunnerDescription<OptionsT>(target: Target<OptionsT>): Observable<RunnerDescription> {
    // Check cache for this runner description.
    if (this._runnerDescriptionMap.has(target.runner)) {
      return of(this._runnerDescriptionMap.get(target.runner) as RunnerDescription);
    }

    return new Observable((obs) => {
      // TODO: this probably needs to be more like NodeModulesEngineHost.
      const basedir = getSystemPath(this._root);
      const [pkg, runnerName] = target.runner.split(':');
      const pkgJsonPath = nodeResolve(pkg, { basedir, resolvePackageJson: true });
      let runnersJsonPath: Path;
      let runnerPaths: RunnerPaths;

      // Read the `runners` entry of package.json.
      return this._loadJsonFile(normalize(pkgJsonPath)).pipe(
        concatMap((pkgJson: JsonObject) => {
          const pkgJsonRunnersEntry = pkgJson['runners'] as string;
          if (!pkgJsonRunnersEntry) {
            throw new RunnerCannotBeResolvedException(target.runner);
          }

          runnersJsonPath = join(dirname(normalize(pkgJsonPath)), pkgJsonRunnersEntry);

          return this._loadJsonFile(runnersJsonPath);
        }),
        // Validate runners json.
        concatMap((runnerPathsMap) =>
          this._validateAgainstSchema<RunnerPathsMap>(runnerPathsMap, this._runnersSchema)),
        concatMap((runnerPathsMap) => {
          runnerPaths = runnerPathsMap.runners[runnerName];

          if (!runnerPaths) {
            throw new RunnerCannotBeResolvedException(target.runner);
          }

          // Resolve paths in the runner paths.
          const runnerJsonDir = dirname(runnersJsonPath);
          runnerPaths.schema = join(runnerJsonDir, runnerPaths.schema);
          runnerPaths.class = join(runnerJsonDir, runnerPaths.class);

          // Save the runner paths so that we can lazily load the runner.
          this._runnerPathsMap.set(target.runner, runnerPaths);

          // Load the schema.
          return this._loadJsonFile(runnerPaths.schema);
        }),
        map(runnerSchema => {
          const runnerDescription = {
            name: target.runner,
            schema: runnerSchema,
            description: runnerPaths.description,
          };

          // Save to cache before returning.
          this._runnerDescriptionMap.set(runnerDescription.name, runnerDescription);

          return runnerDescription;
        }),
      ).subscribe(obs);
    });
  }

  validateRunnerOptions<OptionsT>(
    target: Target<OptionsT>, runnerDescription: RunnerDescription,
  ): Observable<OptionsT> {
    return this._validateAgainstSchema<OptionsT>(target.options, runnerDescription.schema);
  }

  getRunner<OptionsT>(
    runnerDescription: RunnerDescription, context: RunnerContext,
  ): Runner<OptionsT> {
    const name = runnerDescription.name;
    let runnerConstructor: RunnerConstructor<OptionsT>;

    // Check cache for this runner.
    if (this._runnerConstructorMap.has(name)) {
      runnerConstructor = this._runnerConstructorMap.get(name) as RunnerConstructor<OptionsT>;
    } else {
      if (!this._runnerPathsMap.has(name)) {
        throw new RunnerNotFoundException(name);
      }

      const runnerPaths = this._runnerPathsMap.get(name) as RunnerPaths;

      // TODO: support more than the default export, maybe via runner#import-name.
      const runnerModule = require(getSystemPath(runnerPaths.class));
      runnerConstructor = runnerModule['default'] as RunnerConstructor<OptionsT>;

      // Save runner to cache before returning.
      this._runnerConstructorMap.set(runnerDescription.name, runnerConstructor);
    }

    const runner = new runnerConstructor(context);

    return runner;
  }

  // Warning: this method changes contentJson in place.
  // TODO: add transforms to resolve paths.
  private _validateAgainstSchema<T = {}>(contentJson: {}, schemaJson: JsonObject): Observable<T> {
    const registry = new schema.CoreSchemaRegistry();

    return registry.compile(schemaJson).pipe(
      concatMap(validator => validator(contentJson)),
      concatMap(validatorResult => {
        if (validatorResult.success) {
          return of(contentJson as T);
        } else {
          return _throw(new SchemaValidationException(validatorResult.errors as string[]));
        }
      }),
    );
  }

  private _loadJsonFile(path: Path): Observable<JsonObject> {
    return this._host.read(normalize(path)).pipe(
      map(buffer => virtualFs.fileBufferToString(buffer)),
      map(str => parseJson(str, JsonParseMode.Loose) as {} as JsonObject),
    );
  }
}
