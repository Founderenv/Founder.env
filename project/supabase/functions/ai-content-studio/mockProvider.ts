import type { AIContentProvider, ContentDraft, CreativeBackgroundProvider, CreativeSpec, GenerationInput } from './provider.ts';

const campaignLabels: Record<GenerationInput['type'], string> = {
  today: 'TODAY AT', offer: 'SPECIAL OFFER', festival: 'CELEBRATE WITH US',
  product_service: 'MADE FOR YOU', announcement: 'NOW ANNOUNCING', custom: 'JUST FOR YOU',
};

function compact(value: string, fallback: string, limit: number) {
  const normalized=value.replace(/\s+/g,' ').trim();
  return (normalized || fallback).slice(0,limit);
}

export class MockAIContentProvider implements AIContentProvider {
  readonly name='mock';
  async generateContent(input: GenerationInput): Promise<ContentDraft> {
    const business=input.business;
    const offer=business.todayOffer || compact(input.prompt,'Something special for you today',90);
    const subject=business.services || business.description || business.category;
    const headline=input.type==='today' ? `${campaignLabels.today} ${business.name.toUpperCase()}` : campaignLabels[input.type];
    const supportingText=input.type==='offer' ? offer : compact(subject,`Discover ${business.name}`,105);
    const cta=business.whatsapp ? 'Message us on WhatsApp' : business.phone ? 'Call us today' : 'Visit us today';
    const caption=`${headline}\n\n${supportingText}\n\n${cta}. ${business.city || business.location ? `Find us in ${business.city || business.location}.` : ''}`.trim();
    return { caption, headline:compact(headline,'TODAY\'S PICK',54), supportingText, cta };
  }
}

export class MockCreativeBackgroundProvider implements CreativeBackgroundProvider {
  readonly name='mock-gradient';
  async generateCreativeBackground(input: GenerationInput & { content: ContentDraft }): Promise<CreativeSpec> {
    const category=input.business.category.toLowerCase();
    const colors: [string,string,string]=category.includes('food')||category.includes('cafe')||category.includes('restaurant')
      ? ['#2b1208','#9a3412','#fb923c']
      : category.includes('beauty')||category.includes('salon')
        ? ['#250b22','#86198f','#f0abfc']
        : category.includes('fitness')
          ? ['#071a16','#047857','#34d399']
          : ['#07140e','#0f7a49','#41cc8b'];
    return { kind:'gradient',colors,mood:'premium, confident and welcoming',composition:'open center-left area with soft depth',decorativeStyle:'layered light orbs and subtle grain; no rendered text' };
  }
}
