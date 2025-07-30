import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HomeService } from '../services/home/home.service';

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

  constructor(private router: Router, private homeService: HomeService) {}

  joinCall() {
    if (this.callForm.valid) {
      const callId = this.callForm.get('callId')?.value;
      const username = this.callForm.get('username')?.value;

      if (callId && username) {
        this.homeService.joinCall(callId, username).subscribe({
          next: (response) => {
            this.router.navigate(['/call', callId]);
          },
          error: (error) => {
            console.error('Error joining call:', error);
          },
        });
      }
    }
  }

  createCall() {
    if (this.callForm.get('username')?.valid) {
      const username = this.callForm.get('username')?.value;

      if (username) {
        this.homeService.createCall(username).subscribe({
          next: (response) => {
            const callId = response.callId;
            this.router.navigate(['/call', callId]);
          },
          error: (error) => {
            console.error('Error creating call:', error);
          },
        });
      }
    }
  }
}
