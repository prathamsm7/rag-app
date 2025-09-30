-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "chatSessionId" TEXT;

-- CreateIndex
CREATE INDEX "Document_chatSessionId_idx" ON "public"."Document"("chatSessionId");

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "public"."ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
