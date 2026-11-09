import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAG_SOUNDS, WORLD_SOUNDS } from './audio.ts';

const dir = fileURLToPath(new URL('./public/sounds/', import.meta.url));
const oggs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.ogg')) : [];

describe('committed sound files', () => {
  it('has a Kenney file for every world sound', () => {
    for (const name of WORLD_SOUNDS) expect(oggs, name).toContain(`${name}.ogg`);
  });

  it('has no file that no sound uses, and none for the generated gags', () => {
    const named = new Set<string>(WORLD_SOUNDS.map((n) => `${n}.ogg`));
    expect(oggs.filter((f) => !named.has(f))).toEqual([]);
    for (const gag of GAG_SOUNDS) expect(oggs).not.toContain(`${gag}.ogg`);
  });

  it('notes the source of every file, and keeps each pack licence', () => {
    const sources = readFileSync(`${dir}SOURCES.md`, 'utf8');
    for (const name of WORLD_SOUNDS) expect(sources, name).toMatch(`\`${name}.ogg\``);
    const licences = readdirSync(`${dir}licences`);
    expect(licences.sort()).toEqual([
      'casino-audio.txt',
      'interface-sounds.txt',
      'music-jingles.txt',
      'rpg-audio.txt',
    ]);
  });
});
