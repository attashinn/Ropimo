import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getDocumentById } from "@/lib/documents/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { DocumentDetailView } from "@/components/app/document-detail-view";

interface DocumentDetailPageProps {
  params: Promise<{
    documentId: string;
  }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "ws-default";
  const workspaceName = workspace?.name || "brnnd";

  const [document, people] = await Promise.all([
    getDocumentById(documentId, workspaceId),
    getWorkspacePeople(workspaceId),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <DocumentDetailView
      document={document}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      people={people}
    />
  );
}
