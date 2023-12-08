import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ErrorsService {
  error = new BehaviorSubject<string | null>(null);
}
