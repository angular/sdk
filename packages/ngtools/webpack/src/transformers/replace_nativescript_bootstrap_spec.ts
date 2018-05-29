/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { createTypescriptContext, transformTypescript } from './ast_helpers';
import { replaceNativeScriptBootstrap } from './replace_nativescript_bootstrap';

describe('@ngtools/webpack transformers', () => {
  describe('replace_browser_bootstrap', () => {
    it('should replace bootstrap', () => {
      const input = tags.stripIndent`
        import { platformNativeScriptDynamic } from "nativescript-angular/platform";
        import { AppModule } from "./app.module";

        platformNativeScriptDynamic().bootstrapModule(AppModule);
      `;

      // tslint:disable:max-line-length
      const output = tags.stripIndent`
        import * as __NgCli_bootstrap_1 from "./app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "nativescript-angular/platform-static";

        __NgCli_bootstrap_2.platformNativeScript().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;
      // tslint:enable:max-line-length

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceNativeScriptBootstrap(
        () => true,
        () => ({ path: '/project/src/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace bootstrap when barrel files are used', () => {
      const input = tags.stripIndent`
        import { platformNativeScriptDynamic } from "nativescript-angular/platform";
        import { AppModule } from './app';

        platformNativeScriptDynamic().bootstrapModule(AppModule);
      `;

      // tslint:disable:max-line-length
      const output = tags.stripIndent`
        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "nativescript-angular/platform-static";

        __NgCli_bootstrap_2.platformNativeScript().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;
      // tslint:enable:max-line-length

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceNativeScriptBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace bootstrap when config object is passed as argument', () => {
      const input = tags.stripIndent`
        import { platformNativeScriptDynamic } from "nativescript-angular/platform";
        import { AppModule } from './app';

        platformNativeScriptDynamic({ createFrameOnBootstrap: true }).bootstrapModule(AppModule);
      `;

      // tslint:disable:max-line-length
      const output = tags.stripIndent`
        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "nativescript-angular/platform-static";

        __NgCli_bootstrap_2.platformNativeScript({ createFrameOnBootstrap: true }).bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;
      // tslint:enable:max-line-length

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceNativeScriptBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace bootstrap when there is no entry module', () => {
      const input = tags.stripIndent`
        import { platformNativeScriptDynamic } from 'nativescript-angular/platform';

        import { AppModule } from './app.module';

        platformNativeScriptDynamic().bootstrapModule(AppModule);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceNativeScriptBootstrap(
        () => true,
        () => null,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });
  });
});
