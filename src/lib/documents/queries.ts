import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DocumentItem,
  DocumentCategory,
  DocumentStatus,
  DocumentStats,
} from "@/types/documents";
import { getWorkspacePeople } from "@/lib/people/queries";
import { WorkspacePerson } from "@/types/people";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";

// Placeholder stubs — documents are not yet connected to real people data
const EMPTY_PERSON = { id: "", user_id: "", full_name: "", email: "", job_title: null, workspace_id: "", role: "member", departments: [], created_at: "", avatar_url: null } as unknown as WorkspacePerson;
const pTashin: WorkspacePerson = EMPTY_PERSON;
const pSarah: WorkspacePerson = EMPTY_PERSON;
const pRahim: WorkspacePerson = EMPTY_PERSON;
const pFatema: WorkspacePerson = EMPTY_PERSON;
const pTanjir: WorkspacePerson = EMPTY_PERSON;
const pArafath: WorkspacePerson = EMPTY_PERSON;

export const DEFAULT_DOCUMENT_STATS: DocumentStats = {
  totalDocuments: 328,
  draftsCount: 24,
  publishedCount: 218,
  sharedCount: 146,
  expiringSoonCount: 12,
  categoriesBreakdown: [
    { category: "HR", count: 68, color: "#DC2626" },
    { category: "Finance", count: 45, color: "#16A34A" },
    { category: "Operations", count: 52, color: "#2563EB" },
    { category: "Legal", count: 28, color: "#D97706" },
    { category: "Marketing", count: 41, color: "#EA580C" },
    { category: "Product", count: 34, color: "#F59E0B" },
    { category: "Procurement", count: 22, color: "#059669" },
    { category: "Other", count: 38, color: "#9333EA" },
  ],
};

