export const ARCHIVE_LIMIT=160*1024*1024,PART_LIMIT=112*1024*1024;
export async function archiveTask(op:'encode',data:Record<string,Uint8Array>):Promise<Uint8Array>;
export async function archiveTask(op:'decode',data:Uint8Array):Promise<Record<string,Uint8Array>>;
export async function archiveTask(op:'encode'|'decode',data:Record<string,Uint8Array>|Uint8Array):Promise<any>{
 if(typeof Worker==='undefined'){const api=await import('./archive');return op==='encode'?api.encodeEntries(data as Record<string,Uint8Array>):api.checkedEntries(data as Uint8Array);}
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./archive.worker.ts',import.meta.url),{type:'module'}),timer=setTimeout(()=>{worker.terminate();reject(new Error('Backup processing timed out. Originals unchanged.'));},120000);
 const finish=()=>{clearTimeout(timer);worker.terminate();};worker.onmessage=e=>{finish();if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.result);};worker.onerror=()=>{finish();reject(new Error('Backup worker failed. Originals unchanged.'));};worker.postMessage({op,data});});
}
