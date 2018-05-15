/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { from } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, devServerTargetSpec, host, karmaTargetSpec, request,
  runTargetSpec, serverTargetSpec } from '../utils';

describe('Builder Defines', () => {

  beforeEach(done => {
    host.initialize().subscribe(undefined, done.fail, done);
    host.replaceInFile('.angular.json',
      /"main": "/g , `
    "defines": [
      {
        "name": "DEFINE_OPTION",
        "value": true
      },
      {
        "name": "ENV_OPTION",
        "value": "process.env.TEST_ENV_DEFINES"
      },
      {
        "name": "COMMAND_LINE_OPTION",
        "value": "customOptions.customCommandLineOption"
      },
      {
        "name": "CALC_OPTION",
        "targets": {
          "production": "283745620252 + 1",
          "development": "2 + 2"
        }
      }
    ],
    "main": "`);

    host.replaceInFile('src/app/app.component.ts',
      'title = \'app\';',
      `
          title =  'app';
          production = 'production: ' + CALC_OPTION;
          env = ENV_OPTION;
          ccol = COMMAND_LINE_OPTION;
          def = DEFINE_OPTION;
      `);

    host.replaceInFile('src/app/app.component.html',
      '</h2>',
      `</h2><h3>{{ production }} {{env}} {{ccol}} {{def}}</h3>`);

    host.replaceInFile('src/app/app.component.spec.ts',
      'it(\'should create the app\', async(() => {',
      `
      it('should render options in a h3 tag', async(() => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const text = fixture.debugElement.nativeElement.querySelector('h3').textContent;
        expect(text).toEqual('production: 4 env option set command line option set true');
      }));

      it('should create the app', async(() => {`);

    host.replaceInFile('src/app/app.component.ts',
      'import { Component } from \'@angular/core\';',
      `import { Component } from '@angular/core' ;
        declare var DEFINE_OPTION: boolean;
        declare var ENV_OPTION: string;
        declare var COMMAND_LINE_OPTION: string;
        declare var CALC_OPTION: number;
        const defineOption = DEFINE_OPTION;
        const envOption = ENV_OPTION;
        const commandlineOption = COMMAND_LINE_OPTION;
        const calcOption = CALC_OPTION;`);

    process.env['TEST_ENV_DEFINES'] = 'env option set';
  });
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  let content: string;
  [
    {
      test: () => {
        expect(content).toContain(`defineOption = true`);
        expect(content).toContain(`envOption = "env option set"`);
        expect(content).toContain(`commandlineOption = "command line option set"`);
        expect(content).toContain(`calcOption = 4`);
      },
      overrides: { customOptions: { customCommandLineOption: 'command line option set'}},
      type: 'development',
    },
    {
      test: () => {
        expect(content).not.toContain(`defineOption = true`);
        expect(content).not.toContain(`envOption = "env option set"`);
        expect(content).not.toContain(`commandlineOption = "command line option set"`);
        expect(content).not.toContain(`"calcOption = 283745620253"`);
        expect(content).toContain(`"production: 283745620253"`);
      },
      overrides: {
        customOptions: { customCommandLineOption: 'command line option set'},
        optimization: true,
      },
      type: 'production',
    },
  ].forEach(testCase => {

    if (!testCase.overrides.optimization) {
      it(`karma ${testCase.type} works`, (done) => {
        runTargetSpec(host, karmaTargetSpec, testCase.overrides).pipe(
          tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        ).subscribe(undefined, done.fail, done);
      }, Timeout.Basic);
    }


    it(`server ${testCase.type} works`, (done) => {

      const outputPath = normalize('dist-server');

      runTargetSpec(host, serverTargetSpec, testCase.overrides).pipe(
        tap((buildEvent) => {
          expect(buildEvent.success).toBe(true);
          const fileName = join(outputPath, 'main.js');
          content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
          testCase.test();
        }),
      ).subscribe(undefined, done.fail, done);
    }, Timeout.Standard);

    it(`browser ${testCase.type} works`, (done) => {

      runTargetSpec(host, browserTargetSpec, testCase.overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          content = virtualFs.fileBufferToString(host.scopedSync().read(normalize('dist/main.js')));
          testCase.test();
        }),
      ).subscribe(undefined, done.fail, done);
    }, Timeout.Standard);

    it(`devServer ${testCase.type} works`, (done) => {

      runTargetSpec(host, devServerTargetSpec, testCase.overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        concatMap(() => from(request('http://localhost:4200/main.js'))),
        tap(response => {
          content = response;
          testCase.test();
        }),
        take(1),
      ).subscribe(undefined, done.fail, done);
    }, Timeout.Basic);
  });
});
