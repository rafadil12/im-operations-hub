/** Visual + stored topic text: always ALL CAPS. CJK is unchanged by toUpperCase. */
export function renderTopicText(value: string): string {
  return String(value ?? "").toUpperCase();
}

export function normalizeTopicText(value: string): string {
  return renderTopicText(value).trim().replace(/\s+/g, " ");
}

export function resolveSessionTopics(
  topicEn: string,
  topicCn: string
): { topicEn: string; topicCn: string } {
  const en = topicEn.trim();
  const cn = topicCn.trim();
  const normalizedEn = en ? normalizeTopicText(en) : cn ? normalizeTopicText(cn) : "";
  const normalizedCn = cn ? normalizeTopicText(cn) : en ? normalizeTopicText(en) : "";
  return { topicEn: normalizedEn, topicCn: normalizedCn };
}
