import { redirect } from "next/navigation";

export interface TaskRedirectProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function TaskRedirectPage({ params }: TaskRedirectProps) {
  const { taskId } = await params;
  redirect(`/app/tasks/${taskId}`);
}
