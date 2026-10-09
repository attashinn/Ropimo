"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Check,
  Calendar,
  User,
  SlidersHorizontal,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Kbd,
  StatusDot,
  Avatar,
  AvatarStack,
  Tabs,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  Skeleton,
  Row,
  EmptyLine,
} from "@/components/app/ui";
import { notFound } from "next/navigation";

export default function DesignKitPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedRow, setSelectedRow] = React.useState<string | null>("row-2");
  const [inputValue, setInputValue] = React.useState("");

  const sampleTabs = [
    { id: "all", label: "All tasks", count: 24 },
    { id: "assigned", label: "Assigned to me", count: 8 },
    { id: "completed", label: "Completed", count: 16 },
  ];

  const stackAvatars = [
    { name: "Sarah Chen", accent: "green" as const },
    { name: "Marcus Miller", accent: "blue" as const },
    { name: "Elena Rostova", accent: "peach" as const },
    { name: "Devon Vance", accent: "yellow" as const },
    { name: "Amara Diallo", accent: "orange" as const },
  ];

  return (
    <div className="app-root min-h-screen bg-canvas p-6 md:p-10 font-sans text-ink">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Page header */}
        <header className="flex items-center justify-between pb-4 border-b border-hairline">
          <div>
            <h1 className="text-[20px] font-semibold text-ink tracking-tight">
              App design foundation
              <span className="ml-2 text-[13px] font-normal text-ink-3">
                UI primitives review
              </span>
            </h1>
            <p className="mt-0.5 text-[12px] text-ink-2">
              Strictly following <code className="font-mono text-ink">.cursor/rules/app-ui.mdc</code> tokens, radii (8px/12px), and typography.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Command palette" shortcut="⌘K">
              <Button variant="secondary" size="sm">
                <Search className="h-4 w-4 stroke-[1.5] text-ink-2" />
                <span>Quick find</span>
                <Kbd>⌘K</Kbd>
              </Button>
            </Tooltip>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 stroke-[1.5] text-white" />
              <span>Create item</span>
            </Button>
          </div>
        </header>

        {/* Main surface sheet */}
        <div className="rounded-[12px] border border-hairline bg-surface p-6 md:p-8 space-y-10">
          {/* Section 1: Buttons */}
          <section className="space-y-3">
            <h2 className="text-[14px] font-semibold text-ink">Buttons</h2>
            <p className="text-[12px] text-ink-2">
              Primary black, secondary outlined hairline, ghost. 32px height (md) and 28px height (sm), 8px radius.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="primary" size="md">
                Primary md
              </Button>
              <Button variant="primary" size="sm">
                Primary sm
              </Button>
              <Button variant="secondary" size="md">
                Secondary md
              </Button>
              <Button variant="secondary" size="sm">
                Secondary sm
              </Button>
              <Button variant="ghost" size="md">
                Ghost md
              </Button>
              <Button variant="ghost" size="sm">
                Ghost sm
              </Button>
              <Button variant="primary" size="md" disabled>
                Disabled
              </Button>
            </div>
          </section>

          {/* Section 2: IconButton & Kbd */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Icon buttons & keyboard hints</h2>
            <p className="text-[12px] text-ink-2">
              IconButton is 28px ghost button with 8px radius. Kbd is tiny monospaced key indicator.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <Tooltip content="More options" shortcut="M">
                  <IconButton aria-label="More options">
                    <MoreHorizontal className="h-4 w-4 stroke-[1.5]" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="New entry" shortcut="C">
                  <IconButton aria-label="New entry">
                    <Plus className="h-4 w-4 stroke-[1.5]" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Filter view">
                  <IconButton aria-label="Filter">
                    <Filter className="h-4 w-4 stroke-[1.5]" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="View settings">
                  <IconButton aria-label="Settings">
                    <SlidersHorizontal className="h-4 w-4 stroke-[1.5]" />
                  </IconButton>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2 text-[12px] text-ink-2 pl-4 border-l border-hairline">
                <span>Shortcuts:</span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>⌘K</Kbd>
                  <span>search</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>C</Kbd>
                  <span>create</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>J</Kbd>
                  <Kbd>K</Kbd>
                  <span>navigate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>Esc</Kbd>
                  <span>close</span>
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Inputs */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Inputs</h2>
            <p className="text-[12px] text-ink-2">
              32px height, hairline border, 8px radius, black focus ring 1px.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <Input
                placeholder="Search or type a command..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input placeholder="Assignee name" defaultValue="Marcus Miller" />
              <Input placeholder="Disabled input" disabled />
            </div>
          </section>

          {/* Section 4: Status dots */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Status dots</h2>
            <p className="text-[12px] text-ink-2">
              6px dot + plain text. Never filled pills. Done/active (#1F9D55), in progress (#D99A00), overdue (#D93025), none (#9A9A9A).
            </p>
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <StatusDot status="done" label="Completed" />
              <StatusDot status="active" label="Active" />
              <StatusDot status="progress" label="In progress" />
              <StatusDot status="overdue" label="Overdue" />
              <StatusDot status="none" label="No status" />
            </div>
          </section>

          {/* Section 5: Avatars & AvatarStack */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Avatars & avatar stack</h2>
            <p className="text-[12px] text-ink-2">
              Sizes 20px, 24px, 28px. Backgrounds restricted to brand accents (green, yellow, peach, blue, orange).
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink-3">20px:</span>
                <Avatar name="Sarah Chen" size={20} accent="green" />
                <Avatar name="Devon Vance" size={20} accent="yellow" />
                <Avatar name="Elena Rostova" size={20} accent="peach" />
                <Avatar name="Marcus Miller" size={20} accent="blue" />
                <Avatar name="Amara Diallo" size={20} accent="orange" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink-3">24px:</span>
                <Avatar name="Sarah Chen" size={24} accent="green" />
                <Avatar name="Devon Vance" size={24} accent="yellow" />
                <Avatar name="Elena Rostova" size={24} accent="peach" />
                <Avatar name="Marcus Miller" size={24} accent="blue" />
                <Avatar name="Amara Diallo" size={24} accent="orange" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink-3">28px:</span>
                <Avatar name="Sarah Chen" size={28} accent="green" />
                <Avatar name="Devon Vance" size={28} accent="yellow" />
                <Avatar name="Elena Rostova" size={28} accent="peach" />
                <Avatar name="Marcus Miller" size={28} accent="blue" />
                <Avatar name="Amara Diallo" size={28} accent="orange" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink-3">Stack:</span>
                <AvatarStack items={stackAvatars} max={3} size={24} />
              </div>
            </div>
          </section>

          {/* Section 6: Tabs */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Tabs</h2>
            <p className="text-[12px] text-ink-2">
              Underline style, no rounded box tabs. Smooth 120ms indicator transition with tabular counts.
            </p>
            <Tabs tabs={sampleTabs} activeId={activeTab} onChange={setActiveTab} />
          </section>

          {/* Section 7: DropdownMenu, Popover, Tooltip */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Overlay primitives</h2>
            <p className="text-[12px] text-ink-2">
              Radix DropdownMenu & Popover: 12px radius, shadow only here, 30px item height. Tooltip: 8px radius, dark ink background.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="md">
                    <span>Menu options</span>
                    <MoreHorizontal className="h-4 w-4 stroke-[1.5] text-ink-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Item actions</DropdownMenuLabel>
                  <DropdownMenuItem shortcut="E">Edit title</DropdownMenuItem>
                  <DropdownMenuItem shortcut="C">Copy link</DropdownMenuItem>
                  <DropdownMenuItem shortcut="D">Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem shortcut="Del" className="text-status-overdue">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="md">
                    <Calendar className="h-4 w-4 stroke-[1.5] text-ink-2" />
                    <span>Quick popover</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-ink">Schedule detail</p>
                    <p className="text-[12px] text-ink-2">
                      Review timeline milestones for Q4 release.
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-hairline">
                      <StatusDot status="active" label="On schedule" />
                      <Button variant="primary" size="sm">
                        Confirm
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tooltip */}
              <Tooltip content="Filter tasks by assignee" shortcut="F">
                <Button variant="ghost" size="md">
                  <User className="h-4 w-4 stroke-[1.5]" />
                  <span>Hover for tooltip</span>
                </Button>
              </Tooltip>
            </div>
          </section>

          {/* Section 8: Rows & EmptyLine */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">List rows & empty states</h2>
            <p className="text-[12px] text-ink-2">
              44px rows with hairline dividers. Hover background #F4F2EA, selected background #ECE9DD. Actions appear on hover. EmptyLine has one muted line and one action.
            </p>
            <div className="border border-hairline rounded-lg overflow-hidden bg-surface">
              <Row
                selected={selectedRow === "row-1"}
                onClick={() => setSelectedRow("row-1")}
                actions={
                  <>
                    <Tooltip content="Mark done">
                      <IconButton aria-label="Mark done">
                        <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="More">
                      <IconButton aria-label="More">
                        <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.5]" />
                      </IconButton>
                    </Tooltip>
                  </>
                }
              >
                <Avatar name="Sarah Chen" size={24} accent="green" />
                <span className="truncate font-normal text-ink">
                  Draft product announcement for November release
                </span>
                <span className="ml-auto mr-3 hidden sm:inline-block">
                  <StatusDot status="progress" label="In progress" />
                </span>
                <span className="text-[12px] tabular-nums text-ink-3">Nov 14</span>
              </Row>

              <Row
                selected={selectedRow === "row-2"}
                onClick={() => setSelectedRow("row-2")}
                actions={
                  <>
                    <Tooltip content="Mark done">
                      <IconButton aria-label="Mark done">
                        <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="More">
                      <IconButton aria-label="More">
                        <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.5]" />
                      </IconButton>
                    </Tooltip>
                  </>
                }
              >
                <Avatar name="Marcus Miller" size={24} accent="blue" />
                <span className="truncate font-normal text-ink">
                  Audit permissions schema across customer workspaces
                </span>
                <span className="ml-auto mr-3 hidden sm:inline-block">
                  <StatusDot status="done" label="Done" />
                </span>
                <span className="text-[12px] tabular-nums text-ink-3">Nov 12</span>
              </Row>

              <Row
                selected={selectedRow === "row-3"}
                onClick={() => setSelectedRow("row-3")}
                actions={
                  <>
                    <Tooltip content="Mark done">
                      <IconButton aria-label="Mark done">
                        <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content="More">
                      <IconButton aria-label="More">
                        <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.5]" />
                      </IconButton>
                    </Tooltip>
                  </>
                }
              >
                <Avatar name="Elena Rostova" size={24} accent="peach" />
                <span className="truncate font-normal text-ink">
                  Prepare executive briefing deck for weekly review
                </span>
                <span className="ml-auto mr-3 hidden sm:inline-block">
                  <StatusDot status="overdue" label="Overdue" />
                </span>
                <span className="text-[12px] tabular-nums text-ink-3">Nov 08</span>
              </Row>

              <EmptyLine
                message="No archived tasks in this project."
                actionText="View history"
                onAction={() => alert("EmptyLine action clicked")}
              />
            </div>
          </section>

          {/* Section 9: Skeleton */}
          <section className="space-y-3 pt-6 border-t border-hairline">
            <h2 className="text-[14px] font-semibold text-ink">Skeleton loading states</h2>
            <p className="text-[12px] text-ink-2">
              Shaped like layout with 8px/12px/full radii. Subtle pulse animation.
            </p>
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3">
                <Skeleton rounded="full" className="h-6 w-6" />
                <Skeleton rounded="sm" className="h-4 w-48" />
                <Skeleton rounded="sm" className="h-4 w-20 ml-auto" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton rounded="full" className="h-6 w-6" />
                <Skeleton rounded="sm" className="h-4 w-64" />
                <Skeleton rounded="sm" className="h-4 w-16 ml-auto" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton rounded="full" className="h-6 w-6" />
                <Skeleton rounded="sm" className="h-4 w-40" />
                <Skeleton rounded="sm" className="h-4 w-24 ml-auto" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
