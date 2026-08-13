import { createClient } from 'npm:@supabase/supabase-js@2';
import { MockAIContentProvider, MockCreativeBackgroundProvider } from './mockProvider.ts';
import type { AIContentProvider, BusinessContext, CreativeBackgroundProvider, GenerationType } from './provider.ts';

type JsonRecord=Record<string,unknown>;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  let reservationId='';
  try{
    const authorization=request.headers.get('Authorization');
    if(!authorization)return json({error:'Please sign in to use AI Content Studio.'},401);
    const env=environment();
    const userClient=createClient(env.supabaseUrl,env.anonKey,{global:{headers:{Authorization:authorization}}});
    const{data:userData,error:userError}=await userClient.auth.getUser();
    if(userError||!userData.user)return json({error:'Your session has expired. Please sign in again.'},401);
    const body=await request.json() as {prompt?:unknown;generationType?:unknown;requestId?:unknown};
    const prompt=sanitizePrompt(body.prompt);
    const generationType=typeValue(body.generationType);
    const requestId=stringValue(body.requestId);
    if(!requestId)return json({error:'Please try generating again.'},400);

    const{data:reservation,error:reserveError}=await userClient.rpc('reserve_ai_content_generation',{
      target_prompt:prompt,target_generation_type:generationType,target_request_id:requestId,
    });
    if(reserveError){
      if(reserveError.message.includes('daily_generation_limit_reached'))return json({error:"You've created today's free post.",code:'DAILY_LIMIT'},429);
      throw new Error(reserveError.message);
    }
    reservationId=stringValue(reservation?.id);
    const admin=createClient(env.supabaseUrl,env.serviceKey,{auth:{persistSession:false}});
    if(reservation?.status==='completed')return json({generation:reservation,reused:true});

    const{data:business,error:businessError}=await admin.from('businesses').select('id,owner_id,name,category,description,bio,services_summary,address,location,city,state,phone,whatsapp,website_url,instagram_url,logo_url,cover_url,featured_products,popular_items,opening_hours,today_offer,preferred_content_language').eq('id',reservation.business_id).eq('owner_id',userData.user.id).single();
    if(businessError||!business)throw new Error('Owned business context was not found');
    const{data:offers}=await admin.from('deals').select('title,description,offer_price,original_price,discount_percent,ends_at').eq('business_id',business.id).eq('status','published').gte('ends_at',new Date().toISOString()).limit(5);
    const context=businessContext(env.supabaseUrl,business,offers??[]);
    const now=new Date();
    const dateIso=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(now);
    const dateLabel=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
    const weekday=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'long'}).format(now);
    const providers=providersFor(env.provider);
    const input={prompt,type:generationType,dateIso,dateLabel,weekday,business:context};
    const content=await providers.text.generateContent(input);
    const creative=await providers.creative.generateCreativeBackground({...input,content});
    const rendererData={businessName:context.name,logoUrl:context.logoUrl,headline:content.headline,supportingText:content.supportingText,cta:content.cta,offer:context.todayOffer,address:context.address,location:context.city||context.location,phone:context.phone,whatsapp:context.whatsapp,website:context.website,dateLabel};
    const{data:completed,error:completeError}=await admin.rpc('complete_ai_content_generation',{
      target_generation_id:reservationId,target_caption:content.caption,target_headline:content.headline,
      target_supporting_text:content.supportingText,target_cta:content.cta,target_creative_spec:creative,
      target_renderer_data:rendererData,target_metadata:{textProvider:providers.text.name,creativeProvider:providers.creative.name,dateIso,weekday,language:context.preferredLanguage},
    });
    if(completeError)throw new Error(completeError.message);
    return json({generation:completed});
  }catch(error){
    const message=error instanceof Error?error.message:'Unexpected error';
    console.error('AI Content Studio generation failed:',message);
    if(reservationId){try{const env=environment();const admin=createClient(env.supabaseUrl,env.serviceKey,{auth:{persistSession:false}});await admin.rpc('release_ai_content_generation',{target_generation_id:reservationId});}catch{/* preserve original failure */}}
    if(message.includes('prompt must'))return json({error:'Keep your prompt between 1 and 600 characters.'},400);
    return json({error:'We could not create your post right now. Please try again.'},500);
  }
});

function providersFor(name:string):{text:AIContentProvider;creative:CreativeBackgroundProvider}{
  if(name==='mock')return{text:new MockAIContentProvider(),creative:new MockCreativeBackgroundProvider()};
  throw new Error(`AI provider adapter is not configured: ${name}`);
}
function businessContext(url:string,b:JsonRecord,offers:unknown[]):BusinessContext{return{id:stringValue(b.id),name:stringValue(b.name),category:stringValue(b.category),description:stringValue(b.description),bio:stringValue(b.bio),services:stringValue(b.services_summary),address:stringValue(b.address),location:stringValue(b.location),city:stringValue(b.city),state:stringValue(b.state),phone:stringValue(b.phone),whatsapp:stringValue(b.whatsapp),website:stringValue(b.website_url),instagram:stringValue(b.instagram_url),logoUrl:asset(url,'business-logos',b.logo_url),coverUrl:asset(url,'business-covers',b.cover_url),products:Array.isArray(b.featured_products)?b.featured_products:[],popularItems:Array.isArray(b.popular_items)?b.popular_items:[],openingHours:Array.isArray(b.opening_hours)?b.opening_hours:[],activeOffers:offers,todayOffer:stringValue(b.today_offer),preferredLanguage:stringValue(b.preferred_content_language)||'Auto'};}
function asset(url:string,bucket:string,value:unknown){const path=stringValue(value);return !path||/^https?:\/\//.test(path)?path:`${url}/storage/v1/object/public/${bucket}/${path}`;}
function sanitizePrompt(value:unknown){if(typeof value!=='string')throw new Error('prompt must contain 1 to 600 characters');const cleaned=[...value].map(character=>{const code=character.charCodeAt(0);return code<32||code===127?' ':character;}).join('').replace(/\s+/g,' ').trim();if(!cleaned||cleaned.length>600)throw new Error('prompt must contain 1 to 600 characters');return cleaned;}
function typeValue(value:unknown):GenerationType{const type=stringValue(value);return ['today','offer','festival','product_service','announcement','custom'].includes(type)?type as GenerationType:'custom';}
function stringValue(value:unknown){return typeof value==='string'?value:'';}
function required(name:string){const value=Deno.env.get(name);if(!value)throw new Error(`Server configuration missing: ${name}`);return value;}
function environment(){return{supabaseUrl:required('SUPABASE_URL'),anonKey:required('SUPABASE_ANON_KEY'),serviceKey:required('SUPABASE_SERVICE_ROLE_KEY'),provider:Deno.env.get('AI_CONTENT_PROVIDER')||'mock'};}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});}
