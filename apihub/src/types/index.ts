export type Pricing = "Free" | "Freemium" | "Paid" | "Free trial";
export type AuthType = "No key" | "API key" | "OAuth" | "Other";
export type CorsStatus = "Yes" | "No" | "Unknown";
export type Verification = "Verified" | "Needs review" | "Unverified";
export interface ApiRecord {
  id: string; name: string; description: string; category: string; provider: string;
  website: string; docs: string; baseUrl: string; pricing: Pricing; auth: AuthType;
  rateLimit: string; https: boolean; cors: CorsStatus; beginner: boolean;
  verification: Verification; lastVerified: string; methods: string[];
  responseFormat: string; exampleEndpoint?: string;
}
