import type { ContentGenerationInput } from "@/lib/types/content";
import type { ListingDraftInput } from "@/lib/validators/property";
import { AMENITY_LABELS, OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS, RENTAL_REQUIREMENT_LABELS } from "@/lib/types/property";

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

export const LISTING_SYSTEM_PROMPT = `Eres un agente inmobiliario experto en redactar anuncios de propiedades en Mexico.
Escribe siempre en espanol neutro profesional, con tono comercial y confiable.
Genera:
- "title": titulo atractivo de 6 a 12 palabras que incluya tipo de propiedad, operacion y un gancho de ubicacion o caracteristica estrella. Sin comillas ni signos de exclamacion excesivos.
- "description": descripcion de 60 a 110 palabras en parrafo unico que destaque espacios, amenidades, ubicacion y, si es renta, los requisitos de contratacion. No inventes datos que no esten en la informacion proporcionada.
Responde UNICAMENTE un JSON valido con la forma: {"title": string, "description": string}`;

export function buildListingUserPrompt(input: ListingDraftInput): string {
  const price = input.priceAmount ? `${input.priceAmount} ${input.priceCurrency ?? "MXN"}` : "a consultar";
  const amenities = input.amenities.map((item) => AMENITY_LABELS[item] ?? item);
  const requirements = input.rentalRequirements.map((item) => RENTAL_REQUIREMENT_LABELS[item] ?? item);

  const lines = [
    `Genera el titulo y la descripcion del anuncio.`,
    `Tipo de propiedad: ${PROPERTY_TYPE_LABELS[input.propertyType] ?? input.propertyType}`,
    `Operacion: ${OPERATION_TYPE_LABELS[input.operationType] ?? input.operationType}`,
    input.city ? `Ciudad: ${input.city}` : null,
    input.bedrooms ? `Recamaras: ${input.bedrooms}` : null,
    input.bathrooms ? `Banos: ${input.bathrooms}` : null,
    input.parkingSpots ? `Estacionamientos: ${input.parkingSpots}` : null,
    `Precio: ${price}`,
    amenities.length > 0 ? `Amenidades: ${amenities.join(", ")}` : null,
    requirements.length > 0 ? `Requisitos de contratacion: ${requirements.join(", ")}` : null,
    "",
    'Responde SOLO JSON con: {"title": string, "description": string}.'
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}
