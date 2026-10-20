import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {districtSummary,matchesDistrict,serializeIndex} from '../src/lib/explorer.mjs';
const ids=['watson','westbrook','city-center','heywood','santo-domingo','pacifica','badlands'];
const district=id=>({id,title:id,summary:districtSummary(fs.readFileSync(new URL('../src/content/lore/'+id+'.md',import.meta.url),'utf8'))});
test('las siete zonas tienen ambiente y lugares; las referencias internas existen',()=>{for(const id of ids){const d=district(id);assert.ok(d.summary?.atmosphere);assert.ok(d.summary.places.length);for(const o of d.summary.organizations)assert.ok(fs.existsSync(new URL('../src/content/'+o.path+'.md',import.meta.url)),o.path);}});
test('la búsqueda ignora mayúsculas y acentos',()=>{assert.ok(matchesDistrict(district('badlands'),'NOMADAS','organizaciones'));assert.ok(matchesDistrict(district('santo-domingo'),'capitan','lugares'));});
test('los filtros no mezclan lugares y organizaciones',()=>{assert.ok(matchesDistrict(district('watson'),'maelstrom','organizaciones'));assert.equal(matchesDistrict(district('watson'),'maelstrom','lugares'),false);assert.ok(matchesDistrict(district('watson'),'kabuki','lugares'));});
test('varios términos deben coincidir y se toleran espacios vacíos',()=>{assert.ok(matchesDistrict(district('watson'),'  little   china  '));assert.equal(matchesDistrict(district('watson'),'little inexistente'),false);});
test('no se inventan organizaciones cuando no están documentadas en el resumen',()=>{assert.deepEqual(district('westbrook').summary.organizations,[]);assert.equal(districtSummary('## Otra sección\nSin vista rápida.'),null);});

test('el índice conserva el texto e impide cerrar su bloque JSON',()=>{const original={text:'</script><script>prueba</script>'};const encoded=serializeIndex(original);assert.equal(encoded.includes('</script>'),false);assert.deepEqual(JSON.parse(encoded),original);});
