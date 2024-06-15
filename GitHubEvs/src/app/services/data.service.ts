import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private dataUrl = 'http://localhost:3000/data'; // URL to the backend service

  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    return this.http.get<any>(this.dataUrl).pipe(
      catchError((error) => {
        console.error('Error fetching data', error);
        return throwError('Error fetching data. Please try again later.');
      })
    );
  }
}
