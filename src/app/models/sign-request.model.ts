export interface SignRequest {
    pdfBase64: string;
    fieldName: string;
    tokenPin?: string;
    
    // Document metadata pentru template semnătură
    nrLucrare?: string;
    dataLucrare?: string;
    nrAct?: string;
    dataAct?: string;
    
    // Coordonate pentru plasare manuală semnătură (alternativă la fieldName)
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