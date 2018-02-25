import { Injectable } from '@angular/core';<% if (http) { %>
import { HttpClient } from '@angular/common/http';<% } %>

@Injectable()
export class <%= classify(name) %>Service {

  constructor(<% if (http) { %>protected http: HttpClient<% } %>) { }

}
