/**
 * In-house 12×12 pixel sprites, drawn as text glyphs. They stand in for the Kenney "Tiny"
 * sheets (CC0), which drop into `public/art/` when available. Each character is a palette key;
 * `.` is transparent and `o` is the Tiny outline colour.
 */
import type { Hero } from '../../rules/index.ts';

export type Sprite = { rows: string[]; palette: Record<string, string> };

const OUTLINE = '#3f2631';
const SKIN = '#f2c49b';

/** `c` is replaced by the Player's colour. */
const heroBody = (hat: string[], hatPalette: Record<string, string>): Sprite => ({
  rows: [
    ...hat,
    '...oooooo...',
    '...osssso...',
    '...os.s.so..',
    '...osssso...',
    '..occcccco..',
    '.occcccccco.',
    '.osccccccso.',
    '..occcccco..',
    '..oo....oo..',
  ].slice(-12),
  palette: { o: OUTLINE, s: SKIN, ...hatPalette },
});

export const HERO_SPRITES: Record<Hero, Sprite> = {
  knight: heroBody(['...ommmmo...', '..ommmmmmo..', '..om.mm.mo..'], { m: '#9aa3ad' }),
  wizard: heroBody(['.....oo.....', '....ommo....', '...ommmmo...'], { m: '#5b4bc4' }),
  rogue: heroBody(['............', '...okkkko...', '..okkkkkko..'], { k: '#2e2a30' }),
  cleric: heroBody(['.....ww.....', '...owwwwo...', '..owwyywwo..'], {
    w: '#f4f1e8',
    y: '#e6c229',
  }),
  ranger: heroBody(['............', '..ogggggo...', '.ogggggggo..'], { g: '#4f7a3a' }),
  bard: heroBody(['......rr....', '...orrrro...', '..orrrrrro..'], { r: '#b0413e' }),
};

export const COLOUR_HEX: Record<string, string> = {
  red: '#d9534f',
  blue: '#4f8fd9',
  green: '#5cb85c',
  yellow: '#e6c229',
  purple: '#9b59b6',
  orange: '#e67e22',
};
