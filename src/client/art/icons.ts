/**
 * In-house 9×9 HUD glyphs, standing in for Kenney's 1-Bit Pack (CC0). One colour each (`x`);
 * the Glyph component adds the Tiny 1px #3F2631 outline, and the Badge puts it on a dark tile.
 */
export type IconName =
  | 'heart'
  | 'pivot'
  | 'sway'
  | 'resist'
  | 'doom'
  | 'deeds'
  | 'clash'
  | 'hand'
  | 'coin'
  | 'herb'
  | 'artifact'
  | 'dice'
  | 'pack'
  | 'slot'
  | 'trophy'
  | 'info'
  | 'close'
  | 'volume'
  | 'mute';

export const ICONS: Record<IconName, { rows: string[]; colour: string }> = {
  heart: {
    colour: '#e0533d',
    rows: [
      '.........',
      '.xx...xx.',
      'xxxx.xxxx',
      'xxxxxxxxx',
      'xxxxxxxxx',
      '.xxxxxxx.',
      '..xxxxx..',
      '...xxx...',
      '....x....',
    ],
  },
  pivot: {
    colour: '#ff9a3c',
    rows: [
      '...xxxx..',
      '..x....x.',
      '.x......x',
      '.x.......',
      '.x.....x.',
      '.x....xxx',
      '..x....x.',
      '...xxx...',
      '.........',
    ],
  },
  sway: {
    colour: '#e89ad8',
    rows: [
      '....x....',
      '...xxx...',
      '..x.x.x..',
      '....x....',
      '....x....',
      '....x....',
      '..x.x.x..',
      '...xxx...',
      '....x....',
    ],
  },
  resist: {
    colour: '#7ec8e3',
    rows: [
      'xxxxxxxxx',
      'x.......x',
      'x..xxx..x',
      'x..x.x..x',
      'x..xxx..x',
      '.x.....x.',
      '..x...x..',
      '...x.x...',
      '....x....',
    ],
  },
  doom: {
    colour: '#e8e2d0',
    rows: [
      '..xxxxx..',
      '.xxxxxxx.',
      'xxxxxxxxx',
      'xx..x..xx',
      'xx..x..xx',
      'xxxxxxxxx',
      '.xxx.xxx.',
      '..x.x.x..',
      '..xxxxx..',
    ],
  },
  deeds: {
    colour: '#f2c14e',
    rows: [
      '.xxxxxxx.',
      'x.......x',
      '.x.xxx.x.',
      '.x.....x.',
      '.x.xxx.x.',
      '.x.....x.',
      '.x.xx..x.',
      'x.......x',
      '.xxxxxxx.',
    ],
  },
  clash: {
    colour: '#c8cdd2',
    rows: [
      'x.......x',
      '.x.....x.',
      '..x...x..',
      '...x.x...',
      '....x....',
      '...x.x...',
      '.xx...xx.',
      '.xx...xx.',
      'x.......x',
    ],
  },
  hand: {
    colour: '#f2c49b',
    rows: [
      '..x.x.x..',
      '..x.x.x.x',
      '..x.x.x.x',
      'x.xxxxx.x',
      'x.xxxxxxx',
      'xxxxxxxxx',
      '.xxxxxxx.',
      '..xxxxx..',
      '..xxxxx..',
    ],
  },
  coin: {
    colour: '#f2c14e',
    rows: [
      '..xxxxx..',
      '.xxxxxxx.',
      'xxx...xxx',
      'xx.xxx.xx',
      'xx.xxx.xx',
      'xx.xxx.xx',
      'xxx...xxx',
      '.xxxxxxx.',
      '..xxxxx..',
    ],
  },
  herb: {
    colour: '#6fbf5a',
    rows: [
      '.....xx..',
      '...xxxx..',
      '..xxx.x..',
      '.xxx.xx..',
      '.xx.xx...',
      '.x.xx....',
      '..x......',
      '.x.......',
      'x........',
    ],
  },
  artifact: {
    colour: '#7ec8e3',
    rows: [
      '....x....',
      '...xxx...',
      '..xxxxx..',
      '.xxx.xxx.',
      'xxxxxxxxx',
      '.xxx.xxx.',
      '..xxxxx..',
      '...xxx...',
      '....x....',
    ],
  },
  dice: {
    colour: '#f4e9d8',
    rows: [
      'xxxxxxxxx',
      'x.......x',
      'x.x...x.x',
      'x.......x',
      'x...x...x',
      'x.......x',
      'x.x...x.x',
      'x.......x',
      'xxxxxxxxx',
    ],
  },
  pack: {
    colour: '#b98a55',
    rows: [
      '...xxx...',
      '..x...x..',
      '.xxxxxxx.',
      'xxxxxxxxx',
      'xxx...xxx',
      'xxxxxxxxx',
      'xxxxxxxxx',
      'xxxxxxxxx',
      '.xxxxxxx.',
    ],
  },
  slot: {
    colour: '#b9a78f',
    rows: [
      'xxxxxxxxx',
      'x.......x',
      'x.......x',
      'x.......x',
      'x.......x',
      'x.......x',
      'x.......x',
      'x.......x',
      'xxxxxxxxx',
    ],
  },
  trophy: {
    colour: '#f2c14e',
    rows: [
      'xxxxxxxxx',
      'xxxxxxxxx',
      '.xxxxxxx.',
      '.xxxxxxx.',
      '..xxxxx..',
      '...xxx...',
      '....x....',
      '...xxx...',
      '.xxxxxxx.',
    ],
  },
  info: {
    colour: '#7ec8e3',
    rows: [
      '..xxxxx..',
      '.xxx.xxx.',
      'xxxxxxxxx',
      'xxx..xxxx',
      'xxxx.xxxx',
      'xxxx.xxxx',
      'xxx...xxx',
      '.xxxxxxx.',
      '..xxxxx..',
    ],
  },
  close: {
    colour: '#e0533d',
    rows: [
      'xx.....xx',
      'xxx...xxx',
      '.xxx.xxx.',
      '..xxxxx..',
      '...xxx...',
      '..xxxxx..',
      '.xxx.xxx.',
      'xxx...xxx',
      'xx.....xx',
    ],
  },
  volume: {
    colour: '#f4e9d8',
    rows: [
      '....x....',
      '...xx..x.',
      'xxxxx...x',
      'xxxxx.x.x',
      'xxxxx.x.x',
      'xxxxx.x.x',
      'xxxxx...x',
      '...xx..x.',
      '....x....',
    ],
  },
  mute: {
    colour: '#f4e9d8',
    rows: [
      '....x....',
      '...xx....',
      'xxxxx....',
      'xxxxx.x.x',
      'xxxxx..x.',
      'xxxxx.x.x',
      'xxxxx....',
      '...xx....',
      '....x....',
    ],
  },
};
