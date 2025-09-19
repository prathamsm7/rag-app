export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface UploadedResource {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'website';
  summary?: string;
  uploadDate: Date;
}