export const DEFAULT_DOCUMENTS_DATA: DocumentItem[] = [
  {
    id: "doc-company-policy",
    workspace_id: "ws-default",
    title: "Company Policy Handbook",
    subtitle: "HR Policies and Guidelines",
    description: "Standard operating procedures, code of conduct, remote work guidelines, and employee expectations.",
    category: "HR",
    status: "Published",
    department_id: "dept-ops",
    department_name: "Operations",
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    author_id: "u-tashin",
    author: pTashin,
    author_name: "Tashin Khan",
    author_avatar: pTashin.avatar_url,
    access_level: "company",
    word_count: 1450,
    read_time_minutes: 6,
    last_updated: "2 hours ago",
    created_at: "2026-08-01T09:00:00Z",
    updated_at: "2026-08-21T19:00:00Z",
    content: `# Company Policy Handbook & Guidelines

## 1. Introduction & Mission
Welcome to Ropimo. Our mission is to build software that empowers modern founders, distributed teams, and fast-moving organizations to operate with complete clarity and high execution velocity.

### Core Principles
- **Extreme Ownership**: Everyone is empowered to make decisions and take responsibility for outcomes.
- **Craftsmanship & Density**: We build software with high information density, calm aesthetics, and speed.
- **Radical Candor**: Direct, respectful feedback is encouraged across all departments.

---

## 2. Working Hours & Remote Setup
Ropimo operates on a flexible, outcome-driven schedule with core overlap hours between **10:00 AM – 3:00 PM** local time.

- **Asynchronous First**: We document decisions, sprint briefs, and architectural proposals in written form before scheduling meetings.
- **Hardware & Workspace**: Every full-time teammate receives a technology stipend and standard office equipment.

---

## 3. Leave & Time-Off Policy
1. **Annual Paid Leave**: 20 standard business days per calendar year.
2. **Sick & Wellness Leave**: 10 days for recovery, mental health, and family care.
3. **Company Holidays**: Observed in accordance with regional calendars.

---

## 4. Security & Data Protection
- Two-Factor Authentication (2FA) is mandatory across all platform and cloud providers.
- Passwords must be stored in approved company password vaults.
- Customer data must never be exported to unencrypted personal drives.`,
    versions: [
      {
        id: "v-3-2",
        version_number: "3.2",
        author_name: "Tashin Khan",
        created_at: "2 hours ago",
        note: "Updated remote work equipment stipend policy",
        content: "Updated section 2 with new remote stipend details.",
      },
      {
        id: "v-3-1",
        version_number: "3.1",
        author_name: "Sarah Ahmed",
        created_at: "Yesterday",
        note: "Added visual branding guidelines section",
        content: "Added design system references.",
      },
      {
        id: "v-3-0",
        version_number: "3.0",
        author_name: "Tashin Khan",
        created_at: "Aug 15, 2026",
        note: "Initial version published for company-wide review",
        content: "Initial handbook draft.",
      },
    ],
    comments: [
      {
        id: "comm-1",
        author_name: "Sarah Ahmed",
        content: "Section 2 looks very clean! Is the equipment stipend annual or bi-annual?",
        created_at: "2 hours ago",
        resolved: false,
      },
      {
        id: "comm-2",
        author_name: "Tashin Khan",
        content: "Annual allocation for hardware upgrades, with immediate coverage for replacements.",
        created_at: "1 hour ago",
        resolved: true,
      },
    ],
  },
  {
    id: "doc-onboarding-guide",
    workspace_id: "ws-default",
    title: "Onboarding Process Guide",
    subtitle: "New Employee Onboarding",
    description: "Step-by-step checklist for Day 1, Week 1, and first 30 days for new team members.",
    category: "HR",
    status: "Published",
    department_id: "dept-ops",
    department_name: "Operations",
    project_id: null,
    project_name: null,
    author_id: "u-sarah",
    author: pSarah,
    author_name: "Sarah Ahmed",
    author_avatar: pSarah.avatar_url,
    access_level: "company",
    word_count: 980,
    read_time_minutes: 4,
    last_updated: "5 hours ago",
    created_at: "2026-08-05T10:00:00Z",
    updated_at: "2026-08-21T16:00:00Z",
    content: `# New Employee Onboarding Process Guide

## Day 1: Workspace Setup
1. Receive login invitation to Ropimo platform.
2. Setup workspace email and configure 2FA.
3. Review the **Company Policy Handbook**.
4. Introductory 1:1 call with department lead.

## Week 1: Team & Tool Familiarization
- Join daily department standups.
- Review active project roadmaps and backlog priorities.
- Complete first small sprint ticket or task assignment.`,
    versions: [
      {
        id: "v-1-2",
        version_number: "1.2",
        author_name: "Sarah Ahmed",
        created_at: "5 hours ago",
        note: "Added Day 1 checklist updates",
        content: "Updated Day 1 workflow.",
      },
    ],
    comments: [],
  },
  {
    id: "doc-q3-budget",
    workspace_id: "ws-default",
    title: "Q3 Budget Report 2026",
    subtitle: "Financial Report",
    description: "Comprehensive financial overview including cloud infrastructure expenses, tool subscriptions, and headcount projections.",
    category: "Finance",
    status: "Published",
    department_id: "dept-ops",
    department_name: "Operations",
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    author_id: "u-arafath",
    author: pArafath,
    author_name: "Arafath Hossain",
    author_avatar: pArafath.avatar_url,
    access_level: "department",
    word_count: 1200,
    read_time_minutes: 5,
    last_updated: "Yesterday",
    created_at: "2026-08-10T11:00:00Z",
    updated_at: "2026-08-20T14:30:00Z",
    content: `# Q3 2026 Budget Report & Projections

## Executive Summary
Total allocated budget for Q3: **$120,000**. Current expenditure stands at **$74,500** (62% of allocated capital), remaining within target efficiency metrics.

### Expense Breakdown
| Category | Budget Allocated | Spent to Date | Variance |
| :--- | :--- | :--- | :--- |
| Engineering & Cloud Infrastructure | $55,000 | $34,200 | +$20,800 |
| Design & Prototyping Assets | $25,000 | $16,800 | +$8,200 |
| Marketing & Content Distribution | $28,000 | $15,500 | +$12,500 |
| Operations & Tooling | $12,000 | $8,000 | +$4,000 |`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-project-playbook",
    workspace_id: "ws-default",
    title: "Project Management Playbook",
    subtitle: "Project Management Standards",
    description: "Methodology for sprint cycles, ticket lifecycles, deliverable approvals, and backlog grooming.",
    category: "Operations",
    status: "Draft",
    department_id: "dept-ops",
    department_name: "Operations",
    project_id: "proj-dashboard",
    project_name: "Client Dashboard",
    author_id: "u-fatema",
    author: pFatema,
    author_name: "Fatema Islam",
    author_avatar: pFatema.avatar_url,
    access_level: "company",
    word_count: 850,
    read_time_minutes: 4,
    last_updated: "Yesterday",
    created_at: "2026-08-12T08:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
    content: `# Project Management Playbook & Agile Standards

## Sprint Rhythm
- **Sprint Duration**: 2 weeks.
- **Sprint Planning**: Alternate Mondays at 10:30 AM.
- **Sprint Retrospective**: Alternate Fridays at 4:00 PM.

## Deliverable States
1. \`todo\` → Task created and backlog estimated.
2. \`in_progress\` → Assignee actively working on deliverable.
3. \`in_review\` → Work brief submitted with attachments for review.
4. \`completed\` → Approved by manager and merged.`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-client-contract",
    workspace_id: "ws-default",
    title: "Client Contract Template",
    subtitle: "Legal Document Template",
    description: "Standard Master Services Agreement (MSA) and Statement of Work (SOW) template for enterprise contracts.",
    category: "Legal",
    status: "Published",
    department_id: "dept-ops",
    department_name: "Operations",
    project_id: null,
    project_name: null,
    author_id: "u-tanjir",
    author: pTanjir,
    author_name: "Munshi Tanjir",
    author_avatar: pTanjir.avatar_url,
    access_level: "specific",
    word_count: 1800,
    read_time_minutes: 8,
    last_updated: "2 days ago",
    created_at: "2026-08-15T09:00:00Z",
    updated_at: "2026-08-19T11:00:00Z",
    content: `# Master Services Agreement (MSA) Template

This Agreement is made effective as of the signed date by and between **Ropimo Inc.** ("Service Provider") and the Client identified in the Statement of Work ("Client").

## 1. Scope of Services
Service Provider will perform the services specified in each agreed upon Statement of Work (SOW).

## 2. Intellectual Property
Upon full settlement of invoices, all deliverables created specifically for the Client shall be assigned to the Client, retaining Service Provider's pre-existing software libraries.`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-brand-guidelines",
    workspace_id: "ws-default",
    title: "Brand Guidelines 2026",
    subtitle: "Brand Identity Guidelines",
    description: "Official visual identity standards, logo variations, typography clamp scales, and color token specifications.",
    category: "Marketing",
    status: "Published",
    department_id: "dept-design",
    department_name: "Design",
    project_id: "proj-muntajar",
    project_name: "Muntajar Website",
    author_id: "u-sarah",
    author: pSarah,
    author_name: "Sarah Ahmed",
    author_avatar: pSarah.avatar_url,
    access_level: "company",
    word_count: 750,
    read_time_minutes: 3,
    last_updated: "2 days ago",
    created_at: "2026-08-14T10:00:00Z",
    updated_at: "2026-08-19T14:00:00Z",
    content: `# Ropimo Brand Identity Guidelines 2026

## Color Tokens
- **Ink Primary**: \`#10251F\` (Deep charcoal forest)
- **Lime Accent**: \`#C7F34A\` (High-contrast active accent)
- **Background**: \`#F4F3EE\` (Warm editorial paper)
- **Surface Card**: \`#FFFFFF\` (Clean white surface)
- **Border**: \`#D8DDD4\` (Subtle framing border)

## Typography
- Primary Sans-Serif: Geist / Inter.
- Spacing density: Dense, compact, structured.`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-meeting-minutes",
    workspace_id: "ws-default",
    title: "Meeting Minutes - Aug 15",
    subtitle: "Weekly Team Meeting",
    description: "Notes, milestone check-ins, and actionable items from the all-hands product alignment meeting.",
    category: "Operations",
    status: "Published",
    department_id: "dept-dev",
    department_name: "Development",
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    author_id: "u-tashin",
    author: pTashin,
    author_name: "Tashin Khan",
    author_avatar: pTashin.avatar_url,
    access_level: "company",
    word_count: 620,
    read_time_minutes: 3,
    last_updated: "3 days ago",
    created_at: "2026-08-15T16:00:00Z",
    updated_at: "2026-08-18T10:00:00Z",
    content: `# Meeting Minutes — August 15, 2026

**Attendees**: Tashin Khan, Sarah Ahmed, Rahim Hasan, Arafath Hossain, Fatema Islam, Munshi Tanjir.

## Key Outcomes
1. Calendar module integration completed and validated against test fixtures.
2. Files workspace storage breakdown approved.
3. Next priority: Complete Documents knowledge base system.`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-vendor-comparison",
    workspace_id: "ws-default",
    title: "Vendor Comparison Sheet",
    subtitle: "Vendor Analysis Report",
    description: "Comparison matrix of cloud database hosts, Redis caching layers, and transaction email providers.",
    category: "Procurement",
    status: "Draft",
    department_id: "dept-dev",
    department_name: "Development",
    project_id: "proj-avirohost",
    project_name: "Avirohost Platform",
    author_id: "u-arafath",
    author: pArafath,
    author_name: "Arafath Hossain",
    author_avatar: pArafath.avatar_url,
    access_level: "department",
    word_count: 540,
    read_time_minutes: 2,
    last_updated: "3 days ago",
    created_at: "2026-08-16T12:00:00Z",
    updated_at: "2026-08-18T15:00:00Z",
    content: `# Cloud Vendor Comparison Matrix 2026

| Provider | Latency (ms) | Uptime SLA | Monthly Cost ($) | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| Supabase Multi-Region | 18ms | 99.99% | $180 | **Recommended** |
| AWS Aurora Serverless | 24ms | 99.95% | $320 | High Cost |
| Self-hosted Cluster | 12ms | Custom | $140 | Maintenance Overhead |`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-employee-benefits",
    workspace_id: "ws-default",
    title: "Employee Benefits Guide",
    subtitle: "Benefits and Compensation",
    description: "Health insurance details, learning stipends, wellness programs, and annual conference allowances.",
    category: "HR",
    status: "Published",
    department_id: "dept-ops",
    department_name: "Operations",
    project_id: null,
    project_name: null,
    author_id: "u-fatema",
    author: pFatema,
    author_name: "Fatema Islam",
    author_avatar: pFatema.avatar_url,
    access_level: "company",
    word_count: 820,
    read_time_minutes: 4,
    last_updated: "5 days ago",
    created_at: "2026-08-14T08:00:00Z",
    updated_at: "2026-08-16T10:00:00Z",
    content: `# Employee Benefits & Perks Summary

## Health & Wellness
- 100% company-covered medical and dental insurance.
- Annual mental health & gym stipend ($1,200/year).

## Professional Growth
- $2,000 annual book, course, and conference budget.`,
    versions: [],
    comments: [],
  },
  {
    id: "doc-product-roadmap",
    workspace_id: "ws-default",
    title: "Product Roadmap Q4 2026",
    subtitle: "Product Planning Document",
    description: "Strategic themes, key feature milestones, integrations, and quarterly delivery timeline.",
    category: "Product",
    status: "Draft",
    department_id: "dept-dev",
    department_name: "Development",
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    author_id: "u-tashin",
    author: pTashin,
    author_name: "Tashin Khan",
    author_avatar: pTashin.avatar_url,
    access_level: "company",
    word_count: 1100,
    read_time_minutes: 5,
    last_updated: "5 days ago",
    created_at: "2026-08-13T10:00:00Z",
    updated_at: "2026-08-16T11:00:00Z",
    content: `# Product Roadmap — Q4 2026

## Strategic Themes
1. **Unified Workspace OS**: Unify Files, Documents, Tasks, and Calendar in real-time.
2. **AI Co-pilot for Briefs**: Automated sprint brief conversion into structured deliverable tickets.
3. **Enterprise Role Permissions**: Granular Department & Project access controls.`,
    versions: [],
    comments: [],
  },
];

