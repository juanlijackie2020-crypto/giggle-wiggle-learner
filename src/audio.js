// Bundled clips avoid relying on an installed speech-synthesis voice.
export function createAudio({notify,onStatus}) {
 let enabled=true,current=null,generation=0;
 function stop(){generation++;if(current){current.pause();current.currentTime=0;current=null;}onStatus?.('idle');}
 async function speak(text){
  if(!enabled)return;
  stop();const id=generation;
  const slug=text.toLowerCase().replace(/[!.,]/g,'').replace(/ /g,'-');
  const clip=new Audio(`${import.meta.env.BASE_URL}audio/${slug}.mp3`);
  current=clip;clip.preload='auto';onStatus?.('loading');
  clip.onplaying=()=>{if(id===generation)onStatus?.('playing');};
  clip.onended=()=>{if(id===generation){current=null;onStatus?.('idle');}};
  clip.onerror=()=>{if(id===generation){onStatus?.('error');notify('Audio could not load. Check your connection and tap Listen again.');}};
  try{await clip.play();}catch(error){
   if(id!==generation||error.name==='AbortError')return;
   onStatus?.('error');notify(error.name==='NotAllowedError'?'Tap Listen again to allow sound.':'Sound could not play. Tap Listen again to retry.');
  }
 }
 return {speak,stop,get enabled(){return enabled;},toggle(){enabled=!enabled;if(!enabled)stop();return enabled;}};
}
