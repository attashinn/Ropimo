import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/neon/adapter";

export async function POST(request: NextRequest) {
  try {
    const { table, operation, columns, where, limit } = await request.json();

    if (!table) {
      return NextResponse.json({ error: "Table name is required" }, { status: 400 });
    }

    const client = await createServerClient();
    let q = client.from(table);

    if (operation === "SELECT" || !operation) {
      q = q.select(columns || "*");
    }

    if (Array.isArray(where)) {
      for (const item of where) {
        if (item.op === "eq") q = q.eq(item.col, item.val);
        else if (item.op === "neq") q = q.neq(item.col, item.val);
        else if (item.op === "in") q = q.in(item.col, item.val);
        else if (item.op === "is") q = q.is(item.col, item.val);
      }
    }

    if (typeof limit === "number") {
      q = q.limit(limit);
    }

    const res = await q;
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: { message: err.message || "Query failed" }, count: null },
      { status: 500 }
    );
  }
}
