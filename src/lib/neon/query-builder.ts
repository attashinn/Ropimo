import { query } from "./db";

export interface PostgrestError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export type QueryData = any;

export interface QueryResultResponse<T = any[]> {
  data: T | null;
  error: PostgrestError | null;
  count: number | null;
}

// Map common foreign key column names to target tables
const FK_TARGET_MAP: Record<string, { table: string; pk: string }> = {
  workspace_id: { table: "public.workspaces", pk: "id" },
  user_id: { table: "public.profiles", pk: "id" },
  created_by: { table: "public.profiles", pk: "id" },
  author_id: { table: "public.profiles", pk: "id" },
  organizer_id: { table: "public.profiles", pk: "id" },
  assigned_to: { table: "public.profiles", pk: "id" },
  project_id: { table: "public.projects", pk: "id" },
  department_id: { table: "public.departments", pk: "id" },
  task_id: { table: "public.tasks", pk: "id" },
  document_id: { table: "public.workspace_documents", pk: "id" },
  folder_id: { table: "public.workspace_folders", pk: "id" },
  file_id: { table: "public.workspace_files", pk: "id" },
  meeting_id: { table: "public.workspace_meetings", pk: "id" },
  event_id: { table: "public.calendar_events", pk: "id" },
  job_id: { table: "public.job_openings", pk: "id" },
  candidate_id: { table: "public.candidates", pk: "id" },
  application_id: { table: "public.candidate_applications", pk: "id" },
};

function splitTopLevel(str: string, delimiter = ","): string[] {
  const results: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;

    if (char === delimiter && depth === 0) {
      if (current.trim()) results.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) results.push(current.trim());
  return results;
}

