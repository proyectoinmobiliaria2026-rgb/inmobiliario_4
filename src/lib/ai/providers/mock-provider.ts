// TEMPORAL: provider mock deterministico para desarrollo y pruebas.
// Debe reemplazarse por un proveedor real (AI_PROVIDER=openai) en produccion.
import type { AIService, ListingDraft } from "@/lib/ai/ai-service";
import type { ContentGenerationInput, GeneratedContent } from "@/lib/types/content";
import type { ListingDraftInput } from "@/lib/validators/property";
import { AMENITY_LABELS, OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS, RENTAL_REQUIREMENT_LABELS } from "@/lib/types/property";

const HASHTAG_POOL = [
  "#bienesraices",
  "#realestate",
  "#propiedades",
  "#inmobiliaria",
  "#hogar",
  "#inversion"
];

const CHANNEL_CONFIG: Record<
  ContentGenerationInput["channel"],
  { cta: string; hashtagCount: number }
> = {
  facebook: {
    cta: "Escríbenos para agendar una visita.",
    hashtagCount: 3
  },
  instagram: {
    cta: "Envíanos DM para más información.",
    hashtagCount: 6
  },
  whatsapp: {
    cta: "Responde este mensaje para agendar tu visita.",
    hashtagCount: 2
  },
  tiktok: {
    cta: "Comenta o envíanos DM para más info.",
    hashtagCount: 8
  }
};

function operationLabel(operationType: string): string {
  if (operationType === "rent") return "Renta";
  if (operationType === "temporary_rent") return "Renta temporal";
  return "Venta";
}

function buildFeatures(input: ContentGenerationInput): string {
  const p = input.property;
  return [
    p.bedrooms ? `${p.bedrooms} recámaras` : null,
    p.bathrooms ? `${p.bathrooms} baños` : null,
    p.areaM2 ? `${p.areaM2} m²` : null,
    p.city ?? null
  ]
    .filter((item): item is string => item !== null)
    .join(" · ");
}

function buildPrice(input: ContentGenerationInput): string {
  const p = input.property;
  return p.priceAmount ? `${p.priceAmount} ${p.priceCurrency ?? "USD"}` : "Precio a consultar";
}

function buildHashtags(input: ContentGenerationInput, count: number): string[] {
  const propertyTag = `#${input.property.propertyType}`;
  return [propertyTag, ...HASHTAG_POOL].slice(0, Math.max(1, count));
}

export class MockAIService implements AIService {
  readonly provider = "mock";

  async generateContent(input: ContentGenerationInput): Promise<GeneratedContent> {
    const config = CHANNEL_CONFIG[input.channel];
    const label = operationLabel(input.property.operationType);
    const features = buildFeatures(input);
    const price = buildPrice(input);

    let copy: string;
    if (input.channel === "whatsapp") {
      copy = [`${label}: ${input.property.title}`, features, `Precio: ${price}`, "", config.cta]
        .filter((line) => line !== "")
        .join("\n");
    } else if (input.channel === "instagram") {
      copy = [
        `✨ ${input.property.title}`,
        "",
        features,
        `${label} · ${price}`,
        "",
        config.cta
      ]
        .filter((line) => line !== "")
        .join("\n");
    } else {
      copy = [
        `${label}: ${input.property.title}`,
        "",
        input.property.description ?? "Propiedad destacada en excelente ubicación.",
        "",
        features,
        `Precio: ${price}`,
        "",
        config.cta
      ]
        .filter((line) => line !== "")
        .join("\n");
    }

    return {
      copy,
      hashtags: buildHashtags(input, config.hashtagCount),
      cta: config.cta
    };
  }

  async generateListing(input: ListingDraftInput): Promise<ListingDraft> {
    const typeLabel = PROPERTY_TYPE_LABELS[input.propertyType] ?? input.propertyType;
    const operationLabel = OPERATION_TYPE_LABELS[input.operationType] ?? input.operationType;
    const amenities = input.amenities.map((item) => AMENITY_LABELS[item] ?? item);
    const requirements = input.rentalRequirements.map((item) => RENTAL_REQUIREMENT_LABELS[item] ?? item);
    const place = input.city ? ` en ${input.city}` : "";

    const highlight = amenities[0] ? ` con ${amenities[0].toLowerCase()}` : "";
    const title = `${typeLabel} en ${operationLabel}${place}${highlight}`.slice(0, 120);

    const features = [
      input.bedrooms ? `${input.bedrooms} recámaras` : null,
      input.bathrooms ? `${input.bathrooms} baños` : null,
      input.parkingSpots ? `${input.parkingSpots} estacionamiento(s)` : null,
      input.city ? `ubicado en ${input.city}` : null
    ].filter((item): item is string => item !== null);

    const descriptionParts = [
      `${typeLabel} ideal para ${input.operationType === "sale" ? "quienes buscan invertir o estrenar hogar" : "quienes buscan un hogar cómodo y seguro"}.`,
      features.length > 0 ? `Cuenta con ${features.join(", ")}.` : null,
      amenities.length > 0 ? `El edificio ofrece ${amenities.join(", ").toLowerCase()}.` : null,
      `Precio: ${input.priceAmount ? `${input.priceAmount} ${input.priceCurrency ?? "MXN"}` : "a consultar"}.`,
      requirements.length > 0 ? `Requisitos de contratación: ${requirements.join(", ")}.` : null,
      "Agenda tu visita y conoce todo lo que este espacio tiene para ti."
    ];

    const description = descriptionParts.filter((part): part is string => part !== null).join(" ");

    return { title, description };
  }
}
