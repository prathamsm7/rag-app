/**
 * Document filtering utilities for chat sessions
 */

export interface DocumentChunk {
  pageContent: string;
  metadata: {
    documentId?: string;
    source?: string;
    [key: string]: unknown;
  };
}

/**
 * Filter document chunks by document IDs
 * @param chunks - Array of document chunks
 * @param documentIds - Array of document IDs to filter by
 * @returns Filtered chunks that belong to the specified documents
 */
export function filterChunksByDocumentIds(
  chunks: DocumentChunk[],
  documentIds: string[]
): DocumentChunk[] {
  if (!documentIds || documentIds.length === 0) {
    return chunks;
  }

  return chunks.filter(chunk => {
    const chunkDocId = chunk.metadata?.documentId;
    return chunkDocId && documentIds.includes(chunkDocId);
  });
}

/**
 * Get unique document IDs from chunks
 * @param chunks - Array of document chunks
 * @returns Array of unique document IDs
 */
export function getDocumentIdsFromChunks(chunks: DocumentChunk[]): string[] {
  const documentIds = chunks
    .map(chunk => chunk.metadata?.documentId)
    .filter(Boolean) as string[];
  
  return [...new Set(documentIds)]; // Remove duplicates
}

/**
 * Log chunk filtering information for debugging
 * @param originalChunks - Original chunks before filtering
 * @param filteredChunks - Chunks after filtering
 * @param documentIds - Document IDs used for filtering
 */
export function logFilteringInfo(
  originalChunks: DocumentChunk[],
  filteredChunks: DocumentChunk[],
  documentIds: string[]
): void {
  const originalDocIds = getDocumentIdsFromChunks(originalChunks);
  const filteredDocIds = getDocumentIdsFromChunks(filteredChunks);
  
  console.log('Document filtering results:');
  console.log(`- Original chunks: ${originalChunks.length}`);
  console.log(`- Filtered chunks: ${filteredChunks.length}`);
  console.log(`- Expected document IDs: ${documentIds.join(', ')}`);
  console.log(`- Original chunk document IDs: ${originalDocIds.join(', ')}`);
  console.log(`- Filtered chunk document IDs: ${filteredDocIds.join(', ')}`);
}
