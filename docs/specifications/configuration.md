# Angular CLI 6.0 Configuration

## Background
Current CLI configuration (`angular-cli.json`) doesn't work very well in a post-Architect world. It also doesn't work so well with 


We need to redesign it.

## Suggestion

Have separate configurations per purpose:

1. `angular-workspace.json` containing build and project information, and
2. `angular-cli.json` containing CLI tool specific configurations.

Any additional tooling (GUI, IDE, etc) should have their own configuration.

## Workspace Filename
The workspace should be allowed to have the following names (in order of priority):

1. `angular-workspace.json`
1. `.angular-workspace.json`
1. `angular.json`
1. `.angular.json`

## Overrides

Only the tool configuration should have an override mechanism (e.g. overriding some values with user, global or organizational level values), which is specific to the tool itself. Having override for projects in a workspace doesn't make sense anyway.

## Schematics Options Resolution

When using Schematics, which require access to the 

1. Default of the schematics' schema.json
1. Specific value in the project JSON (no schema, just a list of keys => values).
1. Specific value in the CLI JSON for the command line flags (might not be understood by other tools). THIS CAN BE OVERRIDDEN BY THE GLOBAL OR ORG CONFIGURATIONS.
1. Command line specific flags.

So the logic for the CLI is:

1. Create an object that represents the flags.
1. Fill in the blanks with the CLI configuration.
1. Add the Schematics workflow which uses the project to fill in the blanks further.
1. Then the Schematic's schema.json fills in the default values.

Steps 1 and 2 should be done within the CLI. Step 3 and 4 only deal with defaults anyway and could be overridden by the tooling.

Project's workspace file would look like this:

Architect builders: lint, protractor, karma, browser, extract, dev-server

### `angular-workspace.json`

```json
{
  "name": "my-project",
  "projects": {
    "my-project": {
      // ... target / build informations
      "targets": {
        "lint": {
          "builder": "@angular-devkit/build-webpack:lint"
        },
        "serve": {
          "builder": "@angular-devkit/build-webpack:dev-server",
          "options": {
            "open": true
          },
          "configurations": {
            "production": {
              "optimization": true,
              "open": false
            }
          }
        },
        "serve2": {
          "buildSystem": "@angular-devkit/build-webpack-2:dev-server",
          "options": {
            "open": true
          },
          "configurations": {
            "production": {
              "optimization": true,
              "open": false
            }
          }
        }
      }
    }
  }
}
```

### `angular-cli.json`

```json
{
  "packageManager": "mikes-awesome-npm",
  "warnings": {
    ...
  },
  "defaults": {
    "collection": "blah",
    "commands": {
      "new": {
      },
      "generate": {
        "pipe": { "flat": true, "spec": false },
        "component": { "spec": true },
        "some-other-schematic": { "some-option": 1 }
      }
    }
  }
}
```



# Commands

```bash
# Schematic gateway
ng generate [collection:]<schematic> [options, ...]
# Architect gateway
ng run [project]:[target]:[configuration] [options, ...]

# Run a specific target's 'build' targets
ng build my-app --my-option=true

# Run a specific project 'build' targets
ng build app1 app2 --configuration=prod
`--prod == --configuration=prod`

# Run target 'build' for all projects.
ng build

# Run target 'lint' for all projects.
ng lint

# Build a production of all my projects.
ng build --prod
ng build --production
ng build --configuration=prod

# What does that do?
ng build
```

