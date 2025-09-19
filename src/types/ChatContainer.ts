import { UploadedResource } from './common';

export interface ChatContainerProps {
  resources: UploadedResource[];
  selectedResource: UploadedResource | null;
  onResourceSelect: (resource: UploadedResource | null) => void;
}
