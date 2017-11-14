import { TestBed, async, inject } from '@angular/core/testing';

import { <%= classify(name) %>Interceptor } from './<%= dasherize(name) %>.interceptor';

describe('<%= classify(name) %>Interceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classify(name) %>Interceptor]
    });
  });

  it('should create an instance', inject([<%= classify(name) %>Interceptor], (interceptor: <%= classify(name) %>Interceptor) => {
    expect(interceptor).toBeTruthy();
  }));
});
