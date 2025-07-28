import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'comp-call-form',
  standalone: false,
  templateUrl: './call-form.component.html',
  styleUrl: './call-form.component.css',
})
export class CallFormComponent {
  public callForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    callId: new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  joinCall() {
    // Logic to join a call
    console.log('Joining call...');
  }

  createCall() {
    // Logic to create a call
    console.log('Creating call...');
  }
}
