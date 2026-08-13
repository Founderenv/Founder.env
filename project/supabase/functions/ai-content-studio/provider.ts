export type GenerationType = 'today' | 'offer' | 'festival' | 'product_service' | 'announcement' | 'custom';

export interface BusinessContext {
  id: string;
  name: string;
  category: string;
  description: string;
  bio: string;
  services: string;
  address: string;
  location: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  logoUrl: string;
  coverUrl: string;
  products: unknown[];
  popularItems: unknown[];
  openingHours: unknown[];
  activeOffers: unknown[];
  todayOffer: string;
  preferredLanguage: string;
}

export interface CreativeSpec {
  kind: 'gradient' | 'image';
  backgroundUrl?: string;
  colors: [string, string, string];
  mood: string;
  composition: string;
  decorativeStyle: string;
}

export interface ContentDraft {
  caption: string;
  headline: string;
  supportingText: string;
  cta: string;
}

export interface GenerationInput {
  prompt: string;
  type: GenerationType;
  dateIso: string;
  dateLabel: string;
  weekday: string;
  business: BusinessContext;
}

export interface AIContentProvider {
  readonly name: string;
  generateContent(input: GenerationInput): Promise<ContentDraft>;
}

export interface CreativeBackgroundProvider {
  readonly name: string;
  generateCreativeBackground(input: GenerationInput & { content: ContentDraft }): Promise<CreativeSpec>;
}
