import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-call',
  standalone: false,
  templateUrl: './call.component.html',
  styleUrl: './call.component.css',
})
export class CallComponent implements OnInit {
  callId: string = '';
  showTranscript: boolean = true;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // Get call ID from route parameters
    this.callId = this.route.snapshot.paramMap.get('id') || 'Unknown';
  }

  leaveCall() {
    // Navigate back to home
    this.router.navigate(['/']);
  }

  toggleTranscript() {
    this.showTranscript = !this.showTranscript;
  }
}
