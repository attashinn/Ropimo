import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";

export interface InvitationEmailProps {
  inviterName: string;
  workspaceName: string;
  roleName: string;
  departmentNames?: string[];
  inviteUrl: string;
  expiresInDays?: number;
  personalMessage?: string | null;
}

export function InvitationEmail({
  inviterName,
  workspaceName,
  roleName,
  departmentNames = [],
  inviteUrl,
  expiresInDays = 7,
  personalMessage,
}: InvitationEmailProps) {
  const previewText = `${inviterName} invited you to join ${workspaceName} on Zambic`;
  const departmentsStr =
    departmentNames.length > 0 ? ` (${departmentNames.join(", ")})` : "";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Wordmark */}
          <Section style={headerStyle}>
            <Text style={wordmarkStyle}>ZAMBIC</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={headlineStyle}>
              <strong>{inviterName}</strong> invited you to join{" "}
              <strong>{workspaceName}</strong> as a{" "}
              <strong style={{ textTransform: "capitalize" }}>{roleName}</strong>
              {departmentsStr}.
            </Text>

            {personalMessage ? (
              <Section style={messageBoxStyle}>
                <Text style={messageTextStyle}>&ldquo;{personalMessage}&rdquo;</Text>
                <Text style={messageAuthorStyle}>— {inviterName}</Text>
              </Section>
            ) : null}

            <Text style={bodyTextStyle}>
              Join your team to collaborate on projects, manage tasks, and coordinate work across departments.
            </Text>

            <Section style={buttonContainerStyle}>
              <Button href={inviteUrl} style={buttonStyle}>
                Accept invitation
              </Button>
            </Section>

            <Text style={expiryStyle}>
              This invitation expires in {expiresInDays} days.
            </Text>

            <Hr style={hrStyle} />

            <Text style={footerStyle}>
              If you weren&apos;t expecting this invitation, you can safely ignore this email.
            </Text>
            <Text style={footerSubStyle}>
              Or copy and paste this URL into your browser:{" "}
              <Link href={inviteUrl} style={linkStyle}>
                {inviteUrl}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function generateInvitationPlainText({
  inviterName,
  workspaceName,
  roleName,
  departmentNames = [],
  inviteUrl,
  expiresInDays = 7,
  personalMessage,
}: InvitationEmailProps): string {
  const departmentsStr =
    departmentNames.length > 0 ? ` (${departmentNames.join(", ")})` : "";
  const lines: string[] = [
    "ZAMBIC",
    "",
    `${inviterName} invited you to join ${workspaceName} on Zambic as a ${roleName}${departmentsStr}.`,
  ];

  if (personalMessage) {
    lines.push("", `"${personalMessage}" - ${inviterName}`);
  }

  lines.push(
    "",
    "Accept your invitation using this link:",
    inviteUrl,
    "",
    `This invitation expires in ${expiresInDays} days.`,
    "",
    "If you weren't expecting this, ignore this email."
  );

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (Off-white, black button, text wordmark, no images or gradients)
// ─────────────────────────────────────────────────────────────────────────────

const mainStyle: React.CSSProperties = {
  backgroundColor: "#F6F4EC",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: "40px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  border: "1px solid #E9E6DA",
  maxWidth: "520px",
  margin: "0 auto",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "32px 32px 16px 32px",
};

const wordmarkStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "#111111",
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  padding: "0 32px 32px 32px",
};

const headlineStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#111111",
  margin: "0 0 16px 0",
};

const messageBoxStyle: React.CSSProperties = {
  backgroundColor: "#FAF9F5",
  borderLeft: "3px solid #111111",
  borderRadius: "4px",
  padding: "12px 16px",
  margin: "0 0 20px 0",
};

const messageTextStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#333333",
  fontStyle: "italic",
  margin: "0 0 4px 0",
};

const messageAuthorStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6B6B6B",
  margin: 0,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#6B6B6B",
  margin: "0 0 24px 0",
};

const buttonContainerStyle: React.CSSProperties = {
  margin: "0 0 24px 0",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#111111",
  color: "#FFFFFF",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 24px",
};

const expiryStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9A9A9A",
  margin: "0 0 24px 0",
};

const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #E9E6DA",
  margin: "0 0 16px 0",
};

const footerStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#9A9A9A",
  margin: "0 0 8px 0",
};

const footerSubStyle: React.CSSProperties = {
  fontSize: "11px",
  lineHeight: "16px",
  color: "#9A9A9A",
  margin: 0,
  wordBreak: "break-all",
};

const linkStyle: React.CSSProperties = {
  color: "#111111",
  textDecoration: "underline",
};
