import { Component } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'callbook-front';

  constructor() {
    // Print  environment variables to console
    console.log('Environment Variables:');
    console.log('API URL:', environment);
  }
}
