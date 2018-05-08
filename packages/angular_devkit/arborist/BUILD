# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "arborist",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            "src/**/*_spec.ts",
            "src/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/arborist",
    module_root = "src",
    deps = [
        "//packages/angular_devkit/core",
        # @deps: rxjs
    ],
)

ts_library(
    name = "match",
    srcs = glob(
        include = ["match/**/*.ts"],
        exclude = [
            "match/**/*_spec.ts",
            "match/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/arborist/match",
    module_root = "match",
    deps = [
        "//packages/angular_devkit/arborist",
        "//packages/angular_devkit/core",
        # @deps: rxjs
    ],
)
