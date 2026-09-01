import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspacePersonById, getEmployeeOnboarding } from "@/lib/people/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { EmployeeOnboardingView } from "@/components/app/people/employee-onboarding-view";

export interface EmployeeOnboardingPageProps {
  params: Promise<{
    employeeId: string;
  }>;
}

export default async function EmployeeOnboardingPage({
  params,
}: EmployeeOnboardingPageProps) {
  const { employeeId } = await params;
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    notFound();
  }

  const [person, departments] = await Promise.all([
    getWorkspacePersonById(employeeId, workspace.id),
    getWorkspaceDepartments(workspace.id),
  ]);

  if (!person) {
    notFound();
  }

  const onboarding = await getEmployeeOnboarding(person.user_id, workspace.id);

  if (!onboarding) {
    notFound();
  }

  return (
    <EmployeeOnboardingView
      person={person}
      onboarding={onboarding}
      workspace={workspace}
      userRole={workspace.role || "owner"}
      departments={departments}
    />
  );
}
