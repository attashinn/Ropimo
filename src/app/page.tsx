import { redirect } from "next/navigation";
import {
  Navbar,
  TaskTideHero,
  FeaturesSection,
  FeatureRows,
} from "@/components/tasktide";
import {
  LogoStrip,
  DepartmentShowcase,
  ProductShowcase,
  ComparisonSection,
  StatsRow,
  Testimonials,
  PricingSection,
  FAQSection,
  FinalCTASection,
  FooterSection,
} from "@/components/sections";

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
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] text-[#111111] antialiased selection:bg-[#111111] selection:text-white">
      {/* Grammarly-style Floating Animated Sticky Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <TaskTideHero />

        {/* Logo Strip */}
        <LogoStrip />

        {/* Interactive Department Workflow Showcase (Monday.com style) */}
        <DepartmentShowcase />

        {/* Core Workflow 3-Card Section (Untouched) */}
        <FeaturesSection />

        {/* Full Workspace Product Showcase */}
        <ProductShowcase />

        {/* Competitor Comparison Section (ClickUp, Asana, Monday, Notion) */}
        <ComparisonSection />

        {/* Alternating Feature Rows (Untouched) */}
        <FeatureRows />

        {/* Stats Counter Row */}
        <StatsRow />

        {/* Testimonials */}
        <Testimonials />

        {/* Simple Pricing */}
        <PricingSection />

        {/* Frequently Asked Questions */}
        <FAQSection />

        {/* Final CTA */}
        <FinalCTASection />
      </main>

      {/* 12. Signature Cream Footer with Giant Faded Wordmark */}
      <FooterSection />
    </div>
  );
}
