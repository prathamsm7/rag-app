/**
 * Vector database operations service
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { getUserCollectionName } from './qdrant';

/**
 * Delete vectors from Qdrant by document ID
 */
export async function deleteVectorsByDocumentId(
  userId: string,
  documentId: string
): Promise<void> {
  const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  });

  const collectionName = getUserCollectionName(userId);
  
  try {
    // Delete all vectors with this documentId
    await qdrantClient.delete(collectionName, {
      filter: {
        must: [
          {
            key: "documentId",
            match: {
              value: documentId
            }
          }
        ]
      }
    });

    console.log(`Deleted vectors for document ${documentId} from collection ${collectionName}`);
  } catch (error) {
    console.error('Error deleting from vector store:', error);
    throw error;
  }
}
