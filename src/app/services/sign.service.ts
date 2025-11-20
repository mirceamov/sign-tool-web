import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SignRequest, SignResponse } from '../models/sign-request.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SignService {
  private apiUrl = environment.signServiceUrl;

  constructor(private http: HttpClient) {}

  /**
   * Convertește un File în base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Elimină prefixul "data:application/pdf;base64,"
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Trimite PDF-ul pentru semnare
   */
  signPdf(request: SignRequest): Observable<SignResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<SignResponse>(
      `${this.apiUrl}/api/sign-pdf`,
      request,
      { headers }
    ).pipe(
      timeout(30000), // 30 secunde timeout
      catchError(this.handleError)
    );
  }

  /**
   * Verifică dacă serviciul local rulează
   */
  checkServiceHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/health`).pipe(
      timeout(5000),
      catchError(this.handleError)
    );
  }

  /**
   * Convertește base64 înapoi în Blob pentru download
   */
  base64ToBlob(base64: string, contentType: string = 'application/pdf'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Crează URL pentru preview PDF
   */
  createPdfPreviewUrl(base64: string): string {
    const blob = this.base64ToBlob(base64);
    return URL.createObjectURL(blob);
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'A apărut o eroare necunoscută';
    
    if (error.error instanceof ErrorEvent) {
      // Eroare client-side
      errorMessage = `Eroare: ${error.error.message}`;
    } else {
      // Eroare server-side
      if (error.status === 0) {
        errorMessage = 'Nu se poate conecta la serviciul local. Asigură-te că signTool daemon rulează pe localhost:5000';
      } else {
        errorMessage = `Eroare server: ${error.status} - ${error.message}`;
      }
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
