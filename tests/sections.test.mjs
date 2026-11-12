import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const sections = read('../src/data/portal.json').sections;
const extras = read('../src/data/sections.json');

test('cada sección tiene destacados y nota', () => {
  for (const { id } of sections) {
    assert.ok(extras[id], `falta ${id} en sections.json`);
    assert.ok(extras[id].note.length > 0, `nota vacía en ${id}`);
    assert.ok(Array.isArray(extras[id].picks));
  }
});

test('los destacados apuntan a fichas existentes', () => {
  for (const [id, { picks }] of Object.entries(extras))
    for (const pick of picks)
      assert.ok(
        existsSync(new URL(`../src/content/${id}/${pick}.md`, import.meta.url)),
        `${id}/${pick}.md no existe`,
      );
});

test('las portadas existen en public/', () => {
  for (const { cover } of Object.values(extras))
    if (cover) assert.ok(existsSync(new URL(`../public/${cover}`, import.meta.url)), cover);
});
