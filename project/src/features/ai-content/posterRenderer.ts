import type { AIContentGeneration } from '@/services/aiContentService';

const SIZE=1080;
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function lines(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines:number){const words=text.trim().split(/\s+/),result:string[]=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width<=maxWidth)line=next;else{if(line)result.push(line);line=word;if(result.length===maxLines-1)break;}}if(line&&result.length<maxLines)result.push(line);return result;}
async function loadImage(url:string){if(!url)return null;return new Promise<HTMLImageElement|null>((resolve)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;});}

export async function renderPoster(generation:AIContentGeneration){
  const canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Poster rendering is unavailable.');
  const colors=generation.creative.colors?.length===3?generation.creative.colors:['#07140e','#0f7a49','#41cc8b'];const gradient=ctx.createLinearGradient(0,0,SIZE,SIZE);gradient.addColorStop(0,colors[0]);gradient.addColorStop(.58,colors[1]);gradient.addColorStop(1,colors[2]);ctx.fillStyle=gradient;ctx.fillRect(0,0,SIZE,SIZE);
  ctx.globalAlpha=.16;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(930,140,260,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.08;ctx.beginPath();ctx.arc(900,900,390,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  const data=generation.renderer,logo=await loadImage(data.logoUrl);ctx.fillStyle='rgba(0,0,0,.2)';roundRect(ctx,64,58,952,964,42);
  if(logo){ctx.save();ctx.beginPath();ctx.roundRect(98,94,126,126,30);ctx.clip();ctx.drawImage(logo,98,94,126,126);ctx.restore();}else{ctx.fillStyle='rgba(255,255,255,.16)';roundRect(ctx,98,94,126,126,30);ctx.fillStyle='#fff';ctx.font='700 52px Inter, sans-serif';ctx.textAlign='center';ctx.fillText(data.businessName.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase(),161,174);ctx.textAlign='left';}
  ctx.fillStyle='#fff';ctx.font='700 36px Inter, sans-serif';ctx.fillText(data.businessName,252,148);ctx.globalAlpha=.72;ctx.font='500 23px Inter, sans-serif';ctx.fillText(data.dateLabel,252,190);ctx.globalAlpha=1;
  ctx.font='800 92px Inter, sans-serif';const title=lines(ctx,data.headline.toUpperCase(),820,3);title.forEach((line,index)=>ctx.fillText(line,98,365+index*100));
  const titleBottom=365+(title.length-1)*100;ctx.fillStyle='rgba(255,255,255,.88)';ctx.font='500 37px Inter, sans-serif';lines(ctx,data.supportingText,800,3).forEach((line,index)=>ctx.fillText(line,98,titleBottom+82+index*50));
  const offer=data.offer?.trim();if(offer){ctx.fillStyle='#fff';roundRect(ctx,98,700,Math.min(820,ctx.measureText(offer).width+92),92,24);ctx.fillStyle=colors[0];ctx.font='800 34px Inter, sans-serif';ctx.fillText(offer.toUpperCase(),140,758);}
  ctx.fillStyle='rgba(255,255,255,.14)';roundRect(ctx,98,840,420,76,22);ctx.fillStyle='#fff';ctx.font='700 27px Inter, sans-serif';ctx.fillText(data.cta,132,888);
  const contact=[data.location,data.whatsapp||data.phone,data.website].filter(Boolean).join('  •  ');ctx.globalAlpha=.8;ctx.font='500 22px Inter, sans-serif';lines(ctx,contact||data.address,850,2).forEach((line,index)=>ctx.fillText(line,98,966+index*28));ctx.globalAlpha=1;
  ctx.textAlign='right';ctx.font='700 20px Inter, sans-serif';ctx.fillText('CREATED WITH FOUNDER.ENV',982,996);ctx.textAlign='left';return canvas;
}
export async function posterBlob(generation:AIContentGeneration){const canvas=await renderPoster(generation);return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Poster export failed.')),'image/png',1));}
export function posterFilename(generation:AIContentGeneration){const slug=generation.renderer.businessName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return `founderenv-${slug||'business'}-${generation.generationDate}.png`;}
