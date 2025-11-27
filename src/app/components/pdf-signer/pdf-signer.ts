import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignService } from '../../services/sign.service';
import { SignRequest, SignResponse } from '../../models/sign-request.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
// Nu mai folosim interval și subscription pentru monitoring automat

@Component({
  selector: 'app-pdf-signer',
  standalone: true,
  templateUrl: './pdf-signer.html',
  styleUrls: ['./pdf-signer.scss'],
  imports: [CommonModule, FormsModule]
})
export class PdfSignerComponent implements OnInit {
  selectedFile: File | null = null;
  fileName: string = '';
  
  // Nouă: Imagine semnătură JPG (opțională)
  signatureImageFile: File | null = null;
  signatureImageBase64: string = '';
  signatureImageName: string = '';
  
  // Nou: Text semnătură personalizat
  signatureText: string = '';
  
  // Coordonate pentru plasare (vizibile din prima)
  signatureX: number = 350;
  signatureY: number = 700;
  signatureWidth: number = 200;
  signatureHeight: number = 80;
  signaturePage: number = 1;
  
  // Nou: Checkbox operator
  isOperator: boolean = false;
  
  isLoading: boolean = false;
  signedPdfBase64: string = '';
  signedPdfUrl: SafeResourceUrl | null = null;
  errorMessage: string = '';
  successMessage: string = '';
  serviceStatus: 'unknown' | 'online' | 'offline' = 'unknown';
  previousStatus: 'unknown' | 'online' | 'offline' = 'unknown';
  
  showInstructions: boolean = false;

  constructor(
    private signService: SignService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🚀 Component initialized');
    this.checkServiceStatus();
    // Nu mai pornim monitoring automat - doar manual cu butonul refresh
  }

  // Nu mai avem subscription de monitorizat

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

  // Monitoring eliminat - doar verificare manuală cu butonul refresh

  private updateServiceStatus(newStatus: 'online' | 'offline'): void {
    console.log('📊 updateServiceStatus called with:', newStatus);
    console.log('   Previous:', this.previousStatus, '→ New:', newStatus);
    
    this.previousStatus = this.serviceStatus;
    this.serviceStatus = newStatus;

    console.log('   serviceStatus NOW =', this.serviceStatus);

    if (newStatus === 'offline') {
      console.warn('⚠️ SignTool daemon offline');
      this.errorMessage = '⚠️ Serviciul de semnare nu este disponibil. Verifică că daemon-ul rulează.';
    }

    if (newStatus === 'online') {
      console.log('✅ SignTool daemon online');
      if (this.previousStatus === 'offline') {
        this.successMessage = '✅ Serviciul de semnare este online!';
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      }
      this.errorMessage = '';
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

  closeInstructions(): void {
    this.showInstructions = false;
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

  async onSignatureImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Te rog selectează o imagine JPG/PNG';
        return;
      }
      
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        this.errorMessage = 'Imaginea este prea mare (max 2MB)';
        return;
      }
      
      this.signatureImageFile = file;
      this.signatureImageName = file.name;
      
      // Convert to base64
      this.signatureImageBase64 = await this.signService.fileToBase64(file);
      
      this.errorMessage = '';
      console.log('🖼️ Imagine semnătură selectată:', file.name);
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
        // Nou: Trimite imaginea semnăturii (opțional)
        signatureImageBase64: this.signatureImageBase64 || undefined,
        // Nou: Text semnătură personalizat
        signatureText: this.signatureText || undefined,
        // Nou: Flag operator
        isOperator: this.isOperator,
        // Coordonate (mereu trimise)
        signatureX: this.signatureX,
        signatureY: this.signatureY,
        signatureWidth: this.signatureWidth,
        signatureHeight: this.signatureHeight,
        signaturePage: this.signaturePage
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
    
    // Forțează Angular să detecteze schimbările
    this.cdr.detectChanges();
  }

  private handleSignError(error: Error): void {
    this.isLoading = false;
    this.errorMessage = error.message;
    console.error('❌ Eroare la semnare:', error);
    
    if (error.message.includes('nu se poate conecta')) {
      this.showInstructions = true;
    }
    
    // Forțează Angular să detecteze schimbările
    this.cdr.detectChanges();
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
    
    // Reset nouă câmpuri
    this.signatureImageFile = null;
    this.signatureImageBase64 = '';
    this.signatureImageName = '';
    this.signatureText = '';
    this.isOperator = false;
    
    // Reset coordonate la valori default
    this.signatureX = 350;
    this.signatureY = 700;
    this.signatureWidth = 200;
    this.signatureHeight = 80;
    this.signaturePage = 1;
    
    console.log('🔄 Formular resetat');
  }
}