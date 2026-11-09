/** In-house 12×12 stand-ins for the Kenney Tiny Town sheet. */
import type { Building } from '../../rules/index.ts';
import type { Sprite } from './sprites.ts';

const o = '#3f2631';

const house = (roof: string, sign: string): Sprite => ({
  rows: [
    '....oooo....',
    '...orrrro...',
    '..orrrrrro..',
    '.orrrrrrrro.',
    'oooooooooooo',
    '.owwwwwwwwo.',
    '.owggwwggwo.',
    '.owggwwggwo.',
    '.owwwsswwwo.',
    '.owwwddwwwo.',
    '.owwwddwwwo.',
    '.oooooooooo.',
  ],
  palette: { o, r: roof, w: '#e8d5b0', g: '#7ec8e3', d: '#6b4226', s: sign },
});

export const BUILDING_SPRITES: Record<Building, Sprite> = {
  keepHall: {
    rows: [
      'o.o.o..o.o.o',
      'oooo....oooo',
      'osso.oo.osso',
      'osssoyyosss.',
      'osssssssssso',
      'ossgssssgsso',
      'ossgssssgsso',
      'ossssyysssso',
      'osssyyyyssso',
      'osssyddysssо',
      'osssyddyssso',
      'oooooooooooo',
    ].map((r) => r.replace('о', 'o')),
    palette: { o, s: '#a9a2ad', g: '#3b3540', y: '#f2c14e', d: '#6b4226' },
  },
  blacksmith: house('#7a4b3a', '#9aa3ad'),
  apothecary: house('#4f7a3a', '#e0533d'),
  arcanist: house('#5b4bc4', '#7ec8e3'),
  guild: house('#b0413e', '#f2c14e'),
};

export const GATE_SPRITE: Sprite = {
  rows: [
    'oooooooooooo',
    'osssoooossso',
    'osso....osso',
    'oso......oso',
    'oso.dddd.oso',
    'oso.d..d.oso',
    'oso.dddd.oso',
    'oso.d..d.oso',
    'oso.dddd.oso',
    'oso.d..d.oso',
    'oso.dddd.oso',
    'oooooooooooo',
  ],
  palette: { o, s: '#a9a2ad', d: '#6b4226' },
};

export const BUILDING_NAMES: Record<Building, string> = {
  keepHall: 'Keep Hall',
  blacksmith: 'Blacksmith',
  apothecary: 'Apothecary',
  arcanist: 'Arcanist',
  guild: "Adventurer's Guild",
};

export const STAIRS_DOWN_SPRITE: Sprite = {
  rows: [
    'oooooooooooo',
    'ossssssssso.',
    'oddddddddso.',
    'oddddddddso.',
    'okkkkkkkdso.',
    'okkkkkkkdso.',
    'okkkkkkkkdo.',
    'okkkkkkkkko.',
    'okkkkkkkkko.',
    'okkkkkkkkko.',
    'okkkkkkkkko.',
    'oooooooooooo',
  ],
  palette: { o, s: '#a9a2ad', d: '#6b5a4a', k: '#15121a' },
};

export const STAIRS_UP_SPRITE: Sprite = {
  rows: [
    '............',
    '........ooo.',
    '........oso.',
    '......ooosо.',
    '......ossso.',
    '....ooosssо.',
    '....osssssо.',
    '..ooosssssо.',
    '..ossssssso.',
    'oooossssssо.',
    'osssssssssо.',
    'oooooooooooo',
  ].map((r) => r.replaceAll('о', 'o')),
  palette: { o, s: '#a9a2ad' },
};
