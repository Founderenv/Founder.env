import { posterFilename } from '@/features/ai-content/posterRenderer';
import type { AIContentGeneration } from '@/services/aiContentService';

export type NativeShareResult='shared'|'cancelled'|'unsupported';

export function posterFile(generation:AIContentGeneration,blob:Blob){return new File([blob],posterFilename(generation),{type:'image/png'});}
export async function sharePosterFile(generation:AIContentGeneration,blob:Blob,nativeNavigator:Navigator=navigator):Promise<NativeShareResult>{
  const file=posterFile(generation,blob),share=nativeNavigator.share?.bind(nativeNavigator),canShare=nativeNavigator.canShare?.bind(nativeNavigator);
  if(!share||!canShare)return'unsupported';
  try{if(!canShare({files:[file]}))return'unsupported';await share({files:[file],title:generation.renderer.businessName,text:generation.caption});return'shared';}
  catch(error){if(error instanceof DOMException&&error.name==='AbortError')return'cancelled';throw error;}
}
export function downloadPosterBlob(generation:AIContentGeneration,blob:Blob){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=posterFilename(generation);anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
