import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-[#18221E]">
      <div className="max-w-md w-full space-y-4 rounded-[16px] border border-[#D8DDD4] bg-white p-8 shadow-2xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF4E2] text-[#246244] border border-[#246244]/20 font-bold text-lg">
          404
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-[#18221E]">Page not found</h1>
          <p className="text-xs text-[#65706A]">
            The page you are looking for doesn&apos;t exist or has been moved to another location.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-[10px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-4 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
