// Explicit fragment routes. Story anchors are never interpreted as CAD routes.
export const STORY_CHAPTERS=['whole','inside','parts','detail','overview','explore'] as const;
export type Route={kind:'story';chapter:string}|{kind:'collection';tab:'explore'|'library'}|{kind:'viewer'}|{kind:'model';id:string}|{kind:'sample';id:string};
export function parseRoute(hash:string):Route {
  if(hash==='#viewer'||hash==='#viewer-heading')return{kind:'viewer'};
  if(hash==='#/explore'||hash==='#/library')return{kind:'collection',tab:hash==='#/library'?'library':'explore'};
  try{if(hash.startsWith('#/m/')&&hash.length>4)return{kind:'model',id:decodeURIComponent(hash.slice(4))};if(hash.startsWith('#/s/')&&hash.length>4)return{kind:'sample',id:decodeURIComponent(hash.slice(4))};}catch{/* malformed percent encoding: safe story fallback */}
  return{kind:'story',chapter:STORY_CHAPTERS.includes(hash.slice(1) as typeof STORY_CHAPTERS[number])?hash.slice(1):'whole'};
}