export class QueryBuilder<T = any[]> implements PromiseLike<QueryResultResponse<T>> {
  private tableName: string;
  private operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "UPSERT" = "SELECT";
  private selectColumns = "*";
  private isCountQuery = false;
  private isHeadOnly = false;
  private isSingle = false;
  private isMaybeSingle = false;
  private payload: any = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  private whereClauses: { sql: string; values: any[] }[] = [];
  private orderClauses: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName.includes(".") ? tableName : `public."${tableName}"`;
  }

  private get rawTableName(): string {
    const parts = this.tableName.split(".");
    return parts[parts.length - 1].replace(/"/g, "");
  }

  select(columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }): this {
    if (this.operation === "INSERT" || this.operation === "UPDATE" || this.operation === "UPSERT") {
      // Returning fields after mutation
      this.selectColumns = columns || "*";
      return this;
    }
    this.operation = "SELECT";
    this.selectColumns = columns || "*";
    if (options?.count) {
      this.isCountQuery = true;
    }
    if (options?.head) {
      this.isHeadOnly = true;
    }
    return this;
  }

  insert(values: any | any[]): this {
    this.operation = "INSERT";
    this.payload = values;
    return this;
  }

  update(values: Record<string, any>): this {
    this.operation = "UPDATE";
    this.payload = values;
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.operation = "UPSERT";
    this.payload = values;
    if (options) {
      this.upsertOptions = options;
    }
    return this;
  }

  delete(): this {
    this.operation = "DELETE";
    return this;
  }

  eq(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" = $PARAM`,
      values: [value],
    });
    return this;
  }

  neq(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" != $PARAM`,
      values: [value],
    });
    return this;
  }

  gt(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" > $PARAM`,
      values: [value],
    });
    return this;
  }

  gte(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" >= $PARAM`,
      values: [value],
    });
    return this;
  }

  lt(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" < $PARAM`,
      values: [value],
    });
    return this;
  }

  lte(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" <= $PARAM`,
      values: [value],
    });
    return this;
  }

  in(column: string, values: any[]): this {
    if (!values || values.length === 0) {
      this.whereClauses.push({
        sql: `1 = 0`,
        values: [],
      });
      return this;
    }
    this.whereClauses.push({
      sql: `"${column}" = ANY($PARAM)`,
      values: [values],
    });
    return this;
  }

  is(column: string, value: any): this {
    if (value === null) {
      this.whereClauses.push({
        sql: `"${column}" IS NULL`,
        values: [],
      });
    } else if (value === true) {
      this.whereClauses.push({
        sql: `"${column}" IS TRUE`,
        values: [],
      });
    } else if (value === false) {
      this.whereClauses.push({
        sql: `"${column}" IS FALSE`,
        values: [],
      });
    } else {
      this.eq(column, value);
    }
    return this;
  }

  like(column: string, pattern: string): this {
    this.whereClauses.push({
      sql: `"${column}" LIKE $PARAM`,
      values: [pattern],
    });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.whereClauses.push({
      sql: `"${column}" ILIKE $PARAM`,
      values: [pattern],
    });
    return this;
  }

  contains(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" @> $PARAM`,
      values: [typeof value === "object" ? JSON.stringify(value) : value],
    });
    return this;
  }

  containedBy(column: string, value: any): this {
    this.whereClauses.push({
      sql: `"${column}" <@ $PARAM`,
      values: [typeof value === "object" ? JSON.stringify(value) : value],
    });
    return this;
  }

  not(column: string, operator: string, value: any): this {
    if (operator === "is" && value === null) {
      this.whereClauses.push({
        sql: `"${column}" IS NOT NULL`,
        values: [],
      });
    } else if (operator === "in") {
      this.whereClauses.push({
        sql: `NOT ("${column}" = ANY($PARAM))`,
        values: [value],
      });
    } else {
      this.whereClauses.push({
        sql: `NOT ("${column}" = $PARAM)`,
        values: [value],
      });
    }
    return this;
  }

  or(filterString: string): this {
    if (!filterString) return this;
    // Parses e.g. "is_deactivated.eq.false,is_deactivated.is.null"
    // or "status.eq.open,status.eq.in_progress"
    const subFilters = filterString.split(",");
    const orParts: string[] = [];
    const orValues: any[] = [];

    for (const sub of subFilters) {
      const parts = sub.split(".");
      if (parts.length >= 3) {
        const col = parts[0].trim();
        const op = parts[1].trim();
        const val = parts.slice(2).join(".").trim();

        if (op === "eq") {
          orParts.push(`"${col}" = $PARAM`);
          orValues.push(val === "null" ? null : val === "true" ? true : val === "false" ? false : val);
        } else if (op === "is") {
          if (val === "null") orParts.push(`"${col}" IS NULL`);
          else if (val === "true") orParts.push(`"${col}" IS TRUE`);
          else if (val === "false") orParts.push(`"${col}" IS FALSE`);
        } else if (op === "neq") {
          orParts.push(`"${col}" != $PARAM`);
          orValues.push(val);
        }
      }
    }

    if (orParts.length > 0) {
      this.whereClauses.push({
        sql: `(${orParts.join(" OR ")})`,
        values: orValues,
      });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const dir = options?.ascending === false ? "DESC" : "ASC";
    const nulls = options?.nullsFirst ? "NULLS FIRST" : "NULLS LAST";
    this.orderClauses.push(`"${column}" ${dir} ${nulls}`);
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single(): QueryBuilder<any> {
    this.isSingle = true;
    this.limitCount = 1;
    return this as unknown as QueryBuilder<any>;
  }

  maybeSingle(): QueryBuilder<any> {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this as unknown as QueryBuilder<any>;
  }

  private parseSelectColumns(currentTable: string, columnsStr: string): string {
    if (!columnsStr || columnsStr.trim() === "*") {
      return `"${currentTable}".*`;
    }

    const items = splitTopLevel(columnsStr);
    const sqlColumns: string[] = [];

    for (const item of items) {
      // Check for relational syntax: alias:fk_col(sub_cols) or target_table(sub_cols)
      const relMatch = item.trim().match(/^([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?\s*\(([\s\S]+)\)$/);
      if (relMatch) {
        const first = relMatch[1];
        const second = relMatch[2];
        const subCols = relMatch[3].trim();

        const alias = first;
        const fkCol = second || `${first.replace(/s$/, "")}_id`;

        let targetTable = first;
        let targetPk = "id";

        if (FK_TARGET_MAP[fkCol]) {
          targetTable = FK_TARGET_MAP[fkCol].table;
          targetPk = FK_TARGET_MAP[fkCol].pk;
        } else if (!targetTable.includes(".")) {
          targetTable = `public."${targetTable}"`;
        }

        const parsedSub = this.parseSelectColumns(
          targetTable.split(".").pop()!.replace(/"/g, ""),
          subCols
        );

        // Subquery generating JSON object for the embedded relation
        const subquery = `(
          SELECT row_to_json(rel_${alias})
          FROM (
            SELECT ${parsedSub}
            FROM ${targetTable}
            WHERE ${targetTable}."${targetPk}" = "${currentTable}"."${fkCol}"
          ) rel_${alias}
        ) AS "${alias}"`;

        sqlColumns.push(subquery);
      } else if (item.trim() === "*") {
        sqlColumns.push(`"${currentTable}".*`);
      } else {
        const cleanCol = item.trim().replace(/^"/, "").replace(/"$/, "");
        sqlColumns.push(`"${currentTable}"."${cleanCol}"`);
      }
    }

    return sqlColumns.join(", ");
  }

  private buildWhere(paramOffset = 1): { whereSql: string; params: any[] } {
    if (this.whereClauses.length === 0) {
      return { whereSql: "", params: [] };
    }

    const params: any[] = [];
    const sqlChunks: string[] = [];

    let currentParamIndex = paramOffset;

    for (const clause of this.whereClauses) {
      let chunkSql = clause.sql;
      for (const val of clause.values) {
        chunkSql = chunkSql.replace("$PARAM", `$${currentParamIndex}`);
        params.push(val);
        currentParamIndex++;
      }
      sqlChunks.push(chunkSql);
    }

    return {
      whereSql: `WHERE ${sqlChunks.join(" AND ")}`,
      params,
    };
  }

  async execute(): Promise<QueryResultResponse<T>> {
    try {
      const currentTable = this.rawTableName;

      if (this.operation === "SELECT") {
        if (this.isHeadOnly && this.isCountQuery) {
          const { whereSql, params } = this.buildWhere(1);
          const countSql = `SELECT COUNT(*) AS total_count FROM ${this.tableName} ${whereSql};`;
          const countRes = await query(countSql, params);
          const total = parseInt(countRes.rows[0]?.total_count || "0", 10);
          return { data: null, error: null, count: total };
        }

        let totalCount: number | null = null;
        if (this.isCountQuery) {
          const { whereSql, params } = this.buildWhere(1);
          const countSql = `SELECT COUNT(*) AS total_count FROM ${this.tableName} ${whereSql};`;
          const countRes = await query(countSql, params);
          totalCount = parseInt(countRes.rows[0]?.total_count || "0", 10);
        }

        const { whereSql, params } = this.buildWhere(1);
        const selectedCols = this.parseSelectColumns(currentTable, this.selectColumns);

        let sql = `SELECT ${selectedCols} FROM ${this.tableName} ${whereSql}`;

        if (this.orderClauses.length > 0) {
          sql += ` ORDER BY ${this.orderClauses.join(", ")}`;
        }

        if (this.limitCount !== undefined) {
          sql += ` LIMIT ${this.limitCount}`;
        }
        if (this.offsetCount !== undefined) {
          sql += ` OFFSET ${this.offsetCount}`;
        }

        sql += ";";

        const res = await query(sql, params);
        let rows = res.rows;

        if (this.isSingle) {
          if (rows.length === 0) {
            return {
              data: null,
              error: {
                message: "JSON object requested, multiple (or no) rows returned",
                code: "PGRST116",
                details: "The result contains 0 rows",
              },
              count: totalCount,
            };
          }
          return { data: rows[0] as unknown as T, error: null, count: totalCount };
        }

        if (this.isMaybeSingle) {
          return {
            data: (rows[0] || null) as unknown as T,
            error: null,
            count: totalCount,
          };
        }

        return { data: rows as unknown as T, error: null, count: totalCount };
      }

      if (this.operation === "INSERT") {
        const rowsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        if (rowsToInsert.length === 0) {
          return { data: [] as unknown as T, error: null, count: 0 };
        }

        const keys = Object.keys(rowsToInsert[0]);
        const colsSql = keys.map((k) => `"${k}"`).join(", ");

        const valuesSqlList: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const row of rowsToInsert) {
          const rowPlaceholders: string[] = [];
          for (const k of keys) {
            rowPlaceholders.push(`$${pIdx}`);
            let val = row[k];
            if (typeof val === "object" && val !== null && !(val instanceof Date)) {
              val = JSON.stringify(val);
            }
            params.push(val);
            pIdx++;
          }
          valuesSqlList.push(`(${rowPlaceholders.join(", ")})`);
        }

        let sql = `INSERT INTO ${this.tableName} (${colsSql}) VALUES ${valuesSqlList.join(", ")}`;

        if (this.selectColumns) {
          const returningCols = this.parseSelectColumns(currentTable, this.selectColumns);
          sql += ` RETURNING ${returningCols}`;
        }

        sql += ";";

        const res = await query(sql, params);
        const resultRows = res.rows;

        if (this.isSingle || (!Array.isArray(this.payload) && !this.selectColumns.includes(","))) {
          if (this.isSingle && resultRows.length === 0) {
            return {
              data: null,
              error: { message: "Row not found", code: "PGRST116" },
              count: 0,
            };
          }
          return {
            data: (resultRows[0] || null) as unknown as T,
            error: null,
            count: resultRows.length,
          };
        }

        return { data: (Array.isArray(this.payload) ? resultRows : resultRows[0]) as unknown as T, error: null, count: resultRows.length };
      }

      if (this.operation === "UPDATE") {
        const keys = Object.keys(this.payload);
        if (keys.length === 0) {
          return { data: null, error: null, count: 0 };
        }

        const setChunks: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const k of keys) {
          setChunks.push(`"${k}" = $${pIdx}`);
          let val = this.payload[k];
          if (typeof val === "object" && val !== null && !(val instanceof Date)) {
            val = JSON.stringify(val);
          }
          params.push(val);
          pIdx++;
        }

        const { whereSql, params: whereParams } = this.buildWhere(pIdx);
        params.push(...whereParams);

        let sql = `UPDATE ${this.tableName} SET ${setChunks.join(", ")} ${whereSql}`;

        if (this.selectColumns) {
          const returningCols = this.parseSelectColumns(currentTable, this.selectColumns);
          sql += ` RETURNING ${returningCols}`;
        }

        sql += ";";

        const res = await query(sql, params);
        const resultRows = res.rows;

        if (this.isSingle || this.isMaybeSingle) {
          return {
            data: (resultRows[0] || null) as unknown as T,
            error: null,
            count: resultRows.length,
          };
        }

        return { data: resultRows as unknown as T, error: null, count: resultRows.length };
      }

      if (this.operation === "UPSERT") {
        const rowsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        if (rowsToInsert.length === 0) {
          return { data: [] as unknown as T, error: null, count: 0 };
        }

        const keys = Object.keys(rowsToInsert[0]);
        const colsSql = keys.map((k) => `"${k}"`).join(", ");

        const valuesSqlList: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const row of rowsToInsert) {
          const rowPlaceholders: string[] = [];
          for (const k of keys) {
            rowPlaceholders.push(`$${pIdx}`);
            let val = row[k];
            if (typeof val === "object" && val !== null && !(val instanceof Date)) {
              val = JSON.stringify(val);
            }
            params.push(val);
            pIdx++;
          }
          valuesSqlList.push(`(${rowPlaceholders.join(", ")})`);
        }

        const conflictRaw = this.upsertOptions.onConflict || "id";
        const conflictCols = conflictRaw
          .split(",")
          .map((c) => `"${c.trim().replace(/"/g, "")}"`)
          .join(", ");
        const conflictColList = conflictRaw
          .split(",")
          .map((c) => c.trim().replace(/"/g, ""));

        const updateSets = keys
          .filter((k) => !conflictColList.includes(k))
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(", ");

        let sql = `INSERT INTO ${this.tableName} (${colsSql}) VALUES ${valuesSqlList.join(", ")}`;

        if (this.upsertOptions.ignoreDuplicates) {
          sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
        } else if (updateSets) {
          sql += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateSets}`;
        } else {
          sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
        }

        if (this.selectColumns) {
          const returningCols = this.parseSelectColumns(currentTable, this.selectColumns);
          sql += ` RETURNING ${returningCols}`;
        }

        sql += ";";

        const res = await query(sql, params);
        const resultRows = res.rows;

        if (this.isSingle || (!Array.isArray(this.payload) && !this.selectColumns.includes(","))) {
          return {
            data: (resultRows[0] || null) as unknown as T,
            error: null,
            count: resultRows.length,
          };
        }

        return { data: (Array.isArray(this.payload) ? resultRows : resultRows[0]) as unknown as T, error: null, count: resultRows.length };
      }

      if (this.operation === "DELETE") {
        const { whereSql, params } = this.buildWhere(1);
        let sql = `DELETE FROM ${this.tableName} ${whereSql}`;

        if (this.selectColumns && this.selectColumns !== "*") {
          const returningCols = this.parseSelectColumns(currentTable, this.selectColumns);
          sql += ` RETURNING ${returningCols}`;
        }

        sql += ";";

        const res = await query(sql, params);
        return { data: res.rows as unknown as T, error: null, count: res.rowCount };
      }

      return { data: null, error: null, count: null };
    } catch (err: any) {
      console.error(`[Neon Query Error in ${this.tableName}]:`, err.message);
      return {
        data: null,
        error: {
          message: err.message || "Database query failed",
          code: err.code || "DB_ERROR",
          details: err.detail,
          hint: err.hint,
        },
        count: null,
      };
    }
  }

  then<TResult1 = QueryResultResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResultResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
