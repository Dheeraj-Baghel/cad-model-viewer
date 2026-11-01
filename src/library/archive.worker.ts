import { checkedEntries,encodeEntries } from './archive';
self.onmessage=(event:MessageEvent<{op:'encode'|'decode';data:Record<string,Uint8Array>|Uint8Array}>)=>{
 try{const result=event.data.op==='encode'?encodeEntries(event.data.data as Record<string,Uint8Array>):checkedEntries(event.data.data as Uint8Array);self.postMessage({result});}catch(e){self.postMessage({error:e instanceof Error?e.message:'Invalid backup archive.'});}
};
