import { zipSync,unzipSync } from 'fflate';
export const ARCHIVE_LIMIT=160*1024*1024;
export const PART_LIMIT=112*1024*1024; // room for manifest, thumbnails and ZIP headers
const decoder=new TextDecoder('utf-8',{fatal:true});
// Validate the actual EOCD/central directory, not signature-like bytes in payloads.
// Archives are read in a worker. No encryption, ZIP64, symlinks or directory paths.
export function checkedEntries(bytes:Uint8Array){
 if(bytes.byteLength>ARCHIVE_LIMIT||bytes.length<22)throw new Error('Backup size is unsupported (160 MB maximum per part).');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(d.getUint32(i,true)===0x06054b50&&i+22+d.getUint16(i+20,true)===bytes.length){end=i;break;}
 if(end<0||d.getUint16(end+4,true)||d.getUint16(end+6,true))throw new Error('Invalid ZIP directory.');
 const count=d.getUint16(end+10,true),length=d.getUint32(end+12,true),start=d.getUint32(end+16,true);
 if(!count||count>4096||count!==d.getUint16(end+8,true)||start+length!==end)throw new Error('Invalid/excessive ZIP directory.');
 const names=new Set<string>(),ranges:{start:number;end:number}[]=[];let at=start,total=0;
 for(let n=0;n<count;n++){
  if(at+46>end||d.getUint32(at,true)!==0x02014b50)throw new Error('Invalid ZIP entry.');
  const flags=d.getUint16(at+8,true),method=d.getUint16(at+10,true),packed=d.getUint32(at+20,true),size=d.getUint32(at+24,true),nl=d.getUint16(at+28,true),extra=d.getUint16(at+30,true),comment=d.getUint16(at+32,true),local=d.getUint32(at+42,true);
  if(at+46+nl+extra+comment>end||flags&1||![0,8].includes(method)||[packed,size,local].includes(0xffffffff)||d.getUint16(at+34,true))throw new Error('Unsupported ZIP encoding.');
  const name=decoder.decode(bytes.subarray(at+46,at+46+nl));
  if(!/^(manifest\.json|blobs\/[a-f0-9]{64}|thumbnails\/\d+\.webp)$/.test(name)||names.has(name))throw new Error('Unsupported or duplicate backup entry.');names.add(name);
  total+=size;if(total>ARCHIVE_LIMIT||name==='manifest.json'&&size>8*1024*1024||name.startsWith('thumbnails/')&&size>4*1024*1024)throw new Error('Expanded backup exceeds limits.');
  if(local+30>start||d.getUint32(local,true)!==0x04034b50||d.getUint16(local+8,true)!==method||d.getUint16(local+6,true)!==flags)throw new Error('Invalid ZIP local header.');
  const lnl=d.getUint16(local+26,true),lextra=d.getUint16(local+28,true),body=local+30+lnl+lextra;
  if(body+packed>start||decoder.decode(bytes.subarray(local+30,local+30+lnl))!==name||method===0&&packed!==size)throw new Error('Invalid ZIP data bounds.');
  if(ranges.some(r=>local<r.end&&body+packed>r.start))throw new Error('Overlapping ZIP entries.');ranges.push({start:local,end:body+packed});at+=46+nl+extra+comment;
 }
 if(at!==end||!names.has('manifest.json'))throw new Error('Invalid backup directory length.');
 const result=unzipSync(bytes);if(Object.keys(result).length!==count)throw new Error('ZIP entry mismatch.');return result;
}
export function encodeEntries(data:Record<string,Uint8Array>){const out=zipSync(data,{level:0});if(out.length>ARCHIVE_LIMIT)throw new Error('Backup part exceeds restore limit.');return out;}
