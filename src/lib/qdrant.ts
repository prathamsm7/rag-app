import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantConfig {
  url: string;
  collectionName: string;
  apiKey?: string;
}

/**
 * Get user-specific Qdrant collection name
 * @param userId - The user's ID
 * @returns Collection name for the user
 */
export function getUserCollectionName(userId: string): string {
  return `rag-app-user-${userId}`;
}

/**
 * Get Qdrant configuration for a specific user
 * @param userId - The user's ID
 * @returns Qdrant configuration object
 */
export function getUserQdrantConfig(userId: string): QdrantConfig {
  const config: QdrantConfig = {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: getUserCollectionName(userId),
  };

  // Add API key for Qdrant Cloud if available
  if (process.env.QDRANT_API_KEY) {
    config.apiKey = process.env.QDRANT_API_KEY;
  }

  return config;
}

/**
 * Initialize embeddings for user-specific operations
 * @returns OpenAI embeddings instance
 */
export function getUserEmbeddings(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    model: 'text-embedding-3-large',
  });
}

/**
 * Create or get existing Qdrant vector store for a user
 * @param userId - The user's ID
 * @param documents - Optional documents to store (for new collections)
 * @returns Qdrant vector store instance
 */
export async function getUserVectorStore(
  userId: string,
  documents?: Array<{ pageContent: string; metadata: Record<string, unknown> }>
): Promise<QdrantVectorStore> {
  const config = getUserQdrantConfig(userId);
  const embeddings = getUserEmbeddings();

  // Initialize Qdrant client to check collection existence
  const qdrantClient = new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
  });

  try {
    // Check if collection exists
    const collectionInfo = await qdrantClient.getCollection(config.collectionName);
    console.log(`Collection ${config.collectionName} exists with ${collectionInfo.points_count} points`);
    
    if (collectionInfo.points_count === 0) {
      console.log(`Collection ${config.collectionName} is empty`);
      // If collection is empty and we have documents, add them
      if (documents && documents.length > 0) {
        console.log(`Adding ${documents.length} documents to empty collection`);
        return await QdrantVectorStore.fromDocuments(documents, embeddings, config);
      } else {
        // Return empty collection - this will cause issues with queries
        console.log(`Returning empty collection - queries may fail`);
        return await QdrantVectorStore.fromExistingCollection(embeddings, config);
      }
    } else {
      // Collection exists and has data
      if (documents && documents.length > 0) {
        console.log(`Adding ${documents.length} documents to existing collection`);
        // Add documents to existing collection
        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, config);
        await vectorStore.addDocuments(documents);
        return vectorStore;
      } else {
        // Just return existing collection
        return await QdrantVectorStore.fromExistingCollection(embeddings, config);
      }
    }
  } catch (error: unknown) {
    console.log(`Collection ${config.collectionName} does not exist or error accessing it:`, error instanceof Error ? error.message : 'Unknown error');
    
    if (documents && documents.length > 0) {
      console.log(`Creating new collection with ${documents.length} documents`);
      // Create new collection with documents
      return await QdrantVectorStore.fromDocuments(documents, embeddings, config);
    } else {
      console.log(`No documents provided and collection doesn't exist - creating empty collection`);
      // Create empty collection
      return await QdrantVectorStore.fromDocuments([], embeddings, config);
    }
  }
}
