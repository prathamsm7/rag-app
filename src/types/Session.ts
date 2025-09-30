export interface SessionResource {
  id: string;
  name: string;
  type: 'pdf' | 'website' | 'text';
  source: string;
  summary?: string;
  chunkCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  resources: SessionResource[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  hasResources: boolean;
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isLoading: boolean;
}
