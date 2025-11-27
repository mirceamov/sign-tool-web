export interface SignRequest {
    pdfBase64: string;
    
    // Nou: Imagine semnătură (opțional)
    signatureImageBase64?: string;
    
    // Nou: Text semnătură personalizat
    signatureText?: string;
    
    // Nou: Flag operator
    isOperator?: boolean;
    
    // Coordonate pentru plasare semnătură
    signatureX?: number;
    signatureY?: number;
    signatureWidth?: number;
    signatureHeight?: number;
    signaturePage?: number;
  }

  export interface SignResponse {
    signedPdfBase64: string;
    timestamp: string;
    success: boolean;
    message?: string;
  }