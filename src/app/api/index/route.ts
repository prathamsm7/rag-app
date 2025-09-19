import { NextRequest, NextResponse } from 'next/server';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAI } from 'openai';

// Helper function to generate summary
async function generateSummary(documents: Array<{ pageContent: string; metadata: Record<string, unknown> }>): Promise<string> {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create context for summary generation
    const contextString = documents
      .map(doc => doc.pageContent)
      .join('\n\n')
      .substring(0, 4000); // Limit context length

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that creates concise, informative summaries of documents. 
          Create a 2-3 sentence summary that captures the main topics and key information from the provided content.
          Focus on the most important concepts and themes.`
        },
        {
          role: 'user',
          content: `Please create a summary of this document content:\n\n${contextString}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return response.choices[0].message.content || 'Summary generation failed.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Summary generation failed. Document is ready for queries.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataSource = formData.get('dataSource') as string;
    const textContent = formData.get('textContent') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    
    let allDocuments: Array<{ pageContent: string; metadata: Record<string, unknown> }> = [];
    const resourceSummaries: Array<{ resourceName: string; documents: Array<{ pageContent: string; metadata: Record<string, unknown> }> }> = [];
    
    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
    });

    // Initialize text splitter to handle large documents
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    if (dataSource === 'textarea' && textContent) {
      // Handle text input
      const textDoc = {
        pageContent: textContent,
        metadata: { source: 'text_input' },
      };
      const splitDocs = await textSplitter.splitDocuments([textDoc]);
      allDocuments = splitDocs;
      resourceSummaries.push({
        resourceName: 'Text Input',
        documents: splitDocs
      });
    } else if (dataSource === 'website' && websiteUrl) {
      // Handle website scraping
      const loader = new CheerioWebBaseLoader(websiteUrl);
      const webDocs = await loader.load();
      const splitDocs = await textSplitter.splitDocuments(webDocs);
      allDocuments = splitDocs;
      resourceSummaries.push({
        resourceName: websiteUrl,
        documents: splitDocs
      });
    } else if (dataSource === 'upload') {
      // Handle file uploads - process directly from memory
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          const file = value;
          const fileExtension = file.name.split('.').pop()?.toLowerCase();

          if (fileExtension === 'pdf') {
            // Process PDF directly from memory using Blob
            const loader = new PDFLoader(file);
            const fileDocs = await loader.load();
            const splitDocs = await textSplitter.splitDocuments(fileDocs);
            allDocuments = allDocuments.concat(splitDocs);
            resourceSummaries.push({
              resourceName: file.name,
              documents: splitDocs
            });
          } else {
            console.warn(`Unsupported file type: ${fileExtension}. Only PDF files are supported.`);
          }
        }
      }
    }

    if (allDocuments.length === 0) {
      return NextResponse.json({ error: 'No documents to index' }, { status: 400 });
    }

    // Store documents in Qdrant
    const qdrantConfig: {
      url: string;
      collectionName: string;
      apiKey?: string;
    } = {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      collectionName: 'rag-app',
    };

    // Add API key for Qdrant Cloud if available
    if (process.env.QDRANT_API_KEY) {
      qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
    }

    await QdrantVectorStore.fromDocuments(allDocuments, embeddings, qdrantConfig);

    // Generate summaries for each resource
    const summaries: Array<{ resourceName: string; summary: string }> = [];
    for (const resource of resourceSummaries) {
      const summary = await generateSummary(resource.documents);
      summaries.push({
        resourceName: resource.resourceName,
        summary: summary
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully indexed ${allDocuments.length} document chunks`,
      summaries: summaries
    });

  } catch (error) {
    console.error('Error indexing documents:', error);
    return NextResponse.json(
      { error: 'Failed to index documents' },
      { status: 500 }
    );
  }
}
