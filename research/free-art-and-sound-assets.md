# Free art and sound assets

Research for [#4](https://github.com/danielbank/shenanyrinth/issues/4), part of map [#1](https://github.com/danielbank/shenanyrinth/issues/1).
Researched 2026-11-06.

**Question.** What freely licensed assets (CC0 preferred) exist for a 16-bit-style pixel-art RPG board game? We need:

- Town, Forest and Dungeon art, including path Tiles that show straights, bends, junctions and dead ends.
- Player characters and mobs.
- Item icons and UI: dice, frames and fonts.
- Sound effects: footsteps, sword hits, coins, Stairs, a "Lost" sting, dice rolls and UI clicks.

**Method.** Every licence below was read on the asset's own page: kenney.nl, OpenGameArt (OGA) or itch.io. For the Kenney and Tiny Creatures packs, I also downloaded the zip to a scratch folder, read the bundled `License.txt`, listed every file and looked at the tilemaps. Nothing was added to the repo. Anything I could not check at file level is marked **unverified**.

## Recommendation

Use the **Kenney "Tiny" family plus Kenney audio**. Every item is CC0 and none needs credit. The art shares one 16×16 grid, one palette and one style: thick dark outlines with flat, bright colours.

| Need | Pack | Licence |
|---|---|---|
| Town + Forest | Kenney **Tiny Town** | CC0 |
| Dungeon, heroes, weapons, potions | Kenney **Tiny Dungeon** | CC0 |
| Mobs | Clint Bellanger **Tiny Creatures** (made as an expansion of the Tiny packs) | CC0 |
| Frames, panels, buttons | Kenney **UI Pack – Pixel Adventure** | CC0 |
| Fonts | Kenney **Fonts** (Kenney Pixel / Kenney Mini) | CC0 |
| Footsteps, sword hits | Kenney **Impact Sounds**, Kenney **RPG Audio** | CC0 |
| Coins | Kenney **RPG Audio** (`handleCoins`) | CC0 |
| Dice | Kenney **Casino Audio** | CC0 |
| UI clicks | Kenney **Interface Sounds** | CC0 |
| "Lost" sting, Stairs jingle | Kenney **Music Jingles** (the 8-bit `NES` set) | CC0 |

**Gaps you'll need to fill yourselves (small):**

1. **Path Tile overlays.** No CC0 pack I found has one-square path pieces in the right style. A Tile needs 5 base shapes: dead end, straight, bend, T-junction and crossroads. Rotating them by 90° covers all 15 ways a square can connect. The plan:
   - Draw those 5 shapes as transparent 16×16 (or 48×48) overlays in the Tiny Town dirt colour for the Forest, and in Tiny Dungeon floor colours for the Dungeon.
   - Lay each one over the Level's ground tile.
   - Rotate with CSS `transform: rotate()`.

   That's about 10 small sprites in total. Simple shapes like these could also be drawn in pure CSS (a dirt-coloured square with arms).
2. **Dice faces.** The Tiny packs have no dice. Kenney *Board Game Icons* has d6 faces under CC0, but they are flat vector-style 64px silhouettes, not pixel art. Drawing a pixel d6 (6 faces of pips) in the Tiny palette, or in CSS, is trivial and will match better.

**Runner-up: all-in-one Ninja Adventure.** Pixel-Boy & AAA's *Ninja Adventure* is also CC0. Its look is closer to the SNES era and is visibly richer: shading, animated characters and face portraits. One pack covers tiles, characters, monsters, items, UI, 2 fonts and 100+ sound effects. The catches:

- The theme is ninja and East Asian, not Wizardry or Final Fantasy fantasy.
- I could not open the full zip, so its sound list and dungeon tiles are **unverified**.

If the team wants a richer look, take Ninja Adventure on its own. Don't mix it with the Tiny packs, because the outline weight and shading differ visibly.

**Avoid mixing in:**

- **Dungeon Crawl Stone Soup** tiles: 32×32 with detailed shading.
- **7Soul1's 496 icons**: 34×34 with soft shading.
- **0x72 DungeonTileset II**: a darker palette with thin outlines.

All three are CC0 and good, but each sits next to the Tiny packs as an obviously different style.

## Candidates by category

### 1. Tiles: Town, Forest, Dungeon

| Pack | Licence (source) | Style / resolution | Content relevant to us | Fits the Tiny set? |
|---|---|---|---|---|
| **Kenney Tiny Town** v1.1 | CC0. The page says "Creative Commons CC0", and the bundled License.txt says CC0 1.0 with crediting "not mandatory". [kenney.nl](https://kenney.nl/assets/tiny-town), [OGA](https://opengameart.org/content/tiny-town) | 16×16, 132 tiles (`tile_0000`–`0131`, sheet 192×176 = 12×11) | Grass with flowers; a 9-slice dirt patch (corners and edges); green and autumn trees, in singles and clusters; mushrooms; a cobblestone tile; houses with two roof colours; castle walls and gate; fences; signpost; well; tools, key, bow, arrow and chest. This covers the **Town** (houses, castle = Keeps and stores) and the **Forest** (dense tree clusters). | It is the base set. |
| **Kenney Tiny Dungeon** v1.0 | CC0 ([kenney.nl](https://kenney.nl/assets/tiny-dungeon), [OGA](https://opengameart.org/content/tiny-dungeon)) | 16×16, 132 tiles, same 12×11 sheet | Brown dungeon floor; stone walls; doors; a striped grey tile that could serve as **Stairs** (judged from the tilemap image, not confirmed by name); spikes; torches and banners; gargoyle fountains; barrels and crates; chests, including a mimic. Characters and items are covered below. | It was made as a twin of Tiny Town. |
| Kenney Tiny Battle | CC0 ([OGA](https://opengameart.org/content/tiny-battle)) | 16×16 | Grass, water, **one-tile-wide road pieces**, digits 0–9, a heart. Its theme is modern military. | Same style. Its road pieces are a good *reference* for drawing our path overlays, but they are asphalt roads and won't fit a fantasy Forest. |
| Kenney Roguelike/RPG pack | CC0 ([kenney.nl](https://kenney.nl/assets/roguelike-rpg-pack), [OGA](https://opengameart.org/content/roguelikerpg-pack-1700-tiles)) | 16×16, about 1,700 tiles | Large town, interior and terrain set. | It is an older Kenney style without the thick outlines, so it clashes with Tiny. |
| 0x72 DungeonTileset II | CC0 v1.0 ("Credit is not necessary"). Code is MIT. ([itch.io](https://0x72.itch.io/dungeontileset-ii)) | 16×16, some 16×32 walls, animated | Dungeon walls and floors, heroes, demons, undead, orcs. Has idle and run animations but no attack or death ones. | Different palette and outline. Dungeon only, so there's no Town or Forest. |
| Dungeon Crawl Stone Soup tiles (+ supplemental) | CC0 ("No attribution is required") ([OGA](https://opengameart.org/content/dungeon-crawl-32x32-tiles), [supplemental](https://opengameart.org/content/dungeon-crawl-32x32-tiles-supplemental)) | 32×32, 3/4 view, 6,000+ tiles by many artists | Huge: terrain, monsters, items, GUI, avatars. | It mixes many artists' styles and is at twice the resolution. A fallback for odd items or mobs only. |
| Ninja Adventure | CC0 ([itch.io](https://pixel-boy.itch.io/ninja-adventure-asset-pack)) | 16×16 (per the page tag and screenshots), SNES-style shading | Floor autotiling, exterior and interior elements. The screenshots show a village, a forest and a desert town. Dungeon or cave tiles are **unverified**. | Its own family; see the runner-up section. |

**About path Tiles.** Tiny Town's dirt is a 9-slice, so it makes rounded *patches*, not a one-tile-wide path. Tiny Dungeon has walls and floor but no corridor pieces. That's why the recommendation includes 5 custom overlay shapes. Tiny Battle's roads show how little art that takes.

### 2. Player characters and mobs

| Pack | Licence | Style / resolution | Content | Fit |
|---|---|---|---|---|
| **Kenney Tiny Dungeon** | CC0 | 16×16, one front-facing frame each | About 20 characters seen in the tilemap: wizard, knights (several helmets), a female hero, a bearded dwarf, a barbarian, a thief type, ghosts, a cyclops, a red-hooded figure, rats, a bat, a spider and skeletal creatures. They suit Quest-for-Glory-style classes (fighter, mage, thief). | Base set. |
| **Tiny Creatures** by Clint Bellanger v1.0 | CC0. The OGA page and bundled License.txt both say CC0 1.0, crediting "not mandatory". ([OGA](https://opengameart.org/content/tiny-creatures)) | 16×16, thick outlines, 180 sprites (sheet 160×288) | "Over 100 monsters! Over 50 animals!": slimes, goblins, orcs, skeletons, dragons, elementals, ghosts, wolves, bears, snakes, insects and fish. The page states it "is compatible with Kenney's Tiny Dungeon and Tiny Town sets". | It was made for the Tiny set. |
| Ninja Adventure | CC0 | 16×16 with walk animations and face portraits | 50+ characters, 30+ monsters, 9 bosses (per the page). | Richer, but a different family. |
| 0x72 DungeonTileset II | CC0 | 16×16 / 16×32, idle and run animations | Knights, wizards, elves, dwarfs, orcs, demons, undead. | Different family. |

The Tiny sprites have **no animation frames**. On a board game that's fine: Web Animations can do bobbing, hop-per-square, squash on hit and flash on damage.

### 3. Items, UI, dice, fonts

| Pack | Licence | Style / resolution | Content | Fit |
|---|---|---|---|---|
| **Kenney Tiny Dungeon** (items) | CC0 | 16×16 | Swords, daggers, axes, hammers, a spear, staves, shields, 8 potions (4 colours × 2 sizes), chests. | Base set. |
| **Kenney Tiny Town** (items) | CC0 | 16×16 | Pickaxe, shovel, axe, key, bow, arrow, bomb, coin, beehive, target, signpost. | Base set. |
| **Kenney UI Pack – Pixel Adventure** v2.0 | CC0. The page and bundled License.txt both say CC0 1.0. ([kenney.nl](https://kenney.nl/assets/ui-pack-pixel-adventure)) | Pixel art in 16×16 ("Small") and 32×32 ("Large") tiles, about 500 files | Wood, parchment and stone 9-slice frames; round and hex frames; ribbon banners; buttons; bars; checkboxes; arrows. | Close: brown, cream and slate tones with dark outlines. Good for item panels and the Turn menu. |
| Kenney Pixel UI Pack | CC0 ([OGA](https://opengameart.org/content/pixel-ui-pack-750-assets)) | Pixel, 750 assets | Bright flat buttons and arrows. | Fine, but more "mobile game" than RPG. Pixel Adventure fits better. |
| Kenney Fantasy UI Borders | CC0 ([OGA](https://opengameart.org/content/fantasy-ui-borders)) | Thin-line, high-resolution, not pixel art | Ornate dark borders. | Doesn't fit the 16-bit look. |
| **Kenney Fonts** | CC0 ([kenney.nl](https://kenney.nl/assets/kenney-fonts), [OGA](https://opengameart.org/content/kenney-fonts)) | TTF, 12 fonts | The bundled files are Kenney Pixel, Pixel Square, Mini, Mini Square, Mini Square Mono, High, High Square, Blocks, Future, Future Narrow, Rocket and Rocket Square. **Kenney Pixel** (body) and **Kenney Mini Square Mono** (numbers and stats) suit us. | Fits. Use `-webkit-font-smoothing: none` and integer scaling to keep them crisp. |
| Kenney Board Game Icons | CC0 ([kenney.nl](https://kenney.nl/assets/board-game-icons)) | Flat vector-style PNGs at 64 and 128px, plus SVG | `dice_1`–`dice_6`, d4–d20, dice with a skull, shield or sword, cards, arrows, a rotate arrow. | It is **not pixel art**. Usable for dice in a pinch, but it will look off next to the Tiny art. |
| Kenney Boardgame Pack v2 | CC0 ([OGA](https://opengameart.org/content/boardgame-pack)) | Vector-style PNGs | Red and white d6 faces 1–6 (with or without border), chips, pawns, cards. It also has `dieThrow1/2` and `dieShuffle1` sound files. | Not pixel art. |
| 7Soul1 "496 pixel art icons for medieval/fantasy RPG" | CC0 ([OGA](https://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg)). Icons copied from copyrighted games were removed for this CC0 release. | 34×34 (checked), soft shading | 496 icons: weapons, armour, potions, food, scrolls, gems. | Lovely, but a different resolution and shading. A good source if the item catalogue outgrows the Tiny items. |
| Ninja Adventure | CC0 | Pixel, 16-bit-style | 60+ items, UI elements, 2 fonts. | Its own family. |

### 4. Sound effects

All of these are Kenney, CC0, in `.ogg` format. I listed the file names from the downloaded zips.

| Need | Pack → files | Source |
|---|---|---|
| Footsteps | **Impact Sounds**: `footstep_grass_000–004` (Forest), `footstep_concrete_000–004` (Dungeon), `footstep_wood_*`, `footstep_carpet_*`, `footstep_snow_*`. **RPG Audio**: `footstep00–09`. | [Impact Sounds](https://kenney.nl/assets/impact-sounds) (130 files), [RPG Audio](https://kenney.nl/assets/rpg-audio) (50 files, [OGA mirror](https://opengameart.org/content/50-rpg-sound-effects)) |
| Sword hits | **Impact Sounds**: `impactMetal_light/medium/heavy_000–004`, `impactPlate_*` (armour). **RPG Audio**: `drawKnife1–3`, `knifeSlice`, `knifeSlice2`, `chop`. | as above |
| Coins | **RPG Audio**: `handleCoins`, `handleCoins2`. **Casino Audio**: `chips-stack-*` and `chip-lay-*` (good for a coin stack clinking). | [Casino Audio](https://kenney.nl/assets/casino-audio) ([OGA mirror](https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips)) |
| Dice rolls | **Casino Audio**: `dice-shake-1–3`, `dice-throw-1–3`, `die-throw-1–4`, `dice-grab-1–2` | as above |
| UI clicks | **Interface Sounds**: `click_001–005`, `select_*`, `confirmation_*`, `error_*`, `open_*`, `close_*`, `toggle_*`, `switch_*` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) ([OGA](https://opengameart.org/content/interface-sounds)). Kenney's UI SFX Set has 51 more clicks ([OGA](https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks)). |
| "Lost" sting | **Music Jingles**: 85 jingles in 5 instrument sets × 17 each (`HIT`, `NES`, `PIZZA`, `SAX`, `STEEL`). The **NES** set is the 8-bit match. Pick a falling or sad one by ear; the file names don't say which is which. | [Music Jingles](https://kenney.nl/assets/music-jingles) ([OGA mirror](https://opengameart.org/content/85-short-music-jingles)) |
| Stairs | No pack has an actual "stairs" sound. Options: a fast run of 3–4 `footstep_wood_*`/`footstep_concrete_*` with rising pitch, a rising `NES` jingle, or RPG Audio `doorOpen_*`/`creak*` for a trapdoor feel. | as above |

**Fit with the current tech default.** Map #1 says *"Sound: all generated in code, with no audio files"*, inherited from push-poker. These packs are small: the RPG Audio zip is under 1 MB and Interface Sounds about 0.8 MB, so shipping a dozen `.ogg` files costs little. Two other options remain:

- A mix: keep the code-generated sound for UI clicks and blips, and use recorded files for footsteps, metal, coins and dice, where synthesis sounds thin.
- Code-generated only: make every sound in code with an sfxr-style generator. I did not research these generators here.

That choice belongs to the "Sound and sprite approach" item on map #1.

## Licence notes

- **Kenney.** The support page says the assets are "public domain licensed (CC0)… You're free to use them, even in commercial projects", and "Attribution is not required". It also says not to use Kenney's logo ([kenney.nl/support](https://kenney.nl/support)). Each zip's `License.txt` links to CC0 1.0.
- **Tiny Creatures.** CC0 1.0. Crediting Clint Bellanger is optional.
- **Ninja Adventure.** "Released under the Creative Commons Zero (CC0) license… Attribution is not required but appreciated". The authors ask for a link to the itch.io page. The GitHub Godot demo repo (`pixel-boy/NinjaAdventure`) has **no** licence file. Take assets from the itch.io zip, not from the repo.
- **0x72, Dungeon Crawl Stone Soup, 7Soul1.** CC0 per their pages, quoted above.
- **Avoided.** I left out LPC (Liberated Pixel Cup) assets. They are CC-BY-SA / GPL with heavy per-file attribution, which goes against the CC0-first goal.
- **Courtesy credit.** Even though none is required, a one-line credits screen is good practice: "Art & sound: Kenney (kenney.nl), Clint Bellanger".

## Open questions for the spec

- Should Tiles be **48px** (3×3 cells of 16px art) or **16px scaled 3×**? This affects whether path overlays are 16 or 48 source pixels. Prototype it in the layout ticket.
- **Kenney Tiny or Ninja Adventure?** Worth a 5-minute visual check by the user. Tiny is verified and fantasy-themed. Ninja Adventure looks more like the SNES era, but its theme is off and its contents are partly unverified.
- Which `NES` jingle becomes the "Lost" sting and which the Stairs sting? Choose by listening.
