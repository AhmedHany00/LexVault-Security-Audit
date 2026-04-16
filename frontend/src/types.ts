export interface LegalUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
export interface LegalCase {
  id: string;
  title: string;
  description: string;
  caseNumber: string;
  status: string;
  assignedLawyer?: LegalUser;
  client?: LegalUser;
  createdAt: string;
  updatedAt?: string;
}
export interface LegalDocument {
  id: string;
  title: string;
  originalFilename: string;
  fileHash: string;
  version: number;
  createdAt: string;
  uploadedBy?: LegalUser;
  case?: LegalCase | null;
}
