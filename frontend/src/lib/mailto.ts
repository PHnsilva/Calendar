export type MailtoInput = {
  to: string;
  subject: string;
  body: string;
};

export function buildMailtoUrl({ to, subject, body }: MailtoInput): string {
  const params = new URLSearchParams();
  if (subject.trim()) params.set("subject", subject.trim());
  if (body.trim()) params.set("body", body.trim());
  const query = params.toString();
  return `mailto:${encodeURIComponent(to.trim())}${query ? `?${query}` : ""}`;
}
