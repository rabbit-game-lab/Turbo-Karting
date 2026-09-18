import * as sdk from '../rabbit/sdk.ts'

const STORAGE_KEY='hareline-rally:best-times'
interface Payload { version:1; times:Record<string,number> }

export function parseBestTimes(raw:string|null):Record<string,number>{
  if(!raw)return{}
  try{
    const parsed=JSON.parse(raw) as Partial<Payload>
    if(parsed.version!==1||!parsed.times||typeof parsed.times!=='object'||Array.isArray(parsed.times))return{}
    const clean:Record<string,number>={}
    for(const [key,value] of Object.entries(parsed.times))if(/^[a-z0-9-]+:(easy|normal|hard)$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0&&value<86400)clean[key]=value
    return clean
  }catch{return{}}
}
export function loadBestTimes():Record<string,number>{return parseBestTimes(sdk.storage.get(STORAGE_KEY))}
export function saveBestTimes(times:Readonly<Record<string,number>>):void{const payload:Payload={version:1,times:{...times}};sdk.storage.set(STORAGE_KEY,JSON.stringify(payload))}
