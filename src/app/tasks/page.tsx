import { redirect } from "next/navigation";

export default function TasksRootPage() {
  redirect("/app/my-tasks");
}
