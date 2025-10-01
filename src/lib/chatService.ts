/**
 * Chat service for handling RAG-based conversations
 */

import { getUserVectorStore } from './qdrant';
import { filterChunksByDocumentIds, logFilteringInfo, DocumentChunk } from './documentFilter';

export interface ChatRequest {
  message: string;
  chatSessionId: string;
  documentIds: string[];
}

export interface ChatResponse {
  response: string;
  chatSessionId: string;
  messageId?: string;
  userMessageId?: string;
  sessionCreated?: boolean;
}

/**
 * Generate AI response using OpenAI
 */
async function generateAIResponse(
  message: string,
  contextChunks: DocumentChunk[]
): Promise<string> {
  const openai = new (await import('openai')).default({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create context string from chunks
  const contextString = contextChunks
    .map(chunk => chunk.pageContent)
    .join('\n\n');

  const systemPrompt = `
You are an AI assistant who helps resolve user queries based on the context available to you from the indexed documents.

Instructions:
- Answer based on the available context from the documents. Mention the source of information when possible.
- If the context contains relevant information, provide a helpful and detailed answer.
- If the context doesn't contain enough information to fully answer the question, mention that you dont have enough information and more details might be needed.
- Be helpful and informative while staying grounded in the provided context.

Context from documents:
${contextString}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

/**
 * Retrieve relevant document chunks for a query
 */
async function retrieveRelevantChunks(
  userId: string,
  message: string,
  documentIds: string[]
): Promise<DocumentChunk[]> {
  const store = await getUserVectorStore(userId);
  
  // Get more chunks if filtering is needed, fewer if not
  const kValue = documentIds.length > 0 ? 10 : 3;
  const vectorStore = store.asRetriever({ k: kValue });
  
  console.log(`Searching for relevant chunks (k=${kValue})...`);
  const allChunks = await vectorStore.invoke(message);
  console.log(`Found ${allChunks.length} chunks`);
  
  // Filter chunks by document IDs if provided
  if (documentIds.length > 0) {
    const filteredChunks = filterChunksByDocumentIds(allChunks, documentIds);
    logFilteringInfo(allChunks, filteredChunks, documentIds);
    return filteredChunks;
  }
  
  return allChunks;
}

/**
 * Process a chat request and generate response
 */
export async function processChatRequest(
  userId: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const { message, chatSessionId, documentIds } = request;
  
  console.log('Processing chat request:', {
    userId,
    chatSessionId,
    documentIds,
    messageLength: message.length
  });

  // Retrieve relevant chunks
  const relevantChunks = await retrieveRelevantChunks(userId, message, documentIds);
  
  if (relevantChunks.length === 0) {
    return {
      response: "I don't have enough information in the selected sources to answer your question. Please try selecting different sources or rephrasing your question.",
      chatSessionId,
    };
  }

  // Generate AI response
  const response = await generateAIResponse(message, relevantChunks);
  
  return {
    response,
    chatSessionId,
  };
}
