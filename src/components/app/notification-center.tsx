"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  CalendarDays,
  FolderKanban,
  UserCheck,
  Video,
  X,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppNotification, NotificationFilterTab, NotificationCategory } from "@/types/notification";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  dismissNotificationAction,
  clearAllNotificationsAction,
} from "@/lib/notifications/actions";

export interface NotificationCenterProps {
  workspaceId: string;
  initialNotifications?: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({
  workspaceId,
  initialNotifications = [],
  isOpen,
  onClose,
}: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<AppNotification[]>(initialNotifications);
  const [activeTab, setActiveTab] = React.useState<NotificationFilterTab>("all");

  // Sync initial notifications if updated
  React.useEffect(() => {
    if (initialNotifications && initialNotifications.length > 0) {
      setNotifications(initialNotifications);
    }
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsReadAction(workspaceId);
  };

  const handleDismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await dismissNotificationAction(id, workspaceId);
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      markNotificationReadAction(notif.id, workspaceId);
    }
    onClose();
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
    await clearAllNotificationsAction(workspaceId);
  };

  // Filtered notifications
  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.read);
    if (activeTab === "requests") {
      return notifications.filter((n) =>
        n.type === "leave_requested" ||
        n.type === "leave_approved" ||
        n.type === "leave_rejected" ||
        n.type === "invitation_accepted"
      );
    }
    return notifications;
  }, [notifications, activeTab]);

  // Group by category (Today, Yesterday, Older)
  const groupedNotifications = React.useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const older: AppNotification[] = [];

    for (const notif of filteredNotifications) {
      const cat = notif.category || "today";
      if (cat === "today") today.push(notif);
      else if (cat === "yesterday") yesterday.push(notif);
      else older.push(notif);
    }

    return { today, yesterday, older };
  }, [filteredNotifications]);

  const getNotifIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "task_assigned":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#C2E0C8] bg-[#EAF4E2] text-[#246244]">
            <CheckSquare className="h-3.5 w-3.5" />
          </div>
        );
      case "project_member_added":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#BFDBFE] bg-[#EBF3FE] text-[#1E40AF]">
            <FolderKanban className="h-3.5 w-3.5" />
          </div>
        );
      case "leave_requested":
      case "leave_approved":
      case "leave_rejected":
        return (
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border text-xs",
              type === "leave_approved"
                ? "border-[#C2E0C8] bg-[#EAF4E2] text-[#246244]"
                : type === "leave_rejected"
                ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                : "border-[#FDE68A] bg-[#FEF9C3] text-[#B45309]"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </div>
        );
      case "invitation_accepted":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#E9D5FF] bg-[#F3E8FF] text-[#6B21A8]">
            <UserCheck className="h-3.5 w-3.5" />
          </div>
        );
      case "meeting_scheduled":
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#F8E3B6] bg-[#FEF6E4] text-[#B58500]">
            <Video className="h-3.5 w-3.5" />
          </div>
        );
      default:
        return (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A]">
            <Bell className="h-3.5 w-3.5" />
          </div>
        );
    }
  };

  const renderSection = (title: string, items: AppNotification[]) => {
    if (items.length === 0) return null;
    return (
      <div key={title} className="space-y-1">
        <div className="px-2 pt-2 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">{title}</p>
        </div>
        <div className="space-y-0.5">
          {items.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={cn(
                  "group relative flex items-start gap-3 p-2.5 rounded-[10px] transition-all cursor-pointer text-xs",
                  isUnread ? "bg-[#FAF9F5] hover:bg-[#F4F3EE]" : "hover:bg-[#FAF9F5]"
                )}
              >
                {getNotifIcon(notif.type)}

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        "text-xs truncate",
                        isUnread ? "font-bold text-[#18221E]" : "font-medium text-[#18221E]"
                      )}
                    >
                      {notif.title}
                    </p>
                    {isUnread && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#246244] shrink-0" />
                    )}
                  </div>

                  {notif.subtitle && (
                    <p className="text-[11px] text-[#65706A] leading-tight line-clamp-2">
                      {notif.subtitle}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-[#8A958F]">
                      {notif.time_ago || "recently"}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#246244] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>

                {/* Quick Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => handleDismissNotification(e, notif.id)}
                  className="opacity-0 group-hover:opacity-100 rounded-[4px] p-0.5 text-[#8A958F] hover:text-[#D9383A] hover:bg-white transition-all shrink-0 ml-0.5 cursor-pointer"
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-40 w-88 sm:w-96 rounded-[16px] border border-[#D8DDD4] bg-white p-3.5 shadow-elevated animate-in zoom-in-95 duration-150 space-y-3">
      {/* Header with Title, Unread Badge, and Mark All Read */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E7EADF]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#18221E]">Notifications</span>
          {unreadCount > 0 ? (
            <span className="text-[10px] font-bold text-[#246244] bg-[#EAF4E2] px-2 py-0.5 rounded-full border border-[#C2E0C8]">
              {unreadCount} new
            </span>
          ) : (
            <span className="text-[10px] font-medium text-[#65706A] bg-[#F4F3EE] px-2 py-0.5 rounded-full border border-[#D8DDD4]">
              All caught up
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5 text-[#246244]" />
            <span>Mark read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-[8px] bg-[#FAF9F5] p-0.5 border border-[#D8DDD4] text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer",
            activeTab === "all"
              ? "bg-white text-[#18221E] font-bold shadow-2xs"
              : "text-[#65706A] hover:text-[#18221E]"
          )}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={cn(
            "flex-1 py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer",
            activeTab === "unread"
              ? "bg-white text-[#18221E] font-bold shadow-2xs"
              : "text-[#65706A] hover:text-[#18221E]"
          )}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={cn(
            "flex-1 py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer",
            activeTab === "requests"
              ? "bg-white text-[#18221E] font-bold shadow-2xs"
              : "text-[#65706A] hover:text-[#18221E]"
          )}
        >
          Requests
        </button>
      </div>

      {/* Notification Items List grouped by Time */}
      <div className="max-h-[340px] overflow-y-auto space-y-2 divide-y divide-[#E7EADF] pr-0.5">
        {filteredNotifications.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="h-9 w-9 rounded-full bg-[#FAF9F5] border border-[#E7EADF] flex items-center justify-center mb-2">
              <Inbox className="h-4 w-4 text-[#8A958F]" />
            </div>
            <p className="text-xs font-semibold text-[#18221E]">
              {activeTab === "unread" ? "No unread notifications" : "No notifications"}
            </p>
            <p className="text-[11px] text-[#65706A] mt-0.5">
              {activeTab === "unread"
                ? "You've read all your updates."
                : "New task, project, and leave notifications will appear here."}
            </p>
          </div>
        ) : (
          <>
            {renderSection("Today", groupedNotifications.today)}
            {renderSection("Yesterday", groupedNotifications.yesterday)}
            {renderSection("Older", groupedNotifications.older)}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-[#E7EADF] flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/app");
          }}
          className="font-bold text-[#246244] hover:underline cursor-pointer"
        >
          Workspace overview →
        </button>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[#8A958F] hover:text-[#18221E] transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
