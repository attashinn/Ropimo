---
description: Honest and evidence-based reporting rules. Applies to every task and every audit or progress report.
globs: **/*
alwaysApply: true
---

# Honest reporting rules

This rule set applies to every task, audit, test, and progress report. All claims must be grounded in actual execution and verifiable evidence.

## 1. Prohibited language
- **NEVER** write "100% functional", "fully operational", "all working", "completely working", "works perfectly", or any variation.
- Never use marketing language or optimistic assumptions about code health or completeness.

## 2. Mandatory status labels
Every page, feature, endpoint, or system audited must be labeled as **exactly one** of the following:

- **`VERIFIED`**: You actively executed or ran the feature with an end-to-end test or command, AND you display the command/test and its actual output in the report.
- **`CODE-ONLY`**: Code exists in the repository, but has not been run or exercised end-to-end.
- **`MOCK`**: The feature relies on fake data, hardcoded stubs, in-memory arrays, or local files instead of real database/API persistence.
- **`BROKEN`**: The feature fails, crashes, errors, or violates requirements. You must include the exact error message, stack trace, or failing output.
- **`UNKNOWN`**: State or health cannot be determined from available information.

## 3. Strict verification standards
- **HTTP 200 is NOT verification**: A route returning status 200 only proves the server responded, not that its queries, mutations, or client behaviors work.
- **Table existence is NOT verification**: A table existing in a database does not prove features work.
- **0 rows means unexercised**: A database table with 0 rows means the feature was never exercised end-to-end in practice.
- **Real user context only (RLS)**: Never use the database service role key to prove a user feature works. Always test using the public/anon key with an authentic user session so Row Level Security (RLS) policies apply.
- **Multi-tenant / Auth verification**: Anything concerning authentication, authorization, permissions, or data access MUST be tested with:
  1. User A in Workspace 1
  2. User B in Workspace 2 (verifying tenant isolation)
  3. A logged-out visitor (verifying public vs protected boundaries)

## 4. Omissions and gaps
- If you did not or could not test something, explicitly state **"not tested"** and clearly explain the specific technical reason why.

## 5. Mandatory report conclusion
- Every single report or audit must conclude with a dedicated section titled:
  ### What I could not verify
  Listing all unexercised paths, unverified edge cases, untested database mutations, and remaining uncertainties.
