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

export default function HomePage() {
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
