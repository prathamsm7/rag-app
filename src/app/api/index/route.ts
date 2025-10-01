import { NextRequest, NextResponse } from 'next/server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAI } from 'openai';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getUserVectorStore } from '@/lib/qdrant';

const prisma = new PrismaClient();

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
      model: 'gpt-4o-mini',
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
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const dataSource = formData.get('dataSource') as string;
    const textContent = formData.get('textContent') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    const chatSessionId = formData.get('chatSessionId') as string;
    
    let allDocuments: Array<{ pageContent: string; metadata: Record<string, unknown> }> = [];
    const resourceSummaries: Array<{ resourceName: string; documents: Array<{ pageContent: string; metadata: Record<string, unknown> }> }> = [];
    const documentsToCreate: Array<{ name: string; type: string; source: string; chunkCount: number }> = [];
    
    // Initialize text splitter to handle large documents
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });


    if (dataSource === 'textarea' && textContent) {
      // Handle text input
      const textDoc = {
        pageContent: textContent,
        metadata: { 
          source: 'text_input',
          userId: userId,
          documentType: 'text'
        },
      };
      const splitDocs = await textSplitter.splitDocuments([textDoc]);
      allDocuments = splitDocs;
      resourceSummaries.push({
        resourceName: 'Text Input',
        documents: splitDocs
      });
      documentsToCreate.push({
        name: 'Text Input',
        type: 'text',
        source: 'text_input',
        chunkCount: splitDocs.length
      });
    } else if (dataSource === 'website' && websiteUrl) {
      // Handle website scraping
      const loader = new CheerioWebBaseLoader(websiteUrl);
      const webDocs = await loader.load();
      // Add user metadata to each document
      const docsWithMetadata = webDocs.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          userId: userId,
          documentType: 'website'
        }
      }));
      const splitDocs = await textSplitter.splitDocuments(docsWithMetadata);
      allDocuments = splitDocs;
      resourceSummaries.push({
        resourceName: websiteUrl,
        documents: splitDocs
      });
      documentsToCreate.push({
        name: websiteUrl,
        type: 'website',
        source: websiteUrl,
        chunkCount: splitDocs.length
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
            // Add user metadata to each document
            const docsWithMetadata = fileDocs.map(doc => ({
              ...doc,
              metadata: {
                ...doc.metadata,
                userId: userId,
                documentType: 'pdf'
              }
            }));
            const splitDocs = await textSplitter.splitDocuments(docsWithMetadata);
            allDocuments = allDocuments.concat(splitDocs);
            resourceSummaries.push({
              resourceName: file.name,
              documents: splitDocs
            });
            documentsToCreate.push({
              name: file.name,
              type: 'pdf',
              source: file.name,
              chunkCount: splitDocs.length
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

    // Store document metadata in database first to get document IDs
    const createdDocuments = await Promise.all(
      documentsToCreate.map(async (docData) => {
        return await prisma.document.create({
          data: {
            userId: userId,
            chatSessionId: chatSessionId || null,
            name: docData.name,
            type: docData.type,
            source: docData.source,
            chunkCount: docData.chunkCount,
          }
        });
      })
    );

    // Add document IDs to the metadata of documents before storing in Qdrant
    const documentsWithIds = [];
    let docIndex = 0;
    
    for (let i = 0; i < resourceSummaries.length; i++) {
      const resource = resourceSummaries[i];
      const documentId = createdDocuments[i]?.id;
      
      // Add document ID to all chunks of this resource
      for (const doc of resource.documents) {
        documentsWithIds.push({
          ...doc,
          metadata: {
            ...doc.metadata,
            documentId: documentId
          }
        });
      }
    }

    // Store documents in user-specific Qdrant collection with document IDs
    await getUserVectorStore(userId, documentsWithIds);

    // Generate summaries for each resource and update database
    const summaries: Array<{ resourceName: string; summary: string; documentId: string }> = [];
    for (let i = 0; i < resourceSummaries.length; i++) {
      const resource = resourceSummaries[i];
      const document = createdDocuments[i];
      const summary = await generateSummary(resource.documents);
      
      // Update document with summary
      await prisma.document.update({
        where: { id: document.id },
        data: { summary: summary }
      });

      summaries.push({
        resourceName: resource.resourceName,
        summary: summary,
        documentId: document.id
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully indexed ${allDocuments.length} document chunks`,
      summaries: summaries,
      documents: createdDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        source: doc.source,
        chunkCount: doc.chunkCount,
        createdAt: doc.createdAt
      }))
    });

  } catch (error) {
    console.error('Error indexing documents:', error);
    return NextResponse.json(
      { error: 'Failed to index documents' },
      { status: 500 }
    );
  }
}
