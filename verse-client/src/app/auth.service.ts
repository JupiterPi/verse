import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";

export interface Player {
  name: string,
  color: string,
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  player = new BehaviorSubject<Player | null>(null);
}