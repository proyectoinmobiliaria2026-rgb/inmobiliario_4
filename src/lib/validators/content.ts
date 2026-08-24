import { CONTENT_CHANNELS, type ContentChannel } from "@/lib/types/content";

export function parseGenerateContentInput(payload: unknown): { channel: ContentChannel } {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid payload");
  }

  const channel = (payload as Record<string, unknown>).channel;

  if (typeof channel !== "string" || !CONTENT_CHANNELS.includes(channel as ContentChannel)) {
    throw new Error("channel must be one of: facebook, instagram, whatsapp");
  }

  return { channel: channel as ContentChannel };
}
