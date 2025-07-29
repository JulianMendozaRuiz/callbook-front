import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-call',
  standalone: false,
  templateUrl: './user-call.component.html',
  styleUrl: './user-call.component.css',
})
export class UserCallComponent {
  @Input() userName: string = '';
  @Input() isMicOn: boolean = true;
  @Input() isCameraOn: boolean = true;
  @Input() showTranscript: boolean = true;
}
