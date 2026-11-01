import type { LibraryRecord, SourceFile } from './types';
import { validateRecord } from './validation';
import { archiveTask,ARCHIVE_LIMIT,PART_LIMIT } from './archiveClient';
export { validateRecord } from './validation';

// Native Blob storage, content-addressed companions, atomic commits, no base64.
// Database v2 migrates old v1 records without destroying sources or legacy views.
export const DB_NAME = 'cadmium-library';
const DB_VERSION = 2;
export class StorageFailure extends Error { constructor(message: string) { super(message); this.name = 'StorageFailure'; } }
export async function sha256(blob: Blob): Promise<string> { return hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())); }
function hex(b: ArrayBuffer) { return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function fileReferences(files: File[]) {
  const refs: SourceFile[] = []; const blobs: Record<string, Blob> = {};
  for (const f of files) { const hash = await sha256(f); refs.push({ name: f.name, mime: f.type, lastModified: f.lastModified, hash, bytes: f.size }); blobs[hash] = f; }
  const sourceHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(refs.map(f => `${f.name}:${f.hash}`).sort().join('\n'))));
  return { refs, blobs, sourceHash };
}
const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error ?? new StorageFailure('Storage transaction was aborted.')); t.onerror = () => {}; });
export function migrateRecord(r: LibraryRecord): LibraryRecord {
  return { ...r, version: 1, orientation: r.orientation ?? 'auto', favorite: r.favorite ?? false, opened: r.opened ?? r.updated ?? 0, files: r.files ?? [], quality: r.quality ?? 'balanced', sourceUnits: r.sourceUnits ?? 'mm' };
}
export class LibraryRepository {
  quarantined=0;
  private db: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;
  async open() {
    if (this.db) return this.db;
    if (this.opening) return this.opening;
    if (!globalThis.indexedDB) throw new StorageFailure('On-device storage is unavailable. Temporary inspection still works.');
    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION); let blocked = false;
      request.onblocked = () => { blocked = true; reject(new StorageFailure('Storage upgrade is blocked by another tab. Close other CADmium tabs and retry.')); };
      request.onerror = () => reject(new StorageFailure(request.error?.message ?? 'On-device storage could not open.'));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) db.createObjectStore('models', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
        const store = request.transaction!.objectStore('models'); const cursor = store.openCursor();
        cursor.onsuccess = () => { const c = cursor.result; if (c) { if (c.value.version === 1 || !c.value.version) c.update(migrateRecord(c.value)); c.continue(); } };
      };
      request.onsuccess = () => { if (blocked) { request.result.close(); return; } this.db = request.result; this.db.onversionchange = () => { this.close(); if(typeof window!=='undefined')window.dispatchEvent(new Event('cadmium-library-change')); }; resolve(this.db); };
    }).finally(()=>{this.opening=null;});
    return this.opening;
  }
  close() { this.db?.close(); this.db = null; }
  async list() {
    const db = await this.open(); const records = await req(db.transaction('models').objectStore('models').getAll());
    this.quarantined=records.filter(r=>!validateRecord(r)).length;
    return records.filter(validateRecord) as LibraryRecord[];
  }
  async get(id: string) { const db = await this.open(); const r = await req(db.transaction('models').objectStore('models').get(id)); if (!r) throw new StorageFailure('This model is no longer in the on-device library.'); if (!validateRecord(r)) throw new StorageFailure('Saved model metadata is unreadable. It was not overwritten.'); return r as LibraryRecord; }
  async files(record: LibraryRecord) {
    const db = await this.open(); const output: File[] = [];
    for (const f of record.files) { const blob = await req(db.transaction('blobs').objectStore('blobs').get(f.hash)) as Blob | undefined; if (!(blob instanceof Blob)) throw new StorageFailure(`Saved source missing: ${f.name}. Import the original again; the saved record was kept.`); if (await sha256(blob) !== f.hash) throw new StorageFailure(`Saved source is corrupt: ${f.name}. The record was kept.`); output.push(new File([blob], f.name, { type: f.mime, lastModified: f.lastModified })); }
    return output;
  }
  async save(record: LibraryRecord, blobs: Record<string, Blob> = {}) {
    if (!validateRecord(record)) throw new StorageFailure('Invalid library record refused.');
    // Await validation/hashing BEFORE opening a transaction (no inactive tx awaits).
    for (const [hash, b] of Object.entries(blobs)) if (await sha256(b) !== hash) throw new StorageFailure('Original file hash mismatch. Nothing saved.');
    const db = await this.open(); const t = db.transaction(['models','blobs'], 'readwrite'); const finished = done(t);
    try { for (const [hash, b] of Object.entries(blobs)) t.objectStore('blobs').put(b, hash);
      const old=t.objectStore('models').get(record.id);old.onsuccess=()=>{
        if(old.result&&(!validateRecord(old.result)||old.result.sourceHash!==record.sourceHash)){t.abort();return;}
        let pending=record.files.length;
        if(!pending)t.objectStore('models').put(record);
        for(const f of record.files){const get=t.objectStore('blobs').get(f.hash);get.onsuccess=()=>{if(!(get.result instanceof Blob)){t.abort();return;}if(--pending===0)t.objectStore('models').put(record);};}
      };
    } catch (e) { t.abort(); await finished.catch(() => {}); throw e; }
    await finished; this.changed();
  }
  async update(id: string, patch: Partial<LibraryRecord>,expectedStateRevision?:number) {
    // Read and write in ONE transaction to avoid clobbering another tab's rename.
    const db = await this.open(); const t = db.transaction('models','readwrite'); const finished = done(t);
    let result:LibraryRecord|undefined,reason='Invalid merged library update.';
    const request = t.objectStore('models').get(id); request.onsuccess = () => {
      const old=request.result;if(!validateRecord(old)){t.abort();return;}
      if(patch.state&&expectedStateRevision!==undefined&&(old.stateRevision??0)!==expectedStateRevision){reason='Another tab saved a newer inspection. Your local session is kept; reopen the saved model before overwriting it.';t.abort();return;}
      result={...old,...patch,id,updated:Date.now(),stateRevision:patch.state?(old.stateRevision??0)+1:old.stateRevision};
      if(!validateRecord(result)){t.abort();return;}t.objectStore('models').put(result);
    };try{await finished;}catch{throw new StorageFailure(reason);}this.changed();return result!;
  }
  async remove(id: string) { const db = await this.open(); const t = db.transaction('models','readwrite'); const finished = done(t); t.objectStore('models').delete(id); await finished; this.changed(); }
  // Blobs intentionally retained through undo. Explicit cleanup removes only unreferenced
  // files, in the same transaction as reading all records (never deletes active sources).
  async cleanup() {
    const db = await this.open(); const t = db.transaction(['models','blobs'],'readwrite'); const finished = done(t); const r = t.objectStore('models').getAll();
    r.onsuccess = () => { if (r.result.some(x => !validateRecord(x))) { t.abort(); return; } const hashes = new Set((r.result as LibraryRecord[]).flatMap(x => x.files.map(f => f.hash))); const cursor = t.objectStore('blobs').openCursor(); cursor.onsuccess = () => { const c = cursor.result; if (c) { if (!hashes.has(String(c.key))) c.delete(); c.continue(); } }; }; await finished;
  }
  async usage() { const db = await this.open(); const all = await req(db.transaction('blobs').objectStore('blobs').getAll()) as Blob[]; return all.reduce((n,b) => n + (b?.size ?? 0),0); }
  async backup(ids?:string[]) {
    const records=(await this.list()).filter(r=>!ids||ids.includes(r.id));
    const size=records.reduce((n,r)=>n+r.totalBytes+(r.thumbnail?.size??0)+JSON.stringify({...r,thumbnail:undefined}).length*3,0);
    if(size>PART_LIMIT)throw new StorageFailure('Collection needs split backups. Use Backup parts; each part restores independently.');
    const db=await this.open(),t=db.transaction('blobs'),hashes=[...new Set(records.flatMap(r=>r.files.map(f=>f.hash)))];
    const blobs=await Promise.all(hashes.map(h=>req(t.objectStore('blobs').get(h)) as Promise<Blob|undefined>));
    const entries:Record<string,Uint8Array>={'manifest.json':new TextEncoder().encode(JSON.stringify({format:'cadmium-library',version:1,records:records.map(r=>({...r,thumbnail:undefined}))}))};
    for(let i=0;i<hashes.length;i++){const b=blobs[i];if(!(b instanceof Blob)||await sha256(b)!==hashes[i])throw new StorageFailure('Missing/corrupt source prevents a reliable backup. Originals unchanged.');entries[`blobs/${hashes[i]}`]=new Uint8Array(await b.arrayBuffer());}
    for(let i=0;i<records.length;i++)if(records[i].thumbnail)entries[`thumbnails/${i}.webp`]=new Uint8Array(await records[i].thumbnail!.arrayBuffer());
    return new Blob([await archiveTask('encode',entries) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
  }
  async backupParts(){const groups=planBackupParts(await this.list()),parts:{name:string;blob:Blob}[]=[];for(let i=0;i<groups.length;i++)parts.push({name:`cadmium-library-${i+1}-of-${groups.length}.zip`,blob:await this.backup(groups[i])});return parts;}
  async restore(zip: Blob) {
    if(zip.size>ARCHIVE_LIMIT)throw new StorageFailure('Backup exceeds 160 MB per part.');
    const data=await archiveTask('decode',new Uint8Array(await zip.arrayBuffer()));
    const manifest = JSON.parse(new TextDecoder().decode(data['manifest.json'])) as { format: string; version: number; records: LibraryRecord[] };
    if (manifest.format !== 'cadmium-library' || manifest.version !== 1 || !Array.isArray(manifest.records) || !manifest.records.every(validateRecord)) throw new StorageFailure('Unsupported/corrupt backup. Existing library untouched.');
    const blobs: Record<string, Blob> = {};
    for (const r of manifest.records) for (const f of r.files) { const b = data[`blobs/${f.hash}`]; if (!b || b.byteLength!==f.bytes) throw new StorageFailure(`Backup source missing: ${f.name}. Nothing restored.`);if(blobs[f.hash])continue; const blob = new Blob([b as Uint8Array<ArrayBuffer>], { type: f.mime }); if(await sha256(blob)!==f.hash) throw new StorageFailure('Backup source hash mismatch. Nothing restored.'); blobs[f.hash] = blob; }
    const existing = await this.list(); const records = manifest.records.map((r,i) => ({ ...r, ...(data[`thumbnails/${i}.webp`]?{thumbnail:new Blob([data[`thumbnails/${i}.webp`] as Uint8Array<ArrayBuffer>],{type:'image/webp'})}:{}), id: existing.some(e=>e.id===r.id&&e.sourceHash!==r.sourceHash)?crypto.randomUUID():r.id }));
    const db = await this.open(); const t = db.transaction(['models','blobs'],'readwrite'); const finished = done(t);
    for (const [h,b] of Object.entries(blobs)) t.objectStore('blobs').put(b,h); for(const r of records)t.objectStore('models').put(r); await finished; this.changed(); return records.length;
  }
  private changed() { if(typeof window!=='undefined'){window.dispatchEvent(new Event('cadmium-library-change'));try{const c=new BroadcastChannel('cadmium-library');c.postMessage('changed');c.close();}catch{}} }
}
export function planBackupParts(records:LibraryRecord[]){const groups:string[][]=[[]];let size=0;for(const r of records){const bytes=r.totalBytes+(r.thumbnail?.size??0)+new TextEncoder().encode(JSON.stringify({...r,thumbnail:undefined})).length+4096;if(bytes>PART_LIMIT)throw new StorageFailure('One model metadata exceeds the safe backup-part limit.');if(size+bytes>PART_LIMIT&&groups.at(-1)!.length){groups.push([]);size=0;}groups.at(-1)!.push(r.id);size+=bytes;}return groups;}
export const library = new LibraryRepository();
