/** @typedef {{name:string,description:string}} Place */
/** @typedef {{name:string,path:string,description:string}} Organization */
/** @typedef {{atmosphere:string,places:Place[],organizations:Organization[],organizationNote:string}} DistrictSummary */
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const plain = text => text.replace(/\*\*/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').trim();
/** @param {string} body @returns {DistrictSummary|null} */
export function districtSummary(body){
 const block=body.match(/^## Vista rápida\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
 if(!block)return null;
 const part=title=>block.match(new RegExp('^### '+title+'\\s*\\n([\\s\\S]*?)(?=^### |$(?![\\s\\S]))','m'))?.[1]?.trim()||'';
 const atmosphere=plain(part('Ambiente'));
 const places=part('Lugares de referencia').split('\n').map(line=>line.match(/^- \*\*([^*]+):\*\*\s*(.+)$/)).filter(Boolean).map(m=>({name:m[1],description:plain(m[2])}));
 const organizationText=part('Organizaciones relacionadas');
 const organizations=organizationText.split('\n').map(line=>line.match(/^- \[([^\]]+)\]\(\.\.\/\.\.\/((?:facciones|lore)\/[a-z0-9-]+)\/\)\s*—\s*(.+)$/)).filter(Boolean).map(m=>({name:m[1],path:m[2],description:plain(m[3])}));
 return {atmosphere,places,organizations,organizationNote:organizations.length?'':plain(organizationText)};
}
/** @param {{title:string,summary:DistrictSummary}} district @param {string} query @param {string} type */
export function matchesDistrict(district,query,type='todo'){
 const fields=[district.title];
 if(type==='todo'||type==='ambiente')fields.push(district.summary.atmosphere);
 if(type==='todo'||type==='lugares')fields.push(...district.summary.places.flatMap(p=>[p.name,p.description]));
 if(type==='todo'||type==='organizaciones')fields.push(...district.summary.organizations.flatMap(p=>[p.name,p.description]));
 const haystack=normalize(fields.join(' '));
 return normalize(query).split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));
}

/** @param {unknown} value */
export const serializeIndex = value => JSON.stringify(value).replaceAll('<', String.fromCharCode(92)+'u003c');
