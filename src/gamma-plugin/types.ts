export interface GammaGenerateRequest {
  text: string;
  format?: "gamma" | "document" | "webpage" | "social";
  theme?: string;
  cardCount?: number;
  textMode?: "short" | "medium" | "long";
  imagery?: "unsplash" | "none";
  private?: boolean;
}

export interface GammaGenerateResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  creditUsed?: number;
  createdAt: string;
}

export interface GammaTheme {
  id: string;
  name: string;
  category: string;
  preview?: string;
}

export interface GammaStatusResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  downloadUrl?: string;
  creditUsed?: number;
  error?: string;
}
