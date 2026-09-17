import { NextResponse } from "next/server";

export interface AnalyzedDepartment {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  enabled: boolean;
}

export interface CompanyAnalysisResult {
  domain: string;
  companyName: string;
  monogram: string;
  logoUrl?: string;
  summary: string;
  services: string[];
  departments: AnalyzedDepartment[];
  colors: {
    primary: string;
    accent: string;
    surface: string;
  };
}

// Preset tailored departments based on business type
const INDUSTRY_DEPARTMENTS: Record<string, AnalyzedDepartment[]> = {
  agency: [
    { id: "dept-1", name: "Creative & Design", description: "Brand identity, UI/UX, and visual assets", color: "#10251F", icon: "Palette", enabled: true },
    { id: "dept-2", name: "Development", description: "Web, mobile, and software engineering", color: "#2563EB", icon: "Code", enabled: true },
    { id: "dept-3", name: "Client Accounts", description: "Account management, deliverables, and client relations", color: "#7C3AED", icon: "Briefcase", enabled: true },
    { id: "dept-4", name: "Marketing & Growth", description: "Campaigns, SEO, and social performance", color: "#D97706", icon: "TrendingUp", enabled: true },
    { id: "dept-5", name: "Operations", description: "Resource planning, billing, and logistics", color: "#059669", icon: "FolderKanban", enabled: true },
  ],
  saas: [
    { id: "dept-1", name: "Engineering", description: "Core product development, infrastructure, and QA", color: "#10251F", icon: "Code", enabled: true },
    { id: "dept-2", name: "Product & Design", description: "Roadmaps, UX research, and UI design", color: "#7C3AED", icon: "Palette", enabled: true },
    { id: "dept-3", name: "Growth & Marketing", description: "Acquisition, demand generation, and brand", color: "#D97706", icon: "TrendingUp", enabled: true },
    { id: "dept-4", name: "Customer Success", description: "Onboarding, support, and retention", color: "#059669", icon: "Users", enabled: true },
    { id: "dept-5", name: "Operations & Finance", description: "Legal, payroll, and internal tooling", color: "#2563EB", icon: "Briefcase", enabled: false },
  ],
  general: [
    { id: "dept-1", name: "Management & Strategy", description: "Executive leadership and roadmap planning", color: "#10251F", icon: "Briefcase", enabled: true },
    { id: "dept-2", name: "Operations", description: "Day-to-day workflow, vendor relations, and facilities", color: "#059669", icon: "FolderKanban", enabled: true },
    { id: "dept-3", name: "Marketing & Sales", description: "Outreach, lead generation, and customer relations", color: "#D97706", icon: "TrendingUp", enabled: true },
    { id: "dept-4", name: "People & HR", description: "Recruiting, onboarding, and team culture", color: "#7C3AED", icon: "Users", enabled: true },
    { id: "dept-5", name: "Design & Product", description: "Creative deliverables and service execution", color: "#2563EB", icon: "Palette", enabled: false },
  ],
};

function extractHostname(rawUrl: string): string {
  let cleaned = rawUrl.trim().toLowerCase();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function formatCompanyName(domain: string): string {
  const parts = domain.split(".");
  const namePart = parts[0] || "workspace";
  if (namePart.length <= 4) {
    return namePart.toUpperCase();
  }
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid website URL or domain is required." },
        { status: 400 }
      );
    }

    const domain = extractHostname(url);
    const companyName = formatCompanyName(domain);
    const monogram = companyName.charAt(0).toUpperCase();

    let title = "";
    let description = "";
    let detectedThemeColor = "#10251F";
    let bodyText = "";

    // Attempt to scrape live website metadata with 5s timeout
    try {
      const targetUrl = `https://${domain}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RopimoCompanyIntelligence/1.0; +https://ropimo.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].trim();

        // Extract meta description
        const descMatch =
          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
        if (descMatch) description = descMatch[1].trim();

        // Extract theme-color if present
        const themeMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
        if (themeMatch && themeMatch[1].startsWith("#")) {
          detectedThemeColor = themeMatch[1];
        }

        // Clean body excerpt for keywords
        bodyText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .slice(0, 3000)
          .toLowerCase();
      }
    } catch {
      // Graceful fallback if domain is unreachable or timed out
    }

    // Heuristically detect services and business focus
    const combinedContent = `${title} ${description} ${bodyText}`.toLowerCase();

    let detectedType = "general";
    const detectedServices: string[] = [];

    if (
      combinedContent.includes("agency") ||
      combinedContent.includes("creative") ||
      combinedContent.includes("studio") ||
      combinedContent.includes("branding") ||
      combinedContent.includes("marketing") ||
      domain.includes("agency") ||
      domain.includes("design") ||
      domain.includes("brnnd")
    ) {
      detectedType = "agency";
      detectedServices.push("Brand Identity", "UI/UX & Web Design", "Digital Marketing", "Content Strategy");
    } else if (
      combinedContent.includes("software") ||
      combinedContent.includes("app") ||
      combinedContent.includes("platform") ||
      combinedContent.includes("api") ||
      combinedContent.includes("ai") ||
      combinedContent.includes("cloud") ||
      combinedContent.includes("saas")
    ) {
      detectedType = "saas";
      detectedServices.push("Cloud Infrastructure", "API & Platform", "Product Engineering", "Customer Solutions");
    } else {
      detectedServices.push("Client Services", "Product Delivery", "Business Operations", "Strategic Planning");
    }

    // Build concise, high-end summary
    let summary = description;
    if (!summary || summary.length < 20) {
      if (detectedType === "agency") {
        summary = `${companyName} delivers bespoke branding, digital experiences, and creative services for high-growth businesses.`;
      } else if (detectedType === "saas") {
        summary = `${companyName} provides high-performance software, automated infrastructure, and modern digital platform services.`;
      } else {
        summary = `${companyName} delivers specialized business solutions, client engagement, and high-impact operations.`;
      }
    } else if (summary.length > 170) {
      summary = summary.substring(0, 167) + "...";
    }

    const templateDepartments = INDUSTRY_DEPARTMENTS[detectedType] || INDUSTRY_DEPARTMENTS.general;

    const result: CompanyAnalysisResult = {
      domain,
      companyName,
      monogram,
      summary,
      services: detectedServices,
      departments: templateDepartments,
      colors: {
        primary: detectedThemeColor,
        accent: "#C7F34A",
        surface: "#FAF9F5",
      },
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Company analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze website. You can continue with manual setup." },
      { status: 500 }
    );
  }
}
