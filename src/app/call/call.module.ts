import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CallRoutingModule } from './call-routing.module';
import { CallComponent } from './call.component';
import { UserCallComponent } from './user-call/user-call.component';

@NgModule({
  declarations: [CallComponent, UserCallComponent],
  imports: [CommonModule, CallRoutingModule],
})
export class CallModule {}
