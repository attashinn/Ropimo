import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Zambic Workspace",
  description: "Zambic unified team workspace",
};

export default async function DashboardRootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  } else {
    redirect("/login");
  }
}
