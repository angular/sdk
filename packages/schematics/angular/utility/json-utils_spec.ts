/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { parseJsonAst } from '@angular-devkit/core';
import { HostTree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { insertPropertyInAstObjectInOrder } from './json-utils';

type Pojo = {
  [key: string]: string;
};

describe('json-utils', () => {
  const filePath = '/temp';
  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new HostTree());
  });

  describe('insertPropertyInAstObjectInOrder', () => {
    function runTest(obj: Pojo, prop: string, val: string): Pojo {
      const content = JSON.stringify(obj, null, 2);
      tree.create(filePath, content);
      const ast = parseJsonAst(content);
      const rec = tree.beginUpdate(filePath);
      if (ast.kind === 'object') {
        insertPropertyInAstObjectInOrder(rec, ast, prop, val, 2);
      }
      tree.commitUpdate(rec);

      return JSON.parse(tree.readContent(filePath));
    }

    it('should insert a first prop', () => {
      const obj = {
        m: 'm',
        z: 'z',
      };
      const result = runTest(obj, 'a', 'val');
      expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
    });

    it('should insert a middle prop', () => {
      const obj = {
        a: 'a',
        z: 'z',
      };
      const result = runTest(obj, 'm', 'val');
      expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
    });

    it('should insert a last prop', () => {
      const obj = {
        a: 'a',
        m: 'm',
      };
      const result = runTest(obj, 'z', 'val');
      expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
    });
  });
});
