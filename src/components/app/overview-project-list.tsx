"use client";

import * as React from "react";
import { Project } from "@/types/project";
import { PageHeader } from "@/components/app/page-header";
import { EmptyPlaceholder } from "@/components/app/empty-placeholder";
import { ProjectsIcon } from "@/components/app/nav-icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ProjectCard } from "@/components/app/project-card";
import { CreateProjectModal } from "@/components/app/create-project-modal";

export interface OverviewProjectListProps {
  workspaceId: string;
  workspaceName: string;
  projects: Project[];
}

export function OverviewProjectList({
  workspaceId,
  workspaceName,
  projects,
}: OverviewProjectListProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={`${workspaceName} Overview`}
        description="A calm command center for your team's active projects, milestones, and deliverables."
        action={
          <PrimaryButton size="sm" onClick={() => setModalOpen(true)}>
            Create Project
          </PrimaryButton>
        }
      />

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <EmptyPlaceholder
          icon={<ProjectsIcon size={24} />}
          title="No projects in this workspace yet"
          description="Get started by creating your first project workspace to organize boards, tasks, and sprint goals."
          actionLabel="Create First Project"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#65706A]">
              Active Projects ({projects.length})
            </h2>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs font-semibold text-[#18221E] hover:underline"
            >
              + New Project
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
