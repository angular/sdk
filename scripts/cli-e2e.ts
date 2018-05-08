/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging } from '@angular-devkit/core';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { ParsedArgs } from 'minimist';
import * as os from 'os';
import * as path from 'path';

export interface CliE2eOptions {
  'nb-shards'?: number;
  shard?: number;

  'ng-version'?: string;
}


function _exec(command: string, args: string[], opts: { cwd?: string }, logger: logging.Logger) {
  logger.warn(`Running: ${command} ${args.map(x => JSON.stringify(x)).join(', ')}`);
  if (opts.cwd) {
    logger.warn(`    cwd: ${opts.cwd}`);
  }

  const process = spawn(command, args, { ...opts });
  let outBuffer = '';
  let errBuffer = '';

  return new Promise((resolve, reject) => {
    process.stdout.on('data', data => {
      outBuffer += data;

      const lines = outBuffer.split(/\r?\n/);
      if (lines.length > 0) {
        logger.info(lines.slice(0, -1).join('\n'));
        outBuffer = lines[lines.length - 1];
      }
    });
    process.stderr.on('data', data => {
      errBuffer += data;

      const lines = errBuffer.split(/\r?\n/);
      if (lines.length > 0) {
        logger.error(lines.slice(0, -1).join('\n'));
        errBuffer = lines[lines.length - 1];
      }
    });

    process.on('error', err => {
      reject(err);
    });

    process.on('close', (status) => {
      if (outBuffer) {
        logger.info(outBuffer);
      }
      if (errBuffer) {
        logger.error(errBuffer);
      }

      logger.warn('-'.repeat(80));

      if (status != 0) {
        logger.error(`Command failed with code ${status}`);
        reject(new Error());
      } else {
        resolve();
      }
    });
  });
}


export default async function (options: ParsedArgs & CliE2eOptions, logger: logging.Logger) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'angular-cli-e2e-'));
  const cwd = path.join(tmp, 'angular-cli');

  await _exec(
    'git',
    ['clone', 'https://github.com/angular/angular-cli'],
    { cwd: tmp },
    logger,
  );
  await _exec('npm', ['install'], { cwd }, logger);

  const args = ['tests/run_e2e.js', '--devkit=' + process.cwd()];
  if (options['nb-shards']) {
    if (options.shard === undefined) {
      throw new Error('ng-shards need --shard');
    }

    args.push('--nb-shards=' + options['nb-shards'], '--shard=' + options.shard);
  }
  if (options['ng-version']) {
    args.push(`--ng-version="${options['ng-version']}"`);
  }

  await _exec('node', args, { cwd }, logger);
}
