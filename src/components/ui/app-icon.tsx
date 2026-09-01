"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock3,
  CalendarDays,
  FolderKanban,
  CheckSquare,
  Calendar,
  Folder,
  FileText,
  Video,
  Settings,
  Search,
  Bell,
  CircleUser,
  Palette,
  Globe,
  Clapperboard,
  Megaphone,
  Package,
  Circle,
  CircleDot,
  Eye,
  CircleCheck,
  Ban,
  AlertCircle,
  ArrowDown,
  Minus,
  ArrowUp,
  Flame,
  Code2,
  TrendingUp,
  Landmark,
  Settings2,
  Plus,
  X,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  Upload,
  Paperclip,
  Download,
  ExternalLink,
  Shield,
  Briefcase,
  Mail,
  Phone,
  HelpCircle,
  MoreHorizontal,
  LucideIcon,
  LucideProps,
} from "lucide-react";

export type AppIconName =
  // Navigation
  | "overview"
  | "departments"
  | "people"
  | "attendance"
  | "leave"
  | "projects"
  | "tasks"
  | "calendar"
  | "files"
  | "documents"
  | "meetings"
  | "settings"
  | "search"
  | "notifications"
  | "profile"
  // Task Deliverables
  | "design"
  | "website"
  | "video"
  | "document"
  | "campaign"
  | "other"
  // Status
  | "todo"
  | "in_progress"
  | "in_review"
  | "changes_requested"
  | "blocked"
  | "completed"
  // Priority
  | "low"
  | "medium"
  | "high"
  | "urgent"
  // Departments
  | "engineering"
  | "development"
  | "marketing"
  | "sales"
  | "hr"
  | "finance"
  | "operations"
  // Utility & Common
  | "plus"
  | "close"
  | "trash"
  | "edit"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "link"
  | "upload"
  | "paperclip"
  | "download"
  | "external-link"
  | "shield"
  | "briefcase"
  | "mail"
  | "phone"
  | "more"
  | "help";

const ICON_MAP: Record<AppIconName, LucideIcon> = {
  // Navigation
  overview: LayoutDashboard,
  departments: Building2,
  people: Users,
  attendance: Clock3,
  leave: CalendarDays,
  projects: FolderKanban,
  tasks: CheckSquare,
  calendar: Calendar,
  files: Folder,
  documents: FileText,
  meetings: Video,
  settings: Settings,
  search: Search,
  notifications: Bell,
  profile: CircleUser,

  // Deliverables
  design: Palette,
  website: Globe,
  video: Clapperboard,
  document: FileText,
  campaign: Megaphone,
  other: Package,

  // Status
  todo: Circle,
  in_progress: CircleDot,
  in_review: Eye,
  changes_requested: AlertCircle,
  blocked: Ban,
  completed: CircleCheck,

  // Priority
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: Flame,

  // Departments
  engineering: Code2,
  development: Code2,
  marketing: Megaphone,
  sales: TrendingUp,
  hr: Users,
  finance: Landmark,
  operations: Settings2,

  // Common
  plus: Plus,
  close: X,
  trash: Trash2,
  edit: Edit2,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  link: LinkIcon,
  upload: Upload,
  paperclip: Paperclip,
  download: Download,
  "external-link": ExternalLink,
  shield: Shield,
  briefcase: Briefcase,
  mail: Mail,
  phone: Phone,
  more: MoreHorizontal,
  help: HelpCircle,
};

export interface AppIconProps extends Omit<LucideProps, "ref"> {
  name: AppIconName | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AppIcon({
  name,
  size = 16,
  strokeWidth = 1.75,
  className = "",
  ...props
}: AppIconProps) {
  const normalizedKey = (name || "").toLowerCase().trim() as AppIconName;
  const IconComponent = ICON_MAP[normalizedKey] || ICON_MAP[name as AppIconName] || HelpCircle;

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 inline-block align-middle ${className}`}
      {...props}
    />
  );
}

/**
 * Helper to get a clean department SVG icon based on department name or slug
 */
export function DepartmentIcon({
  name,
  size = 18,
  strokeWidth = 1.75,
  className = "",
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("dev") || lower.includes("eng") || lower.includes("tech") || lower.includes("software")) {
    return <Code2 size={size} strokeWidth={strokeWidth} className={className} />;
  }
  if (lower.includes("design") || lower.includes("product") || lower.includes("creative") || lower.includes("ui") || lower.includes("ux")) {
    return <Palette size={size} strokeWidth={strokeWidth} className={className} />;
  }
  if (lower.includes("market") || lower.includes("growth") || lower.includes("content") || lower.includes("brand")) {
    return <Megaphone size={size} strokeWidth={strokeWidth} className={className} />;
  }
  if (lower.includes("sale") || lower.includes("revenue") || lower.includes("biz")) {
    return <TrendingUp size={size} strokeWidth={strokeWidth} className={className} />;
  }
  if (lower.includes("hr") || lower.includes("people") || lower.includes("talent") || lower.includes("recruit")) {
    return <Users size={size} strokeWidth={strokeWidth} className={className} />;
  }
  if (lower.includes("fin") || lower.includes("account") || lower.includes("tax")) {
    return <Landmark size={size} strokeWidth={strokeWidth} className={className} />;
  }
  if (lower.includes("op") || lower.includes("legal") || lower.includes("admin")) {
    return <Settings2 size={size} strokeWidth={strokeWidth} className={className} />;
  }
  return <Building2 size={size} strokeWidth={strokeWidth} className={className} />;
}
