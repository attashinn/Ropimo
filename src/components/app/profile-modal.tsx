"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Shield, Bell, Check, X } from "lucide-react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [fullName, setFullName] = React.useState(user?.fullName || "Tashin Khan");
  const [email] = React.useState(user?.email || "tashinkan360@gmail.com");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[480px] rounded-[16px] border border-[#D8DDD4] bg-white shadow-elevated overflow-hidden select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7EADF] bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D8DDD4] bg-white text-[#246244] shadow-2xs">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#18221E]">
                    Personal Profile & Account
                  </h3>
                  <p className="text-[11px] text-[#65706A]">
                    Manage your personal identity and account settings
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-[#65706A] hover:bg-white hover:text-[#18221E] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Avatar Preview */}
              <div className="flex items-center gap-4 p-3.5 rounded-[12px] bg-[#FAF9F5] border border-[#D8DDD4]">
                <RopimoUserAvatar name={fullName} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#18221E] truncate">{fullName}</p>
                  <p className="text-[11px] text-[#65706A] truncate">{email}</p>
                  <span className="inline-block mt-1 text-[9px] font-semibold text-[#246244] bg-[#EAF4E2] px-2 py-0.5 rounded-full border border-[#D8DDD4]">
                    Personal User Account
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#18221E] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none transition-colors"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#18221E] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#65706A] cursor-not-allowed"
                  />
                  <p className="mt-1 text-[10px] text-[#8A958F]">
                    Email is associated with your authenticated personal account.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E7EADF] space-y-2">
                  <span className="block font-bold text-[#18221E]">
                    Preferences
                  </span>
                  <div className="flex items-center justify-between py-1 text-xs">
                    <span className="text-[#65706A]">Email notifications</span>
                    <span className="text-[11px] font-semibold text-[#246244]">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-1 text-xs">
                    <span className="text-[#65706A]">Personal task assignments & mentions</span>
                    <span className="text-[11px] font-semibold text-[#246244]">Instant</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7EADF]">
                <SecondaryButton type="button" onClick={onClose} size="sm">
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" size="sm" className="min-w-[100px]">
                  {saved ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
