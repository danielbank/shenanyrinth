/** In-house 12×12 stand-ins for tokens from the Kenney Tiny sheets. */
import type { Sprite } from './sprites.ts';

const o = '#3f2631';

export const COIN: Sprite = {
  rows: [
    '............',
    '....oooo....',
    '...oyyyyo...',
    '..oyywwyyo..',
    '..oywyyyyo..',
    '..oyyyyyyo..',
    '..oyyyyyyo..',
    '..oyyyyddo..',
    '...oyyddo...',
    '....oooo....',
    '............',
    '............',
  ],
  palette: { o, y: '#f2c14e', w: '#fff2b0', d: '#c8902c' },
};

export const HERB: Sprite = {
  rows: [
    '............',
    '.....oo.....',
    '....oggo....',
    '..oogllgoo..',
    '.ogglggglgo.',
    '.oglgggglgo.',
    '..oogggoo...',
    '....oso.....',
    '....oso.....',
    '...ossso....',
    '....ooo.....',
    '............',
  ],
  palette: { o, g: '#4f9a3a', l: '#8fd36f', s: '#7a5a3a' },
};

export const ARTIFACT: Sprite = {
  rows: [
    '............',
    '.....oo.....',
    '....obbo....',
    '...obwbbo...',
    '..obwbbbbo..',
    '..obbbbbbo..',
    '..obbbbbdo..',
    '...obbbdo...',
    '....obdo....',
    '.....oo.....',
    '............',
    '............',
  ],
  palette: { o, b: '#7ec8e3', w: '#e8fbff', d: '#3f8fb0' },
};

export const PILE: Sprite = {
  rows: [
    '............',
    '.....oo.....',
    '....obbo....',
    '...oobboo...',
    '..obbbbbbo..',
    '.obbbbbbbbo.',
    '.obbbybbbbo.',
    '.obbyyybbbo.',
    '.obbbybbbbo.',
    '..obbbbbbo..',
    '...oooooo...',
    '............',
  ],
  palette: { o, b: '#a0703a', y: '#f2c14e' },
};

export const CHEST: Sprite = {
  rows: [
    '............',
    '..oooooooo..',
    '.obbbbbbbbo.',
    '.obbbbbbbbo.',
    'oooooyyooooo',
    'obbbbyybbbbo',
    'obbbbbbbbbbo',
    'obbbbbbbbbbo',
    'obbbbbbbbbbo',
    'oooooooooooo',
    '............',
    '............',
  ],
  palette: { o, b: '#8a5a2a', y: '#f2c14e' },
};
