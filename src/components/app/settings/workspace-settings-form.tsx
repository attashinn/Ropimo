"use client";

import * as React from "react";
import { SettingsIcon } from "@/components/app/nav-icons";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { updateWorkspaceSettingsAction } from "@/lib/workspace/actions";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface WorkspaceSettingsFormProps {
  initialWorkspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    icon?: string | null;
    role: string;
    createdAt?: string;
  };
}

export function WorkspaceSettingsForm({ initialWorkspace }: WorkspaceSettingsFormProps) {
  const [formData, setFormData] = React.useState({
    name: initialWorkspace.name,
    slug: initialWorkspace.slug,
    logoUrl: initialWorkspace.logoUrl || "",
    icon: initialWorkspace.icon || initialWorkspace.name[0]?.toUpperCase() || "W",
  });

  // Optimistic UI state
  const [optimisticWorkspace, setOptimisticWorkspace] = React.useOptimistic(
    formData,
    (current, update: Partial<typeof formData>) => ({
      ...current,
      ...update,
    })
  );

  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isOwnerOrAdmin = ["owner", "admin"].includes(initialWorkspace.role.toLowerCase());

  // Handle Logo Upload via /api/upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (.png, .jpg, .webp).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image file size cannot exceed 5MB.");
      return;
    }

    setUploadingLogo(true);
    setErrorMsg(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("workspaceId", initialWorkspace.id);
      uploadFormData.append("folder", "logos");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setFormData((prev) => ({ ...prev, logoUrl: data.url }));
        setOptimisticWorkspace({ logoUrl: data.url });
        setSuccessMsg("Workspace logo uploaded. Click 'Save Changes' to apply.");
      } else {
        setErrorMsg(data.error || "Failed to upload logo.");
      }
    } catch {
      setErrorMsg("Network error uploading logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !isOwnerOrAdmin) return;

    const trimmedName = formData.name.trim();
    const cleanSlug = formData.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");

    if (trimmedName.length < 2) {
      setErrorMsg("Workspace name must be at least 2 characters.");
      return;
    }

    if (cleanSlug.length < 3) {
      setErrorMsg("Workspace slug must be at least 3 characters.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Apply optimistic update immediately
    React.startTransition(() => {
      setOptimisticWorkspace({
        name: trimmedName,
        slug: cleanSlug,
        icon: trimmedName[0]?.toUpperCase() || "W",
      });
    });

    const result = await updateWorkspaceSettingsAction({
      workspaceId: initialWorkspace.id,
      name: trimmedName,
      slug: cleanSlug,
      logoUrl: formData.logoUrl || null,
      icon: trimmedName[0]?.toUpperCase() || "W",
    });

    setSaving(false);

    if (result.success && result.workspace) {
      setFormData({
        name: result.workspace.name,
        slug: result.workspace.slug,
        logoUrl: result.workspace.logoUrl || "",
        icon: result.workspace.icon || result.workspace.name[0]?.toUpperCase() || "W",
      });
      setSuccessMsg("Workspace settings saved successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(result.error || "Failed to update workspace settings.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-2 rounded-[8px] border border-[#246244]/20 bg-[#E8F5E9] px-4 py-3 text-sm text-[#1B5E20]">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="surface" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#D8DDD4]">
            <SettingsIcon size={18} className="text-[#10251F]" />
            <h3 className="text-base font-bold text-[#18221E]">General Information</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="ws-name" className="block font-semibold uppercase tracking-wider text-[#65706A] mb-1">
                Workspace Name
              </label>
              <input
                id="ws-name"
                type="text"
                value={formData.name}
                disabled={!isOwnerOrAdmin || saving}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-sm text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none disabled:opacity-60"
                placeholder="My Organization"
                required
              />
            </div>

            <div>
              <label htmlFor="ws-slug" className="block font-semibold uppercase tracking-wider text-[#65706A] mb-1">
                Workspace URL / Slug
              </label>
              <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-sm text-[#65706A] focus-within:border-[#10251F] focus-within:bg-white">
                <span className="shrink-0 select-none">ropimo.app/workspace/</span>
                <input
                  id="ws-slug"
                  type="text"
                  value={formData.slug}
                  disabled={!isOwnerOrAdmin || saving}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  className="w-full bg-transparent font-semibold text-[#18221E] focus:outline-none pl-1 disabled:opacity-60"
                  placeholder="my-org"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-[#65706A]">
                Unique web address for your workspace. Lowercase alphanumeric and hyphens only.
              </p>
            </div>

            {/* Logo Upload Section */}
            <div className="pt-2 border-t border-[#D8DDD4]">
              <label className="block font-semibold uppercase tracking-wider text-[#65706A] mb-2">
                Workspace Logo & Icon
              </label>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#10251F] text-base font-bold text-[#C7F34A] overflow-hidden border border-[#D8DDD4]">
                  {optimisticWorkspace.logoUrl ? (
                    <img
                      src={optimisticWorkspace.logoUrl}
                      alt={optimisticWorkspace.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{optimisticWorkspace.icon || optimisticWorkspace.name[0]?.toUpperCase() || "W"}</span>
                  )}
                </div>

                {isOwnerOrAdmin && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingLogo || saving}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors disabled:opacity-60"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          Upload Logo
                        </>
                      )}
                    </button>
                    <p className="mt-1 text-[10px] text-[#65706A]">PNG, JPG, or WEBP up to 5MB.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D8DDD4]">
              <span className="text-[#65706A]">Your Role:</span>
              <span className="font-bold text-[#10251F] bg-[#E7EADF] px-2 py-0.5 rounded-full text-[10px]">
                {initialWorkspace.role}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="warm" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
            <h3 className="text-base font-bold text-[#18221E]">Permissions & Access</h3>
            <span className="rounded-full bg-[#C7F34A] px-2.5 py-0.5 text-[10px] font-bold text-[#10251F]">
              Active
            </span>
          </div>

          <p className="text-xs text-[#65706A] leading-relaxed">
            This workspace was created on{" "}
            <span className="font-semibold text-[#18221E]">
              {initialWorkspace.createdAt || "Recently"}
            </span>
            . Changes to workspace name and slug can only be made by authorized workspace owners or administrators.
          </p>

          {!isOwnerOrAdmin && (
            <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-3 text-xs text-[#65706A]">
              You are signed in as a <span className="font-bold text-[#18221E]">{initialWorkspace.role}</span>. You do not have permission to modify workspace settings. Contact an owner to make changes.
            </div>
          )}

          <div className="pt-4 flex justify-end">
            {isOwnerOrAdmin && (
              <PrimaryButton type="submit" disabled={saving || uploadingLogo} size="sm">
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </PrimaryButton>
            )}
          </div>
        </Card>
      </div>
    </form>
  );
}
