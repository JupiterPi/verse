import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './game/app.component';
import {HttpClientModule} from "@angular/common/http";
import {RouterModule} from "@angular/router";
import { PlayersListComponent } from './game/ui/players-list/players-list.component';

@NgModule({
  declarations: [
    AppComponent,
    PlayersListComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([
      {path: "join", component: AppComponent},
    ]),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
