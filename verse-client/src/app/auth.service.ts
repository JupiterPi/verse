import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";

export interface PlayerInfo {
  name: string,
  color: string,
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  player = new BehaviorSubject<PlayerInfo | null>(null);
}
