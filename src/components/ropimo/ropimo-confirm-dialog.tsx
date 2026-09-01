"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle, Info, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";

export interface RopimoConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  warningBanner?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function RopimoConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
  warningBanner,
  icon,
  children,
  className,
}: RopimoConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = isLoading || internalLoading;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const getDefaultIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case "danger":
        return <AlertCircle className="h-5 w-5 text-[#D9383A]" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-[#B58500]" />;
      case "primary":
      default:
        return <Info className="h-5 w-5 text-[#10251F]" />;
    }
  };

  const getIconContainerStyle = () => {
    switch (variant) {
      case "danger":
        return "bg-[#FDECE8] border-[#F8CBC2]";
      case "warning":
        return "bg-[#FEF6E4] border-[#F8E3B6]";
      case "primary":
      default:
        return "bg-[#EAF4E2] border-[#D8DDD4]";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10251F]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !loading && onClose()}
    >
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-elevated animate-in zoom-in-95 duration-150 space-y-5",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border shadow-2xs",
              getIconContainerStyle()
            )}
          >
            {getDefaultIcon()}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-base font-bold tracking-tight text-[#18221E]">
              {title}
            </h3>
            {description && (
              <div className="text-xs sm:text-sm text-[#65706A] leading-relaxed">
                {description}
              </div>
            )}
          </div>

          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] p-1 text-[#8A958F] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Warning Banner */}
        {warningBanner && (
          <div
            className={cn(
              "rounded-[10px] border p-3 text-xs leading-relaxed",
              variant === "danger"
                ? "border-[#F8CBC2] bg-[#FDECE8] text-[#D9383A]"
                : "border-[#F8E3B6] bg-[#FEF6E4] text-[#B58500]"
            )}
          >
            {warningBanner}
          </div>
        )}

        {/* Optional Custom Body Content */}
        {children && <div>{children}</div>}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7EADF]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-[10px] border border-[#D8DDD4] bg-white px-4 py-2 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          {variant === "danger" ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[#D9383A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B82B2D] transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          ) : (
            <PrimaryButton
              size="sm"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Processing..." : confirmLabel}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
