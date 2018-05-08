# Angular CLI v6 Commands

## Command Categories
In CLI v6 we separate commands into three categories:

### Architect Commands
These are commands that are executed through `@angular-devkit/architect`, and are represented by a builder definition in the `.angular.json` file.

The `run` command is the native Architect command. It doesn't have any special behaviour, but simply run a specific target and configuration. It accepts variable options that are parsed according to the SCHEMA of the builder.  

```bash
ng run <project>:<target>[:configuration] [...options]
```

Other Architect commands are special cases of the `run` command. There are 2 subcategories of commands:

1. `ng <command> [project] [--prod] [--configuration=<config>] [...options]`  
  Runs every target named `<command>` for every projects, with either a configuration passed in. If a `project` is specified, run the target of that specific project.  

  `--prod` is an alias for `--configuration=prod`.  

  There are 5 commands that follow this pattern:
  1. `build`
  1. `eject`
  1. `lint`
  1. `test`
  1. `xi18n`

1. `ng <command> <project> [--prod] [--configuration=<config>] [...options]`
  Same as above, but requires the project to be specified, with the explicit condition that if only a single project has the specific target it can be omitted.  
  The commands supporting this pattern are:
  1. `e2e`
  1. `serve`

#### Examples
Assuming an application with two projects (`my-app` and `e2e`):

```bash
ng build                 # equivalent to "ng run *:build"
ng build my-app          # equivalent to "ng run my-app:build"
ng build --prod          # equivalent to "ng run *:build:prod"
ng lint                  # equivalent to "ng run *:lint"
ng e2e                   # equivalent to "ng run e2e:e2e"
ng serve --prod          # equivalent to "ng run my-app:serve:prod"
ng e2e --configuration=a # equivalent to "ng run e2e:e2e:a"
ng build --prod --configuration=a  # error!
```

Assuming an application with four projects (`my-app`, `my-lib`, `e2e` and `my-lib-e2e`):

```bash
ng build                 # equivalent to "ng run *:build"
ng e2e                   # error, `my-lib` and `my-lib-e2e` both have e2e targets
ng build --prod          # error if `my-lib` does not have a prod target, for example.
```

### Schematic Commands
These are commands that relegate execution to `@angular-devkit/schematics`. They are normally running a workflow that transforms the project.

The `generate` command is the native Schematic command, and simply runs a schematic with the options passed in.

The following commands all run schematics:

1. `ng add <npm-package>`. Equivalent to installing the package, then running the `ng-add` schematic from it (as if `ng generate <npm-package>:ng-add`).
1. `ng new <name>`. Equivalent to running `ng generate @schematics/angular:application --name=<name>`.
1. `ng update`. Equivalent to running `ng generate @schematics/update:update`.

