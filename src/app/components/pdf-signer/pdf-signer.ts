import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignService } from '../../services/sign.service';
import { SignRequest, SignResponse } from '../../models/sign-request.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-pdf-signer',
  standalone: true,
  templateUrl: './pdf-signer.html',
  styleUrls: ['./pdf-signer.scss'],
  imports: [CommonModule, FormsModule]
})
export class PdfSignerComponent implements OnInit, OnDestroy {
  selectedFile: File | null = null;
  fileName: string = '';
  fieldName: string = 'signature1';
  tokenPin: string = '';
  
  // Document metadata pentru semnătură
  nrLucrare: string = '';
  dataLucrare: string = '';
  nrAct: string = '';
  dataAct: string = '';
  
  // Coordonate pentru plasare manuală (alternativă la fieldName)
  useCoordinates: boolean = false;
  signatureX: number = 50;
  signatureY: number = 100;
  signatureWidth: number = 200;
  signatureHeight: number = 80;
  signaturePage: number = 1;
  
  isLoading: boolean = false;
  signedPdfBase64: string = '';
  signedPdfUrl: SafeResourceUrl | null = null;
  errorMessage: string = '';
  successMessage: string = '';
  serviceStatus: 'unknown' | 'online' | 'offline' = 'unknown';
  previousStatus: 'unknown' | 'online' | 'offline' = 'unknown';
  
  showInstructions: boolean = false;
  
  private statusCheckSubscription?: Subscription;
  private readonly STATUS_CHECK_INTERVAL = 10000;

  constructor(
    private signService: SignService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🚀 Component initialized');
    this.checkServiceStatus();
    this.startStatusMonitoring();
  }

  ngOnDestroy(): void {
    this.stopStatusMonitoring();
  }

  checkServiceStatus(): void {
    console.log('🔍 Checking service status...');
    this.signService.checkServiceHealth().subscribe({
      next: () => {
        console.log('✅ Health check SUCCESS - calling updateServiceStatus(online)');
        this.updateServiceStatus('online');
        this.cdr.markForCheck();
        console.log('🎨 After markForCheck, serviceStatus =', this.serviceStatus);
      },
      error: (err) => {
        console.log('❌ Health check ERROR - calling updateServiceStatus(offline)', err);
        this.updateServiceStatus('offline');
        this.cdr.markForCheck();
        console.log('🎨 After markForCheck, serviceStatus =', this.serviceStatus);
      }
    });
  }

  private startStatusMonitoring(): void {
    console.log('⏰ Starting status monitoring (every 10s)');
    this.statusCheckSubscription = interval(this.STATUS_CHECK_INTERVAL)
      .pipe(
        switchMap(() => {
          console.log('⏰ Interval tick - checking health...');
          return this.signService.checkServiceHealth();
        })
      )
      .subscribe({
        next: () => {
          this.updateServiceStatus('online');
          this.cdr.markForCheck();
        },
        error: () => {
          this.updateServiceStatus('offline');
          this.cdr.markForCheck();
        }
      });
  }

