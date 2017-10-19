import { ComponentFixture, TestBed, async } from '@angular/core/testing';<% if (routing) { %>
import { RouterTestingModule } from '@angular/router/testing';<% } %>

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({<% if (routing) { %>
      imports: [
        RouterTestingModule
      ],<% } %>
      declarations: [
        AppComponent
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title '<%= prefix %>'`, () => {
    expect(component.title).toEqual('<%= prefix %>');
  });

  it('should render title in a h1 tag', () => {
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Welcome to <%= prefix %>!');
  });
});
