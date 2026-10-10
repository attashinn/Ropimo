export default function InviteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D8DDD4] border-t-[#246244]" />
        <span className="text-xs font-semibold text-[#65706A]">Validating workspace invitation...</span>
      </div>
    </div>
  );
}
