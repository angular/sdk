import { TestBed, inject } from '@angular/core/testing';<% if (http) { %>
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';<% } %>

import { <%= classify(name) %>Service } from './<%= dasherize(name) %>.service';

describe('<%= classify(name) %>Service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({<% if (http) { %>
      imports: [HttpClientTestingModule],<% } %>
      providers: [<%= classify(name) %>Service]
    });
  });

  it('should be created', inject([<%= classify(name) %>Service<% if (http) { %>, HttpClient, HttpTestingController<% } %>],
  (service: <%= classify(name) %>Service<% if (http) { %>, http: HttpClient, httpTestingController: HttpTestingController<% } %>) => {
    expect(service).toBeTruthy();
  }));
});
