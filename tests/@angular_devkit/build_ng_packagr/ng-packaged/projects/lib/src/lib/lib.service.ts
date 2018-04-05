import { Injectable } from '@angular/core';<% if (http) { %>
import { HttpClient } from '@angular/common/http';<% } %>

@Injectable()
export class LibService {

  constructor(<% if (http) { %>protected http: HttpClient<% } %>) { }

}
