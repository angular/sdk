/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, tags, virtualFs } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder styles', () => {
  const extensionsWithImportSupport = ['css', 'scss', 'less', 'styl'];
  const extensionsWithVariableSupport = ['scss', 'less', 'styl'];
  const imgSvg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
    </svg>
  `;

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('supports global styles', (done) => {
    const styles: { [path: string]: string } = {
      'src/string-style.css': '.string-style { color: red }',
      'src/input-style.css': '.input-style { color: red }',
      'src/lazy-style.css': '.lazy-style { color: red }',
      'src/pre-rename-style.css': '.pre-rename-style { color: red }',
      'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
    };
    const getStylesOption = () => [
      'src/input-style.css',
      { input: 'src/lazy-style.css', bundleName: 'lazy-style', lazy: true },
      { input: 'src/pre-rename-style.css', bundleName: 'renamed-style' },
      { input: 'src/pre-rename-lazy-style.css', bundleName: 'renamed-lazy-style', lazy: true },
    ];
    const cssMatches: { [path: string]: string } = {
      './dist/styles.css': '.input-style',
      './dist/lazy-style.css': '.lazy-style',
      './dist/renamed-style.css': '.pre-rename-style',
      './dist/renamed-lazy-style.css': '.pre-rename-lazy-style',
    };
    const cssIndexMatches: { [path: string]: string } = {
      './dist/index.html': '<link rel="stylesheet" href="styles.css">'
        + '<link rel="stylesheet" href="renamed-style.css">',
    };
    const jsMatches: { [path: string]: string } = {
      './dist/styles.js': '.input-style',
      './dist/lazy-style.js': '.lazy-style',
      './dist/renamed-style.js': '.pre-rename-style',
      './dist/renamed-lazy-style.js': '.pre-rename-lazy-style',
    };
    const jsIndexMatches: { [path: string]: string } = {
      './dist/index.html': '<script type="text/javascript" src="runtime.js"></script>'
        + '<script type="text/javascript" src="polyfills.js"></script>'
        + '<script type="text/javascript" src="styles.js"></script>'
        + '<script type="text/javascript" src="renamed-style.js"></script>'
        + '<script type="text/javascript" src="vendor.js"></script>'
        + '<script type="text/javascript" src="main.js"></script>',
    };

    host.writeMultipleFiles(styles);

    const overrides = { extractCss: true, styles: getStylesOption() };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      // Check css files were created.
      tap(() => Object.keys(cssMatches).forEach(fileName => {
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(cssMatches[fileName]);
      })),
      // Check no js files are created.
      tap(() => Object.keys(jsMatches).forEach(key =>
        expect(host.scopedSync().exists(normalize(key))).toBe(false),
      )),
      // Check check index has styles in the right order.
      tap(() => Object.keys(cssIndexMatches).forEach(fileName => {
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(cssIndexMatches[fileName]);
      })),
      // Also test with extractCss false.
      concatMap(() => runTargetSpec(host, browserTargetSpec,
        { extractCss: false, styles: getStylesOption() })),
      // TODO: figure out why adding this tap breaks typings.
      // This also happens in the output-hashing spec.
      // tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      // Check js files were created.
      tap(() => Object.keys(jsMatches).forEach(fileName => {
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(jsMatches[fileName]);
      })),
      // Check no css files are created.
      tap(() => Object.keys(cssMatches).forEach(key =>
        expect(host.scopedSync().exists(normalize(key))).toBe(false),
      )),
      // Check check index has styles in the right order.
      tap(() => Object.keys(jsIndexMatches).forEach(fileName => {
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(jsIndexMatches[fileName]);
      })),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  it('supports empty styleUrls in components', (done) => {
    host.writeMultipleFiles({
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: []
        })
        export class AppComponent {
          title = 'app';
        }
      `,
    });

    const overrides = { extractCss: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  extensionsWithImportSupport.forEach(ext => {
    it(`supports imports in ${ext} files`, (done) => {
      host.writeMultipleFiles({
        [`src/styles.${ext}`]: `
          @import './imported-styles.${ext}';
          body { background-color: #00f; }
        `,
        [`src/imported-styles.${ext}`]: 'p { background-color: #f00; }',
        [`src/app/app.component.${ext}`]: `
          @import './imported-component-styles.${ext}';
          .outer {
            .inner {
              background: #fff;
            }
          }
        `,
        [`src/app/imported-component-styles.${ext}`]: 'h1 { background: #000; }',
      });

      const matches: { [path: string]: RegExp } = {
        'dist/styles.css': new RegExp(
          // The global style should be there
          /p\s*{\s*background-color: #f00;\s*}(.|\n|\r)*/.source
          // The global style via import should be there
          + /body\s*{\s*background-color: #00f;\s*}/.source,
        ),
        'dist/styles.css.map': /"mappings":".+"/,
        'dist/main.js': new RegExp(
          // The component style should be there
          /h1(.|\n|\r)*background:\s*#000(.|\n|\r)*/.source
          // The component style via import should be there
          + /.outer(.|\n|\r)*.inner(.|\n|\r)*background:\s*#[fF]+/.source,
        ),
      };

      const overrides = {
        extractCss: true,
        sourceMap: true,
        styles: [`src/styles.${ext}`],
      };

      host.replaceInFile('src/app/app.component.ts', './app.component.css',
        `./app.component.${ext}`);

      runTargetSpec(host, browserTargetSpec, overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => Object.keys(matches).forEach(fileName => {
          const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
          expect(content).toMatch(matches[fileName]);
        })),
      ).subscribe(undefined, done.fail, done);
    }, Timeout.Basic);
  });

  extensionsWithImportSupport.forEach(ext => {
    it(`supports material imports in ${ext} files`, (done) => {
      host.writeMultipleFiles({
        [`src/styles.${ext}`]: `
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
          @import "@angular/material/prebuilt-themes/indigo-pink.css";
        `,
        [`src/app/app.component.${ext}`]: `
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
          @import "@angular/material/prebuilt-themes/indigo-pink.css";
        `,
      });
      host.replaceInFile('src/app/app.component.ts', './app.component.css',
        `./app.component.${ext}`);

      const overrides = {
        extractCss: true,
        styles: [{ input: `src/styles.${ext}` }],
      };

      runTargetSpec(host, browserTargetSpec, overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      ).subscribe(undefined, done.fail, done);
    }, Timeout.Basic);
  });

  it(`supports material icons`, (done) => {
    const overrides = {
      extractCss: true,
      optimization: true,
      styles: [
        { input: '../../../../node_modules/material-design-icons/iconfont/material-icons.css' },
      ],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Complex);

  extensionsWithVariableSupport.forEach(ext => {
    it(`supports ${ext} includePaths`, (done) => {

      let variableAssignment = '';
      let variablereference = '';
      if (ext === 'scss') {
        variableAssignment = '$primary-color:';
        variablereference = '$primary-color';
      } else if (ext === 'styl') {
        variableAssignment = '$primary-color =';
        variablereference = '$primary-color';
      } else if (ext === 'less') {
        variableAssignment = '@primary-color:';
        variablereference = '@primary-color';
      }

      host.writeMultipleFiles({
        [`src/style-paths/variables.${ext}`]: `${variableAssignment} #f00;`,
        [`src/styles.${ext}`]: `
          @import 'variables';
          h1 { color: ${variablereference}; }
        `,
        [`src/app/app.component.${ext}`]: `
          @import 'variables';
          h2 { color: ${variablereference}; }
        `,
      });

      const matches: { [path: string]: RegExp } = {
        'dist/styles.css': /h1\s*{\s*color: #f00;\s*}/,
        'dist/main.js': /h2.*{.*color: #f00;.*}/,
      };

      host.replaceInFile('src/app/app.component.ts', './app.component.css',
        `./app.component.${ext}`);

      const overrides = {
        extractCss: true,
        styles: [`src/styles.${ext}`],
        stylePreprocessorOptions: {
          includePaths: ['src/style-paths'],
        },
      };

      runTargetSpec(host, browserTargetSpec, overrides).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => Object.keys(matches).forEach(fileName => {
          const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
          expect(content).toMatch(matches[fileName]);
        })),
      ).subscribe(undefined, done.fail, done);
    }, Timeout.Standard);
  });

  it('inlines resources', (done) => {
    host.copyFile('src/spectrum.png', 'src/large.png');
    host.writeMultipleFiles({
      'src/styles.scss': `
        h1 { background: url('./large.png'),
                         linear-gradient(to bottom, #0e40fa 25%, #0654f4 75%); }
        h2 { background: url('./small.svg'); }
        p  { background: url(./small-id.svg#testID); }
      `,
      'src/app/app.component.css': `
        h3 { background: url('../small.svg'); }
        h4 { background: url("../large.png"); }
      `,
      'src/small.svg': imgSvg,
      'src/small-id.svg': imgSvg,
    });

    const overrides = {
      aot: true,
      extractCss: true,
      styles: [`src/styles.scss`],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = 'dist/styles.css';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // Large image should not be inlined, and gradient should be there.
        expect(content).toMatch(
          /url\(['"]?large\.png['"]?\),\s+linear-gradient\(to bottom, #0e40fa 25%, #0654f4 75%\);/);
        // Small image should be inlined.
        expect(content).toMatch(/url\(\\?['"]data:image\/svg\+xml/);
        // Small image with param should not be inlined.
        expect(content).toMatch(/url\(['"]?small-id\.svg#testID['"]?\)/);
      }),
      tap(() => {
        const fileName = 'dist/main.js';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // Large image should not be inlined.
        expect(content).toMatch(/url\((?:['"]|\\')?large\.png(?:['"]|\\')?\)/);
        // Small image should be inlined.
        expect(content).toMatch(/url\(\\?['"]data:image\/svg\+xml/);
      }),
      tap(() => {
        expect(host.scopedSync().exists(normalize('dist/small.svg'))).toBe(false);
        expect(host.scopedSync().exists(normalize('dist/large.png'))).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/small-id.svg'))).toBe(true);
      }),
      // TODO: find a way to check logger/output for warnings.
      // if (stdout.match(/postcss-url: \.+: Can't read file '\.+', ignoring/)) {
      //   throw new Error('Expected no postcss-url file read warnings.');
      // }
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  it(`supports font-awesome imports`, (done) => {
    host.writeMultipleFiles({
      'src/styles.scss': `
        $fa-font-path: "~font-awesome/fonts";
        @import "~font-awesome/scss/font-awesome";
      `,
    });

    const overrides = { extractCss: true, styles: [`src/styles.scss`] };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it(`uses autoprefixer`, (done) => {
    host.writeMultipleFiles({
      'src/styles.css': tags.stripIndents`
        /* normal-comment */
        /*! important-comment */
        div { flex: 1 }`,
    });

    const overrides = { extractCss: true, optimization: false };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = 'dist/styles.css';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toContain(tags.stripIndents`
          /* normal-comment */
          /*! important-comment */
          div { -ms-flex: 1; flex: 1 }`);
      }),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  it(`minimizes css`, (done) => {
    host.writeMultipleFiles({
      'src/styles.css': tags.stripIndents`
        /* normal-comment */
        /*! important-comment */
        div { flex: 1 }`,
    });

    const overrides = { extractCss: true, optimization: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = 'dist/styles.css';
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toContain(
          '/*! important-comment */div{-ms-flex:1;flex:1}');
      }),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Complex);

  it(`supports bootstrap@4`, (done) => {
    const overrides = {
      extractCss: true,
      styles: ['../../../../node_modules/bootstrap/dist/css/bootstrap.css'],
      scripts: ['../../../../node_modules/bootstrap/dist/js/bootstrap.js'],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);
});
