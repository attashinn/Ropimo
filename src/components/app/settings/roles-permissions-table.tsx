"use client";

import * as React from "react";
import { PermissionDefinition } from "@/types/permissions";
import { Search } from "lucide-react";

interface RolesPermissionsTableProps {
  matrix: PermissionDefinition[];
}

export function RolesPermissionsTable({ matrix }: RolesPermissionsTableProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return matrix;
    const q = query.toLowerCase();
    return matrix.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [matrix, query]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9A9A] stroke-[1.5]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter capabilities..."
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-white border border-[#E9E6DA] rounded-[8px] text-[#111] placeholder:text-[#9A9A9A] outline-none focus:border-[#111] transition-colors"
          />
        </div>
        <div className="text-[12px] text-[#9A9A9A] tabular-nums">
          Showing {filtered.length} of {matrix.length}
        </div>
      </div>

      {/* Read-only Matrix Table */}
      <div className="border border-[#E9E6DA] rounded-[8px] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E9E6DA] bg-[#FAF9F5] text-[12px] font-medium text-[#6B6B6B]">
                <th className="py-2.5 px-4 min-w-[260px]">Capability</th>
                <th className="py-2.5 px-3 min-w-[100px] text-center font-semibold text-[#111]">Owner</th>
                <th className="py-2.5 px-3 min-w-[110px] text-center font-semibold text-[#111]">Admin</th>
                <th className="py-2.5 px-3 min-w-[120px] text-center font-semibold text-[#111]">HR</th>
                <th className="py-2.5 px-3 min-w-[140px] text-center font-semibold text-[#111]">Manager</th>
                <th className="py-2.5 px-3 min-w-[140px] text-center font-semibold text-[#111]">Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E6DA]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9A9A9A] text-[13px]">
                    No capabilities match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.key}
                    className="hover:bg-[#F4F2EA] transition-colors duration-120"
                  >
                    {/* Capability Name & Description */}
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#111]">{item.name}</span>
                        <span className="text-[12px] text-[#6B6B6B] leading-snug line-clamp-1">
                          {item.description}
                        </span>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-2.5 px-3 text-center text-[12px]">
                      <span className={item.owner === "—" ? "text-[#9A9A9A]" : "text-[#111] font-medium"}>
                        {item.owner}
                      </span>
                    </td>

                    {/* Admin */}
                    <td className="py-2.5 px-3 text-center text-[12px]">
                      <span className={item.admin === "—" ? "text-[#9A9A9A]" : "text-[#111] font-medium"}>
                        {item.admin}
                      </span>
                    </td>

                    {/* HR */}
                    <td className="py-2.5 px-3 text-center text-[12px]">
                      <span className={item.hr === "—" ? "text-[#9A9A9A]" : "text-[#111] font-medium"}>
                        {item.hr}
                      </span>
                    </td>

                    {/* Manager */}
                    <td className="py-2.5 px-3 text-center text-[12px]">
                      <span className={item.manager === "—" ? "text-[#9A9A9A]" : "text-[#111] font-medium"}>
                        {item.manager}
                      </span>
                    </td>

                    {/* Member */}
                    <td className="py-2.5 px-3 text-center text-[12px]">
                      <span className={item.member === "—" ? "text-[#9A9A9A]" : "text-[#111] font-medium"}>
                        {item.member}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
