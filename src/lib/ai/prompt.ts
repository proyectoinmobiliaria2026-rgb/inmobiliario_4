import type { ContentGenerationInput } from "@/lib/types/content";

export const CONTENT_SYSTEM_PROMPT = `Eres un copywriter inmobiliario experto en redes sociales.
Genera copies en español adaptados al canal solicitado:
- facebook: narrativo y cercano (3-5 lineas).
- instagram: breve, con emojis y saltos de linea.
- whatsapp: directo, tipo mensaje, con precio visible.
Siempre incluye hashtags relevantes y un CTA claro.
Responde UNICAMENTE un JSON valido con la forma:
{"copy": string, "hashtags": string[], "cta": string}`;

export function buildUserPrompt(input: ContentGenerationInput): string {
  const p = input.property;
  const price = p.priceAmount ? `${p.priceAmount} ${p.priceCurrency ?? "USD"}` : "a consultar";

  const lines = [
    `Genera un copy inmobiliario para el canal: ${input.channel}.`,
    `Propiedad: ${p.title}`,
    `Tipo: ${p.propertyType} · Operación: ${p.operationType}`,
    p.city ? `Ciudad: ${p.city}` : null,
    p.bedrooms ? `Recámaras: ${p.bedrooms}` : null,
    p.bathrooms ? `Baños: ${p.bathrooms}` : null,
    p.areaM2 ? `Área: ${p.areaM2} m²` : null,
    `Precio: ${price}`,
    p.description ? `Descripción base: ${p.description}` : null,
    "",
    'Responde SOLO JSON con: {"copy": string, "hashtags": string[], "cta": string}.'
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}
