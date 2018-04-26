// This file is required by karma.conf.js and loads recursively all the .spec and framework files

/**
 * to support auto jump into fakeAsync when using jasmine.clock()
 * feature, need to set the following flag to true
 */
// (window as any)['fakeAsyncPatchLock'] = true;

/**
 * to support rxjs scheduler such as interval or delay
 * in fakeAsync, need to load the following patch 
 */
// import 'zone.js/dist/zone-patch-rxjs-fake-async';

import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

declare const require: any;

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
// Then we find all the tests.
const context = require.context('./', true, /\.spec\.ts$/);
// And load the modules.
context.keys().map(context);
