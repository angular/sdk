/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// import { Path } from '@angular-devkit/core';
import { EmptyTree, SchematicContext, Tree } from '@angular-devkit/schematics';
import { PATH_TO_PACKAGE_JSON, addDependencies } from './add-dependencies';
import { latestVersions } from './latest-versions';


describe('addDependencies()', () => {
  let host: Tree;
  let mockContext: SchematicContext;
  let debugSpy: jasmine.Spy;

  const createPackageJson = (obj = {}) => host.create(PATH_TO_PACKAGE_JSON, JSON.stringify(obj));
  const readPackageJson = () => JSON.parse((host.read(PATH_TO_PACKAGE_JSON) as Buffer).toString());

  beforeEach(() => {
    host = new EmptyTree();
    debugSpy = jasmine.createSpy('debug');
    mockContext = { logger: { debug: debugSpy } } as any;  // tslint:disable-line:no-any
  });

  it('should add the specified dependencies', () => {
    createPackageJson();
    addDependencies(['foo@latest', 'bar@next', `@baz/q-u-x@~4.2`])(host, mockContext);
    const pkg = readPackageJson();

    expect(pkg.devDependencies).toBeUndefined();
    expect(pkg.dependencies).toEqual({
      foo: 'latest',
      bar: 'next',
      '@baz/q-u-x': '~4.2',
    });

    expect(debugSpy).toHaveBeenCalledTimes(3);
    expect(debugSpy.calls.allArgs()).toEqual([
      ['Adding dependency (foo @ latest)'],
      ['Adding dependency (bar @ next)'],
      ['Adding dependency (@baz/q-u-x @ ~4.2)'],
    ]);
  });

  it('should add the specified devDependencies', () => {
    createPackageJson();
    addDependencies(['foo@latest', 'bar@next', `@baz/q-u-x@~4.2`], true)(host, mockContext);
    const pkg = readPackageJson();

    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.devDependencies).toEqual({
      foo: 'latest',
      bar: 'next',
      '@baz/q-u-x': '~4.2',
    });

    expect(debugSpy).toHaveBeenCalledTimes(3);
    expect(debugSpy.calls.allArgs()).toEqual([
      ['Adding dev dependency (foo @ latest)'],
      ['Adding dev dependency (bar @ next)'],
      ['Adding dev dependency (@baz/q-u-x @ ~4.2)'],
    ]);
  });

  it('should sort the dependencies alphabetically', () => {
    createPackageJson({ dependencies: { '@z/zz': '26', bbb: '2'} });
    addDependencies(['@c/cc@3', 'aaa@1', `yyy@25`])(host, mockContext);
    const pkg = readPackageJson();

    expect(Object.keys(pkg.dependencies)).toEqual(['@c/cc', '@z/zz', 'aaa', 'bbb', 'yyy']);
  });

  it('should sort the devDependencies alphabetically', () => {
    createPackageJson({ devDependencies: { '@z/zz': '26', bbb: '2'} });
    addDependencies(['@c/cc@3', 'aaa@1', `yyy@25`], true)(host, mockContext);
    const pkg = readPackageJson();

    expect(Object.keys(pkg.devDependencies)).toEqual(['@c/cc', '@z/zz', 'aaa', 'bbb', 'yyy']);
  });

  it('should not overwrite existing user dependencies', () => {
    createPackageJson({ dependencies: { foo: 'existing' } });
    addDependencies(['foo@added', 'bar@added'])(host, mockContext);
    const pkg = readPackageJson();

    expect(pkg.dependencies).toEqual({
      foo: 'existing',
      bar: 'added',
    });

    expect(debugSpy).toHaveBeenCalledTimes(2);
    expect(debugSpy.calls.allArgs()).toEqual([
      ['Skipping existing dependency \'foo\''],
      ['Adding dependency (bar @ added)'],
    ]);
  });

  it('should not overwrite existing user devDependencies', () => {
    createPackageJson({ devDependencies: { bar: 'existing' } });
    addDependencies(['foo@added', 'bar@added'], true)(host, mockContext);
    const pkg = readPackageJson();

    expect(pkg.devDependencies).toEqual({
      foo: 'added',
      bar: 'existing',
    });

    expect(debugSpy).toHaveBeenCalledTimes(2);
    expect(debugSpy.calls.allArgs()).toEqual([
      ['Skipping existing dev dependency \'bar\''],
      ['Adding dev dependency (foo @ added)'],
    ]);
  });

  describe('with `{{NG_VERSION}}`', () => {
    it('should use the version of `@angular/core`', () => {
      createPackageJson({ dependencies: { '@angular/core': '3.0.0-not' } });
      addDependencies(['foo@version', 'bar@{{NG_VERSION}}'], false)(host, mockContext);
      addDependencies(['baz@{{NG_VERSION}}', 'qux@version'], true)(host, mockContext);
      const pkg = readPackageJson();

      expect(pkg.dependencies).toEqual({
        '@angular/core': '3.0.0-not',
        foo: 'version',
        bar: '3.0.0-not',
      });
      expect(pkg.devDependencies).toEqual({
        baz: '3.0.0-not',
        qux: 'version',
      });
    });

    it('should use the latest Angular version if `@angular/core` is not in `dependencies`', () => {
      createPackageJson({ devDependencies: { '@angular/core': '3.0.0-not' } });
      addDependencies(['foo@version', 'bar@{{NG_VERSION}}'], false)(host, mockContext);
      addDependencies(['baz@{{NG_VERSION}}', 'qux@version'], true)(host, mockContext);
      const pkg = readPackageJson();

      expect(pkg.dependencies).toEqual({
        foo: 'version',
        bar: latestVersions.Angular,
      });
      expect(pkg.devDependencies).toEqual({
        '@angular/core': '3.0.0-not',
        baz: latestVersions.Angular,
        qux: 'version',
      });
    });
  });

  it('should throw if any dependency has no specified version', () => {
    createPackageJson();
    const rule1 = addDependencies(['foo@version', '@bar'], false);
    const rule2 = addDependencies(['baz@version', 'qux@'], true);

    expect(() => rule1(host, mockContext))
      .toThrowError('Missing version info for dependency \'@bar\'. (Expected \'@bar@<VERSION>\'.)');
    expect(() => rule2(host, mockContext))
      .toThrowError('Missing version info for dependency \'qux@\'. (Expected \'qux@<VERSION>\'.)');

    expect(readPackageJson()).toEqual({});
  });

  it('should throw if unable to read `package.json`', () => {
    spyOn(host, 'read').and.returnValue(null);
    const rule = addDependencies([]);

    expect(() => rule(host, mockContext)).toThrowError(`Could not read '${PATH_TO_PACKAGE_JSON}'.`);
  });
});
