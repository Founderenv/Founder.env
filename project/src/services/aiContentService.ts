import type { Business } from '@/types';
import { dataMode, requireSupabase } from '@/lib/supabase';

export type AIContentType='today'|'offer'|'festival'|'product_service'|'announcement'|'custom';
export interface CreativeSpec{kind:'gradient'|'image';backgroundUrl?:string;colors:[string,string,string];mood:string;composition:string;decorativeStyle:string}
export interface RendererData{businessName:string;logoUrl:string;headline:string;supportingText:string;cta:string;offer:string;address:string;location:string;phone:string;whatsapp:string;website:string;dateLabel:string}
export interface AIContentGeneration{id:string;businessId:string;type:AIContentType;prompt:string;caption:string;headline:string;supportingText:string;cta:string;creative:CreativeSpec;renderer:RendererData;posterPath?:string;posterUrl?:string;generationDate:string;createdAt:string;metadata:Record<string,unknown>}

type Row=Record<string,unknown>;
const row=(value:unknown):Row=>value&&typeof value==='object'?value as Row:{};
const str=(value:unknown)=>typeof value==='string'?value:'';
function mapGeneration(value:unknown):AIContentGeneration{const r=row(value);return{id:str(r.id),businessId:str(r.business_id),type:str(r.generation_type) as AIContentType,prompt:str(r.prompt),caption:str(r.caption),headline:str(r.headline),supportingText:str(r.supporting_text),cta:str(r.cta),creative:row(r.creative_spec) as unknown as CreativeSpec,renderer:row(r.renderer_data) as unknown as RendererData,posterPath:str(r.poster_path)||undefined,generationDate:str(r.generation_date),createdAt:str(r.created_at),metadata:row(r.metadata)};}
function indiaDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());}
function mockKey(businessId:string){return `founder-ai-content:${businessId}`;}
function mockHistory(businessId:string):AIContentGeneration[]{try{return JSON.parse(localStorage.getItem(mockKey(businessId))||'[]') as AIContentGeneration[];}catch{return[];}}
function mockGenerate(prompt:string,type:AIContentType,business:Business):AIContentGeneration{const date=new Date(),dateLabel=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);const service=business.servicesSummary||business.description||business.category;const labels:Record<AIContentType,string>={today:`TODAY AT ${business.name.toUpperCase()}`,offer:'SPECIAL OFFER',festival:'CELEBRATE WITH US',product_service:'MADE FOR YOU',announcement:'NOW ANNOUNCING',custom:'JUST FOR YOU'};const headline=labels[type],supportingText=(type==='offer'&&business.todayOffer?business.todayOffer:service).slice(0,105),cta=business.whatsapp?'Message us on WhatsApp':business.phone?'Call us today':'Visit us today';return{id:crypto.randomUUID(),businessId:business.id,type,prompt,caption:`${headline}\n\n${supportingText}\n\n${cta}.`,headline,supportingText,cta,creative:{kind:'gradient',colors:['#07140e','#0f7a49','#41cc8b'],mood:'premium and welcoming',composition:'open center-left',decorativeStyle:'light orbs'},renderer:{businessName:business.name,logoUrl:business.logoUrl,headline,supportingText,cta,offer:business.todayOffer||'',address:business.address,location:business.city||business.location,phone:business.phone,whatsapp:business.whatsapp,website:business.socialLinks.website||'',dateLabel},generationDate:indiaDate(),createdAt:date.toISOString(),metadata:{textProvider:'mock-local',creativeProvider:'mock-gradient'}};}

export const AIContentService={
  async history(businessId:string){
    if(dataMode==='mock')return mockHistory(businessId);
    const client=requireSupabase();const{data,error}=await client.from('ai_content_generations').select('*').eq('business_id',businessId).eq('status','completed').order('created_at',{ascending:false}).limit(30);if(error)throw error;
    const items=(data??[]).map(mapGeneration);await Promise.all(items.map(async(item)=>{if(!item.posterPath)return;const{data:signed}=await client.storage.from('ai-content-posters').createSignedUrl(item.posterPath,3600);item.posterUrl=signed?.signedUrl;}));return items;
  },
  async generate(input:{prompt:string;type:AIContentType;business:Business;requestId:string}){
    const prompt=[...input.prompt].map(character=>{const code=character.charCodeAt(0);return code<32||code===127?' ':character;}).join('').replace(/\s+/g,' ').trim();if(!prompt||prompt.length>600)throw new Error('Keep your prompt between 1 and 600 characters.');
    if(dataMode==='mock'){const previous=mockHistory(input.business.id);if(previous.some(item=>item.generationDate===indiaDate()))throw new Error("You've created today's free post.");const generated=mockGenerate(prompt,input.type,input.business);localStorage.setItem(mockKey(input.business.id),JSON.stringify([generated,...previous]));return generated;}
    const{data,error}=await requireSupabase().functions.invoke<{generation:unknown}>('ai-content-studio',{body:{prompt,generationType:input.type,requestId:input.requestId}});
    if(error){let message=error.message||'Generation failed';try{const payload=await (error as {context?:Response}).context?.json() as {error?:string}|undefined;if(payload?.error)message=payload.error;}catch{/* use safe fallback */}throw new Error(message);}
    return mapGeneration(data?.generation);
  },
  async attachPoster(generation:AIContentGeneration,blob:Blob){
    if(dataMode==='mock')return generation;
    const client=requireSupabase(),path=`business/${generation.businessId}/${generation.id}.png`;const{error:uploadError}=await client.storage.from('ai-content-posters').upload(path,blob,{contentType:'image/png',upsert:true});if(uploadError)throw uploadError;const{error}=await client.rpc('attach_ai_content_poster',{target_generation_id:generation.id,target_poster_path:path});if(error)throw error;return{...generation,posterPath:path};
  },
  usedToday(items:AIContentGeneration[]){return items.some(item=>item.generationDate===indiaDate());},
};