  private stopStatusMonitoring(): void {
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
      console.log('⏰ Status monitoring stopped');
    }
  }

  private updateServiceStatus(newStatus: 'online' | 'offline'): void {
    console.log('📊 updateServiceStatus called with:', newStatus);
    console.log('   Previous:', this.previousStatus, '→ New:', newStatus);
    
    this.previousStatus = this.serviceStatus;
    this.serviceStatus = newStatus;

    console.log('   serviceStatus NOW =', this.serviceStatus);

    if (this.previousStatus === 'online' && newStatus === 'offline') {
      console.warn('⚠️ ALERTĂ: SignTool daemon s-a oprit!');
      this.errorMessage = '⚠️ Serviciul de semnare s-a oprit! Te rog repornește-l.';
      this.showInstructions = true;
    }

    if (this.previousStatus === 'offline' && newStatus === 'online') {
      console.log('✅ SignTool daemon a fost repornit');
      this.errorMessage = '';
      this.showInstructions = false;
      this.successMessage = '✅ Serviciul de semnare este din nou online!';
      
      setTimeout(() => {
        this.successMessage = '';
        this.cdr.markForCheck();
      }, 5000);
    }

    const statusEmoji = newStatus === 'online' ? '✅' : '⚠️';
    console.log(`${statusEmoji} SignTool service: ${newStatus}`);
  }

  recheckStatus(): void {
    console.log('🔄 Verificare manuală status...');
    this.serviceStatus = 'unknown';
    this.cdr.markForCheck();
    this.checkServiceStatus();
  }

  toggleInstructions(): void {
    this.showInstructions = !this.showInstructions;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (file.type !== 'application/pdf') {
        this.errorMessage = 'Te rog selectează un fișier PDF valid';
        return;
      }
      
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.errorMessage = 'Fișierul este prea mare (max 10MB)';
        return;
      }
      
      this.selectedFile = file;
      this.fileName = file.name;
      this.errorMessage = '';
      this.successMessage = '';
      this.signedPdfBase64 = '';
      this.signedPdfUrl = null;
      
      console.log('📄 Fișier selectat:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
    }
  }

  async signDocument(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Te rog selectează un fișier PDF';
      return;
    }

    if (this.serviceStatus === 'offline') {
      this.errorMessage = 'Serviciul de semnare nu este disponibil. Te rog pornește SignTool daemon.';
      this.showInstructions = true;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      console.log('🔄 Convertire PDF în base64...');
      const pdfBase64 = await this.signService.fileToBase64(this.selectedFile);
      console.log(`✅ PDF convertit: ${pdfBase64.length} caractere`);

      const signRequest: SignRequest = {
        pdfBase64: pdfBase64,
        fieldName: this.useCoordinates ? '' : (this.fieldName || 'signature1'),
        tokenPin: this.tokenPin,
        nrLucrare: this.nrLucrare || undefined,
        dataLucrare: this.dataLucrare ? new Date(this.dataLucrare).toISOString() : undefined,
        nrAct: this.nrAct || undefined,
        dataAct: this.dataAct ? new Date(this.dataAct).toISOString() : undefined,
        // Trimite coordonate doar dacă useCoordinates = true
        signatureX: this.useCoordinates ? this.signatureX : undefined,
        signatureY: this.useCoordinates ? this.signatureY : undefined,
        signatureWidth: this.useCoordinates ? this.signatureWidth : undefined,
        signatureHeight: this.useCoordinates ? this.signatureHeight : undefined,
        signaturePage: this.useCoordinates ? this.signaturePage : undefined
      };

      console.log('📤 Trimitere către signTool daemon...');
      this.signService.signPdf(signRequest).subscribe({
        next: (response: SignResponse) => {
          this.handleSignSuccess(response);
        },
        error: (error: Error) => {
          this.handleSignError(error);
        }
      });

    } catch (error) {
      this.handleSignError(error as Error);
    }
  }

  private handleSignSuccess(response: SignResponse): void {
    console.log('✅ Semnare reușită:', response);
    
    this.isLoading = false;
    this.signedPdfBase64 = response.signedPdfBase64;
    
    const blobUrl = this.signService.createPdfPreviewUrl(response.signedPdfBase64);
    this.signedPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
    
    this.successMessage = `✅ Document semnat cu succes la ${new Date(response.timestamp).toLocaleString('ro-RO')}`;
    
    console.log('📊 PDF URL creat pentru preview');
  }

  private handleSignError(error: Error): void {
    this.isLoading = false;
    this.errorMessage = error.message;
    console.error('❌ Eroare la semnare:', error);
    
    if (error.message.includes('nu se poate conecta')) {
      this.showInstructions = true;
    }
  }

  downloadSignedPdf(): void {
    if (!this.signedPdfBase64) {
      console.warn('⚠️ Nu există PDF semnat pentru download');
      return;
    }

    const blob = this.signService.base64ToBlob(this.signedPdfBase64);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `signed_${this.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('📥 PDF descărcat:', `signed_${this.fileName}`);
  }

  reset(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.signedPdfBase64 = '';
    this.signedPdfUrl = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldName = 'signature1';
    this.tokenPin = '';
    this.nrLucrare = '';
    this.dataLucrare = '';
    this.nrAct = '';
    this.dataAct = '';
    this.useCoordinates = false;
    this.signatureX = 50;
    this.signatureY = 100;
    this.signatureWidth = 200;
    this.signatureHeight = 80;
    this.signaturePage = 1;
    
    console.log('🔄 Formular resetat');
  }
}