import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { callIdLengthValidator } from '../../shared/form-validators';
import { VideocallService } from '../../services/external/videocall/videocall.service';

@Component({
  selector: 'comp-call-form',
  standalone: false,
  templateUrl: './call-form.component.html',
  styleUrl: './call-form.component.css',
})
export class CallFormComponent implements OnInit {
  callForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private videocallService: VideocallService
  ) {}

  ngOnInit() {
    this.callForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      callId: ['', []], // Only length validation, not required
    });
  }

  async createCall() {
    // Logic to create a call
    console.log('Creating call...');
    console.log('callform', this.callForm);

    if (this.callForm.get('username')?.valid) {
      // Only need valid username to create a new call
      const username = this.callForm.get('username')?.value;
      try {
        await this.videocallService.createRoomAndJoin(username);

        this.router.navigate([
          '/call',
          this.videocallService.currentCall?.room_id,
        ]);
      } catch (error) {
        console.error('Error during createRoomAndJoin:', error);
      }
    }
  }

  async joinCall() {
    // Logic to join a call
    console.log('Joining call...');
    console.log('callform', this.callForm);

    // For joining, we need both valid username AND valid call ID
    if (
      this.callForm.get('username')?.valid &&
      this.callForm.get('callId')?.valid &&
      this.callForm.get('callId')?.value?.trim()
    ) {
      const username = this.callForm.get('username')?.value;
      const callId = this.callForm.get('callId')?.value;

      try {
        await this.videocallService.joinRoom(callId, username);

        this.router.navigate([
          '/call',
          this.videocallService.currentCall?.room_id || callId,
        ]);
      } catch (error) {
        console.error('Error during joinRoom:', error);
      }
    }
  }
}