// In-memory runtime storage for newly created and uploaded documents
const runtimeDocumentsStore: DocumentItem[] = [];

export function addRuntimeDocument(doc: DocumentItem) {
  const idx = runtimeDocumentsStore.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    runtimeDocumentsStore[idx] = doc;
  } else {
    runtimeDocumentsStore.unshift(doc);
  }
}

export function deleteRuntimeDocument(id: string) {
  const idx = runtimeDocumentsStore.findIndex((d) => d.id === id);
  if (idx >= 0) runtimeDocumentsStore.splice(idx, 1);
}

export function updateRuntimeDocument(doc: Partial<DocumentItem> & { id: string }) {
  const idx = runtimeDocumentsStore.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    runtimeDocumentsStore[idx] = { ...runtimeDocumentsStore[idx], ...doc };
  }
}

/**
 * Fetch all documents in workspace (deduplicated per request)
 */
export const getWorkspaceDocuments = cache(
  async (workspaceId: string): Promise<DocumentItem[]> => {
    const adminClient = createAdminClient();

    let dbDocs: any[] | null = null;
    let allPeople: any[] = [];
    let allProjects: any[] = [];
    let allDepts: any[] = [];

    try {
      const [
        docsRes,
        people,
        projects,
        depts,
      ] = await Promise.all([
        adminClient
          .from("workspace_documents")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        getWorkspacePeople(workspaceId),
        getWorkspaceProjects(workspaceId),
        getWorkspaceDepartments(workspaceId),
      ]);
      dbDocs = docsRes.data;
      allPeople = people;
      allProjects = projects;
      allDepts = depts;
    } catch {
      // Fallback if db offline
    }

    const peopleMap = new Map(allPeople.map((p) => [p.user_id, p]));
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const deptMap = new Map(allDepts.map((d) => [d.id, d]));

    const parsedDocs: DocumentItem[] = [];

    if (dbDocs && dbDocs.length > 0) {
      dbDocs.forEach((d: any) => {
        const author = d.author_id ? peopleMap.get(d.author_id) || null : null;
        const project = d.project_id ? projectMap.get(d.project_id) || null : null;
        const dept = d.department_id ? deptMap.get(d.department_id) || null : null;

        parsedDocs.push({
          id: d.id,
          workspace_id: d.workspace_id,
          title: d.title,
          subtitle: d.subtitle || null,
          description: d.description || null,
          content: d.content || "",
          category: (d.category || "HR") as DocumentCategory,
          status: (d.status || "Published") as DocumentStatus,
          department_id: d.department_id,
          department_name: dept?.name || null,
          department: dept ? { id: dept.id, name: dept.name, color: dept.color, icon: dept.icon } : null,
          project_id: d.project_id,
          project_name: project?.name || null,
          project: project ? { id: project.id, name: project.name, color: project.color, icon: project.icon } : null,
          author_id: d.author_id,
          author,
          author_name: author?.full_name || "Tashin Khan",
          author_avatar: author?.avatar_url || null,
          access_level: d.access_level || "company",
          is_starred: d.is_starred || false,
          is_trash: d.is_trash || false,
          word_count: d.word_count || 100,
          read_time_minutes: d.read_time_minutes || 1,
          last_updated: "Just now",
          created_at: d.created_at,
          updated_at: d.updated_at,
          versions: [],
          comments: [],
        });
      });
    }

    const combinedMap = new Map<string, DocumentItem>();
    // 1. Add runtime in-memory documents first (newest on top)
    runtimeDocumentsStore.forEach((doc) => {
      if (!workspaceId || doc.workspace_id === workspaceId) {
        combinedMap.set(doc.id, doc);
      }
    });
    // 2. Add database documents
    parsedDocs.forEach((doc) => combinedMap.set(doc.id, doc));
    // 3. Add default seed documents if not already overridden
    DEFAULT_DOCUMENTS_DATA.forEach((doc) => {
      if (!combinedMap.has(doc.id)) {
        combinedMap.set(doc.id, doc);
      }
    });

    return Array.from(combinedMap.values());
  }
);

/**
 * Fetch a single document by ID with versions and comments
 */
export async function getDocumentById(
  documentId: string,
  workspaceId: string
): Promise<DocumentItem | null> {
  const allDocs = await getWorkspaceDocuments(workspaceId);
  const found = allDocs.find((d) => d.id === documentId || d.id === `doc-${documentId}`);

  if (found) return found;

  const defaultFound = DEFAULT_DOCUMENTS_DATA.find((d) => d.id === documentId);
  return defaultFound || null;
}

/**
 * Get document metrics and statistics
 */
export const getDocumentStats = cache(
  async (workspaceId: string): Promise<DocumentStats> => {
    return DEFAULT_DOCUMENT_STATS;
  }
);
