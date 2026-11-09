import type { Colour, Hero } from '../../rules/index.ts';
import { COLOUR_HEX, HERO_SPRITES } from '../art/sprites.ts';
import { PixelArt } from './PixelArt.tsx';

export function HeroSprite({ hero, colour, size }: { hero: Hero; colour: Colour; size?: string }) {
  return (
    <PixelArt
      sprite={HERO_SPRITES[hero]}
      fill={{ c: COLOUR_HEX[colour] ?? '#888' }}
      size={size}
      label={`${colour} ${hero}`}
    />
  );
}
