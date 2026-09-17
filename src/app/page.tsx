import { redirect } from "next/navigation";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { UseCaseBento } from "@/components/landing/use-case-bento";
import { ProductPreview } from "@/components/landing/product-preview";
import { Features } from "@/components/landing/features";
import { Workflow } from "@/components/landing/workflow";
import { Collaboration } from "@/components/landing/collaboration";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { DesignSystemShowcase } from "@/components/landing/design-system-showcase";
import { Footer } from "@/components/landing/footer";

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;

  // If Supabase redirects auth errors (e.g. expired magic link) to Site URL (/), forward to /login
  if (params?.error || params?.error_code || params?.error_description) {
    const q = new URLSearchParams();
    if (params.error) q.set("error", String(params.error));
    if (params.error_code) q.set("error_code", String(params.error_code));
    if (params.error_description) q.set("error_description", String(params.error_description));
    redirect(`/login?${q.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F3EE] text-[#18221E] antialiased">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <UseCaseBento />
        <ProductPreview />
        <Features />
        <Workflow />
        <Collaboration />
        <Pricing />
        <FAQ />
        <DesignSystemShowcase />
      </main>
      <Footer />
    </div>
  );
}

