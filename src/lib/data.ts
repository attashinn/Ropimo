/**
 * Central copy and realistic sample data for the marketing website.
 * Follows anti-AI rules: realistic office situations, specific copy, mixed Bangladeshi + international names.
 */

export const brandConfig = {
  name: "Ropimo",
  tagline: "The all-in-one workspace for growing teams and agencies.",
  description:
    "Replaces the pile of disconnected task boards, calendars, hiring spreadsheets, and shared drives with one calm, unified system.",
};

export const sampleTeamMembers = [
  {
    id: "m-1",
    name: "Rahim Chowdhury",
    role: "Lead Fullstack Dev",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    status: "In a meeting",
    department: "Engineering",
  },
  {
    id: "m-2",
    name: "Farhana Yasmin",
    role: "Head of People & HR",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    status: "Reviewing offers",
    department: "People Ops",
  },
  {
    id: "m-3",
    name: "Tanvir Ahmed",
    role: "Product Designer",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    status: "Active in Figma",
    department: "Design",
  },
  {
    id: "m-4",
    name: "Sarah Jenkins",
    role: "Client Ops Manager",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    status: "Preparing sprint demo",
    department: "Operations",
  },
  {
    id: "m-5",
    name: "Danielle Price",
    role: "Brand Strategist",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    status: "Client review",
    department: "Marketing",
  },
];

export const sampleTasks = [
  {
    id: "t-1",
    title: "Finalize mobile navigation v2 prototypes",
    assignee: "Tanvir Ahmed",
    due: "Today, 4:00 PM",
    tag: "Design",
    tagColor: "bg-[#E3EDFB] text-[#3B63F0]",
    priority: "High",
  },
  {
    id: "t-2",
    title: "Send offer letter to Frontend candidate (Nabila)",
    assignee: "Farhana Yasmin",
    due: "Tomorrow, 11:30 AM",
    tag: "Recruitment",
    tagColor: "bg-[#FFCFC2] text-[#FF6B3D]",
    priority: "Urgent",
  },
  {
    id: "t-3",
    title: "Deploy webhook reliability fix to production",
    assignee: "Rahim Chowdhury",
    due: "Oct 12",
    tag: "Dev",
    tagColor: "bg-[#7ED08A]/20 text-[#2B7735]",
    priority: "Medium",
  },
];

export const sampleCandidates = [
  {
    id: "c-1",
    name: "Nabila Tabassum",
    role: "Senior React Engineer",
    stage: "Offer Sent",
    rating: "4.9 / 5.0",
    interviewers: ["Rahim", "Farhana"],
    noticePeriod: "30 days",
  },
  {
    id: "c-2",
    name: "Liam O'Connor",
    role: "Product Growth Specialist",
    stage: "Technical Round",
    rating: "4.6 / 5.0",
    interviewers: ["Sarah"],
    noticePeriod: "Immediate",
  },
  {
    id: "c-3",
    name: "Asif Hasan",
    role: "UI Systems Designer",
    stage: "Portfolio Review",
    rating: "4.8 / 5.0",
    interviewers: ["Tanvir"],
    noticePeriod: "15 days",
  },
];

export const sampleFiles = [
  {
    name: "Offer_Letter_Nabila_Tabassum_Signed.pdf",
    size: "248 KB",
    folder: "HR & Contracts",
    updated: "2 hours ago by Farhana",
  },
  {
    name: "Q4_Client_Retainer_ApexCorp_v2.pdf",
    size: "1.4 MB",
    folder: "Client Agreements",
    updated: "Yesterday by Sarah",
  },
  {
    name: "Design_Tokens_Handover_2026.fig",
    size: "14.2 MB",
    folder: "Brand Assets",
    updated: "3 days ago by Tanvir",
  },
  {
    name: "Engineering_Onboarding_Playbook.docx",
    size: "520 KB",
    folder: "Company Policies",
    updated: "Oct 2 by Rahim",
  },
];

export const sampleMeetings = [
  {
    title: "Weekly Engineering Sync & Unblock",
    time: "10:00 AM - 10:45 AM",
    attendees: 6,
    link: "meet/rop-sync-eng",
    status: "In 15 mins",
  },
  {
    title: "Client Presentation: Apex Q4 SOW",
    time: "2:30 PM - 3:15 PM",
    attendees: 4,
    link: "meet/apex-q4-review",
    status: "Upcoming",
  },
];
