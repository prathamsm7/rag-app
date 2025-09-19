import { UploadedResource } from './common';

export interface SourcesPanelProps {
  resources: UploadedResource[];
  onResourceUpload: (files: File[], type: 'pdf' | 'text' | 'website', url?: string) => void;
  onRemoveResource: (resourceId: string) => void;
  isIndexing: boolean;
}
