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
    if (this.callForm.get('username')?.valid) {
      const username = this.callForm.get('username')?.value;
      try {
        // Create and join the room in one operation
        await this.videocallService.createAndJoinRoom(username);

        this.router.navigate([
          '/call',
          this.videocallService.currentCall?.room_id,
        ]);
      } catch (error) {
        console.error('Error during create and join:', error);
      }
    }
  }

  async joinCall() {
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
