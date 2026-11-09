import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HEROES, MOBS } from '../rules/data.ts';
import { ALL_SPRITES, MOB_SPRITES, HERO_SPRITES, SHEETS } from './art/sheets.ts';

const dir = fileURLToPath(new URL('./public/art/', import.meta.url));

/** Width and height of a PNG, read from its header. */
function pngSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('committed art files', () => {
  it('has every sheet the game draws from', () => {
    for (const sheet of Object.values(SHEETS))
      expect(existsSync(`${dir}${sheet.file}`), sheet.file).toBe(true);
  });

  it('has every file the stylesheets point at', () => {
    const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');
    const used = [...css.matchAll(/url\('\/art\/([^']+)'\)/g)].map((m) => m[1]!);
    expect(used).toEqual(expect.arrayContaining(['kenpixel.ttf', 'frame.png']));
    for (const f of used) expect(existsSync(`${dir}${f}`), f).toBe(true);
  });

  it('points every sprite inside its sheet', () => {
    for (const [what, sprite] of ALL_SPRITES) {
      const sheet = SHEETS[sprite.sheet];
      const { w, h } = pngSize(`${dir}${sheet.file}`);
      expect(sprite.index, what).toBeGreaterThanOrEqual(0);
      expect(sprite.index, what).toBeLessThan((w / 16) * (h / 16));
    }
  });

  it('gives every Hero and every Mob, the Guardian included, a sprite', () => {
    for (const hero of HEROES) expect(HERO_SPRITES[hero], hero).toBeDefined();
    for (const name of Object.keys(MOBS)) expect(MOB_SPRITES[name], name).toBeDefined();
  });

  it('notes the source of every file, and keeps each pack licence', () => {
    const sources = readFileSync(`${dir}SOURCES.md`, 'utf8');
    const files = readdirSync(dir).filter((f) => f !== 'SOURCES.md' && f !== 'licences');
    for (const f of files) expect(sources, f).toContain(`\`${f}\``);
    expect(readdirSync(`${dir}licences`).sort()).toEqual(
      [
        'kenney-fonts.txt',
        '1-bit-pack.txt',
        'tiny-creatures.txt',
        'tiny-dungeon.txt',
        'tiny-town.txt',
        'ui-pack-pixel-adventure.txt',
      ].sort(),
    );
  });
});
