/** In-house 12×12 stand-ins for the Kenney Tiny Creatures sheet, one silhouette per Mob. */
import type { Sprite } from './sprites.ts';

const o = '#3f2631';
const blob = (body: string, eye = '#fff2b0', extra: Record<string, string> = {}): Sprite => ({
  rows: [
    '............',
    '...oooooo...',
    '..obbbbbbo..',
    '.obbbbbbbbo.',
    '.obeebbeebo.',
    '.obekbbekbo.',
    '.obbbbbbbbo.',
    '.obbbttbbbo.',
    '..obbbbbbo..',
    '..obo..obo..',
    '..oo....oo..',
    '............',
  ],
  palette: { o, b: body, e: eye, k: o, t: '#e0533d', ...extra },
});

export const MOB_SPRITES: Record<string, Sprite> = {
  Goblin: blob('#6fae4a'),
  Myconid: blob('#c98a5a', '#fff', {}),
  Pixie: blob('#e89ad8', '#7ec8e3'),
  'Dire Wolf': blob('#7d7a86'),
  Bandit: blob('#8a5a3a'),
  Treant: blob('#4f6b2a', '#f2c14e'),
  Skeleton: blob('#e8e2d0', '#3f2631'),
  Wraith: blob('#7e6ab0', '#9fe8ff'),
  Gazer: blob('#b04a6a', '#fff'),
  'Cave Troll': blob('#5f7a6a'),
  Necromancer: blob('#3a2e4a', '#9cff6a'),
  'Red Wyrm': blob('#c0392b', '#f2c14e'),
};
