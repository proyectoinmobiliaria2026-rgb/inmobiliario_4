import type { APIRequestContext } from "@playwright/test";

export async function cleanupPropertiesByTitlePrefix(
  request: APIRequestContext,
  prefixes: string[]
): Promise<void> {
  const response = await request.get("/api/properties?pageSize=100");
  if (!response.ok()) {
    return;
  }

  const payload = (await response.json()) as {
    data?: { items?: { id: string; title: string }[] };
  };
  const items = payload.data?.items ?? [];

  for (const item of items) {
    if (prefixes.some((prefix) => item.title.startsWith(prefix))) {
      await request.delete(`/api/properties/${item.id}`);
    }
  }
}
