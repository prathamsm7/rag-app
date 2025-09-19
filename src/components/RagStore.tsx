'use client';

import { RagStoreProps } from '@/types/RagStore';

export default function RagStore({ isIndexed, isIndexing }: RagStoreProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">RAG Store</h2>
      
      <div className="bg-gray-700 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
        {isIndexing ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-300">Indexing data...</p>
          </div>
        ) : isIndexed ? (
          <div className="text-center">
            <div className="text-green-400 text-4xl mb-2">✓</div>
            <p className="text-sm text-gray-300">Data indexed successfully!</p>
            <p className="text-xs text-gray-400 mt-1">Ready for queries</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">📁</div>
            <p className="text-sm text-gray-400">No data indexed yet</p>
            <p className="text-xs text-gray-500 mt-1">Upload files or enter text to begin</p>
          </div>
        )}
      </div>

      {isIndexed && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <p className="text-sm text-green-300">
            ✓ Vector embeddings created and stored in Qdrant
          </p>
          <p className="text-xs text-green-400 mt-1">
            Ready to answer questions about your data
          </p>
        </div>
      )}
    </div>
  );
}
