import type { AIContentProvider, ContentDraft, CreativeBackgroundProvider, CreativeSpec, GenerationInput } from './provider.ts';

const campaignLabels: Record<GenerationInput['type'], string> = {today:'DAILY BUSINESS EDIT',offer:'LIMITED-TIME OFFER',festival:'CELEBRATE WITH US',product_service:'FEATURED FOR YOU',announcement:'BUSINESS UPDATE',custom:'CREATED FOR YOU'};
const layoutFor:Record<GenerationInput['type'],NonNullable<CreativeSpec['layout']>>={today:'daily',offer:'offer',festival:'festival',product_service:'product',announcement:'announcement',custom:'product'};
function hash(value:string){let result=2166136261;for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}return result>>>0;}
function categoryGroup(category:string){const value=category.toLowerCase();if(/restaurant|cafe|food|bakery/.test(value))return'food';if(/salon|beauty|spa|fashion/.test(value))return'beauty';if(/gym|fitness|sport/.test(value))return'fitness';if(/tech|software|electronic/.test(value))return'tech';if(/medical|clinic|doctor|dental|professional/.test(value))return'medical';if(/retail|store|shop|boutique/.test(value))return'retail';return'default';}

function compact(value: string, fallback: string, limit: number) {
  const normalized=value.replace(/\s+/g,' ').trim();
  return (normalized || fallback).slice(0,limit);
}

export class MockAIContentProvider implements AIContentProvider {
  readonly name='mock';
  async generateContent(input: GenerationInput): Promise<ContentDraft> {
    const business=input.business;
    const subject=business.services || business.description || business.category;
    const choices:Record<GenerationInput['type'],string[]>={today:[`Make ${input.weekday} Remarkable`,`Your Local ${input.weekday} Favourite`,`A Better ${input.weekday} Starts Here`],offer:['More Value. More Reasons To Visit.','Your Favourite Deal Is Here','A Little Extra, Just For You'],festival:['Celebrate The Moment Together','Warm Wishes. Beautiful Beginnings.','Joy Looks Better Together'],product_service:['Made To Be Your New Favourite','Thoughtfully Made For You','Discover What We Do Best'],announcement:['Something New Is Here','A Fresh Chapter Begins','Good News, Right This Way'],custom:['Your Idea, Brought To Life','Made Around What Matters','A Better Choice Starts Here']};
    const headline=choices[input.type][hash(`${input.prompt}:${input.dateIso}`)%choices[input.type].length];
    const supportingText=input.type==='offer' ? compact(business.todayOffer||input.prompt,'Something special for you today',145) : compact(subject,`Discover ${business.name}`,145);
    const cta=business.whatsapp ? 'Message us on WhatsApp' : business.phone ? 'Call us today' : 'Visit us today';
    const eyebrow=input.type==='today'?`${input.weekday.toUpperCase()} EDIT`:campaignLabels[input.type];
    const caption=`${eyebrow}\n\n${headline}\n${supportingText}\n\n${cta}. ${business.city || business.location ? `Find us in ${business.city || business.location}.` : ''}`.trim();
    return { caption, headline:compact(headline,'TODAY\'S PICK',70), supportingText, cta, eyebrow };
  }
}

export class MockCreativeBackgroundProvider implements CreativeBackgroundProvider {
  readonly name='mock-gradient';
  async generateCreativeBackground(input: GenerationInput & { content: ContentDraft }): Promise<CreativeSpec> {
    const group=categoryGroup(input.business.category),palettes:Record<string,[string,string,string]>={food:['#180b07','#8f2f12','#ffb45c'],beauty:['#190d19','#7b285f','#f6a7cf'],fitness:['#090d14','#1f4650','#b8f23d'],tech:['#07121f','#174b76','#4fd1ff'],medical:['#071918','#21665f','#82ded1'],retail:['#171027','#5941a9','#f3a34b'],default:['#061510','#146340','#6be3a5']};
    const seed=hash(`${input.business.id}:${input.prompt}:${input.dateIso}`);
    return {kind:'gradient',colors:palettes[group],mood:`premium ${group} campaign`,composition:layoutFor[input.type],decorativeStyle:`controlled ${group} geometry, texture and light; no rendered text`,layout:layoutFor[input.type],variant:seed%4};
  }
}
