export interface SignRequest {
    pdfBase64: string;
    fieldName: string;
    tokenPin?: string;
  }

  export interface SignResponse {
    signedPdfBase64: string;
    timestamp: string;
    success: boolean;
    message?: string;
  }