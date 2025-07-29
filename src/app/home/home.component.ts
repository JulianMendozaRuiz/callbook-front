import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'comp-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  public callForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    callId: new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  constructor(private router: Router) {}

  joinCall() {
    if (this.callForm.valid) {
      const callId = this.callForm.get('callId')?.value;
      this.router.navigate(['/call', callId]);
    }
  }

  createCall() {
    // Logic to create a call
    console.log('Creating call...');
  }
}
