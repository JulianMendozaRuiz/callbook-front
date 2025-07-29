import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { callIdLengthValidator } from '../../shared/form-validators';

@Component({
  selector: 'comp-call-form',
  standalone: false,
  templateUrl: './call-form.component.html',
  styleUrl: './call-form.component.css',
})
export class CallFormComponent implements OnInit {
  callForm!: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit() {
    this.callForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(2)]],
      callId: ['', [callIdLengthValidator(6)]], // Only length validation, not required
    });
  }

  createCall() {
    // Logic to create a call
    console.log('Creating call...');
    console.log('callform', this.callForm);

    if (this.callForm.get('username')?.valid) {
      // Only need valid username to create a new call
      this.router.navigate(['/call', 'NEW123']); // API will provide actual ID
    }
  }

  joinCall() {
    // Logic to join a call
    console.log('Joining call...');
    console.log('callform', this.callForm);

    // For joining, we need both valid username AND valid call ID
    if (
      this.callForm.get('username')?.valid &&
      this.callForm.get('callId')?.valid &&
      this.callForm.get('callId')?.value?.trim()
    ) {
      this.router.navigate(['/call', this.callForm.value.callId]);
    }
  }
}
