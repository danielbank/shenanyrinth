# Shenanyrinth

A 2–6 player, turn-based RPG board game played in the browser, where Players ride path tiles through a three-Level labyrinth (Town, Forest, Dungeon) and race for points or an endgame feat.

## Players and turns

**Player**:
One of the 2–6 people in a game, each controlling a single piece on the board.
_Avoid_: User, character (when meaning the person)

**Host**:
The Player holding the in-game role that starts the game and manages settings; the role can pass to another Player.
_Avoid_: Admin, server owner

**Turn**:
One Player's go: rolling, moving, and acting, before play passes to the next Player.
_Avoid_: Round (unless meaning every Player taking one Turn), move

**Round**:
Every Player taking one Turn, in join order; the Doom Track advances at the end of each Round.

**Response window**:
A short pause after the dice are rolled in any Clash or Shakedown, when eligible Players may Meddle, Sway, or Resist, closing when all pass or after 8 seconds.
_Avoid_: Reaction phase, interrupt

**Errands**:
The step after moving in the Town when a Player uses, in any order, every building they passed that Turn (Deposit, buy, Train).
_Avoid_: Shopping phase

## Movement

**Heading**:
The direction a Player's piece is travelling, which carries over from one Turn to the next.
_Avoid_: Facing, direction (when meaning the persistent one)

**Pivot**:
Leaving a Tile in a direction other than the Player's Heading, whether forced or chosen; each Pivot spends one from the Player's Pivot Limit.
_Avoid_: Turn, rotation, rotate

**Pivot Limit**:
The number of Pivots a Player may make during one Turn; it resets at the start of each of their Turns.
_Avoid_: Rotations, turn budget

**Lost**:
The state of having to Pivot with no Pivots left, which ends the Turn and sends the Player back to their Keep, dropping half the Gold and Materials in their Pack where they fell.
_Avoid_: Reset, fall back

## The board

**Level**:
One of the three floors of the labyrinth: the Town, the Forest, or the Dungeon.
_Avoid_: Floor, stage, map

**Town**:
Level 1: a walled 5×5 open grid with no Pivot Limit, home to the Keep Hall and the stores.

**Forest**:
Level 2: built from path tiles with many straights, so Pivots are spent slowly.

**Dungeon**:
Level 3: built from path tiles with few straights; holds the best resources and the endgame trigger.

**Gate**:
A Feature in the Town's wall connecting the Town to the Forest; there are four, each with its other end on a different edge of the Forest.
_Avoid_: Stairs (for the Town–Forest link), exit, door

**Stairs**:
The single Feature connecting the Forest to the Dungeon.
_Avoid_: Ladder, portal, Gate

**Tile**:
One square of path in the Forest or Dungeon, defined by its set of exits: the directions a Player may leave it in. Shapes are Straight, Bend, T-junction, and Crossroads.
_Avoid_: Cell, space (when meaning a path piece)

**Exit**:
One of the directions a Tile lets a Player leave it in; any square can be entered, but only exits can be left through.
_Avoid_: Opening, connection, door

**Tile Mix**:
A Level's weighting of Tile shapes, used to randomly generate its board each game; it sets how hard the Level is.
_Avoid_: Tile Pile, deck, bag

**Torchlight**:
The area around each Player's piece (3×3, widened by WIS) within which hidden Tiles and their contents are revealed for everyone, permanently.
_Avoid_: Vision, line of sight

**Feature**:
A fixed thing that belongs to a square rather than its Tile, such as Stairs or the Guardian's square; it stays put when Tiles are swapped.
_Avoid_: Landmark, special tile

**Keep**:
A Player's personal vault in the Keep Hall, where Gold is Deposited as locked-in points; arriving there restores full HP.
_Avoid_: House, home, base

**Keep Hall**:
The single building at the centre of the Town holding every Player's Keep.
_Avoid_: Bank, vault (as the building)

## Stats

**Stat**:
One of a Player's six numbers (STR, DEX, INT, WIS, CON, CHA). Its base (0–5) comes from setup points and Training; Gear adds on top.
_Avoid_: Attribute, ability score, level

**Foresight**:
WIS's widening of a Player's Torchlight: 3×3 at WIS 0–2, 5×5 at 3–4, 7×7 at 5.
_Avoid_: Vision, perception

**Ram**:
STR's perk: stopping on a Player's square while passing through it with steps left, to start a Shakedown; only works if the rammer's STR exceeds the target's CON.
_Avoid_: Charge, tackle

**Resist**:
Points equal to a Player's CON, refreshed at the start of their Turn; spending one cancels one Meddle or Sway aimed at their dice.
_Avoid_: Block, shield

**Haggle**:
CHA's perk: each purchase costs 1 less Gold per 2 CHA, to a minimum of 1.
_Avoid_: Discount, bargain

**Cache**:
A rich resource token with a rating of 2–5, invisible to and claimable only by Players whose INT is at least its rating.
_Avoid_: Secret stash, hidden treasure

## Economy

**Material**:
A resource worth no points that is spent, together with Gold, to buy items; either Herbs or Artifacts.
_Avoid_: Raw resource, ingredient, loot

**Herbs**:
The Material found in the Forest.

**Artifact**:
The Material found in the Dungeon.
_Avoid_: Crystal, relic

**Deposit**:
Moving Gold from a Pack into the Player's Keep; it is one-way, so Deposited Gold can never be spent.
_Avoid_: Bank, store (as a verb), stash

**Blacksmith**:
The Town store selling and upgrading Gear, paid for with Gold and Artifacts.

**Apothecary**:
The Town store selling healing, potions, and movement consumables, paid for with Gold and Herbs.

**Arcanist**:
The Town store selling Charms, paid for with Gold and either Material.

**Adventurer's Guild**:
The Town building selling Training.
_Avoid_: Trainer, dojo

## Items

**Training**:
A permanent +1 to a stat's base, bought at the Adventurer's Guild, at most once per stat per game; never carried and never Loot.
_Avoid_: Level up, stat boost

**Gear**:
A carried item that raises one stat, in one of six lines (one per stat) of three tiers, upgraded at the Blacksmith by trade-in; a few special pieces have other passive effects.
_Avoid_: Equipment, armour (as a category)

**Potion**:
A single-use carried item from the Apothecary, including scrolls.
_Avoid_: Consumable, scroll (as a category)

**Charm**:
A carried item from the Arcanist with 3 Charges, which crumbles when empty.
_Avoid_: Spell, wand

**Charge**:
One use of a Charm.

**Slot**:
One of the 5 carrying spaces each Player has, shared by Gear, Potions, and Charms.
_Avoid_: Inventory space, bag space

**Trinket**:
A silly, unique, permanent item found only as Loot, worth 1 point, never at risk, and taking no Slot.
_Avoid_: Gimmick, joke item, cosmetic

**Loot**:
What a defeated Mob, a Cache, or a Guardian Wound may yield, drawn from a weighted table of Materials, Potions, Charms, Trinkets, and tier-1 Gear.
_Avoid_: Drop, reward

## Interaction

**Shakedown**:
A one-Exchange duel a Player may start by ending their movement on another Player's square in the Forest or Dungeon; the winner takes up to 3 Gold or 1 Material from the loser's Pack.
_Avoid_: Mugging, PvP fight, robbery

**Meddle**:
Using a dice item on dice in play during anyone's Clash or Shakedown, before the result is final.
_Avoid_: Interfere, intervene

**Sway**:
Points equal to a Player's CHA, refreshed at the start of their Turn; spending one nudges any visible die in play by ±1.
_Avoid_: Pip, influence, charm

**Safe zone**:
The Town and every Gate and Stairs square, where Shakedowns can't happen.

## Combat

**Mob**:
A hostile creature occupying a square in the Forest or Dungeon; stepping onto its square starts a Clash.
_Avoid_: Monster, enemy, creature

**Ambush**:
A Mob ending a Player's movement the moment they step onto its square, forfeiting the rest of their roll and starting a Clash.

**Clash**:
A fight between a Player and a Mob, made of one or more Exchanges, ending when the Mob dies, the Player Retreats, or the Player is Knocked Out.
_Avoid_: Battle, combat round, encounter

**Exchange**:
One step of a Clash: choose an Approach, both sides roll face-up, anyone may Meddle with dice items, and the higher total lands a hit.
_Avoid_: Round, attack

**Approach**:
How a Player tackles a Mob in an Exchange (Fight, Magic, or Trickery), which sets the Player's stat bonus and the Mob's die.
_Avoid_: Stance, tactic

**Wound**:
A hit landed on a Mob; Wounds persist after a Clash ends, and a Mob dies when it has taken all its Wounds.
_Avoid_: Damage (when meaning hits on a Mob), HP (for Mobs)

**Press**:
Choosing to fight another Exchange.

**Retreat**:
Choosing to end a Clash without killing the Mob; the Player stays on its square and the Mob keeps its Wounds.
_Avoid_: Flee, run

**Knocked Out**:
Reaching 0 HP; it has exactly the same effect as being Lost.
_Avoid_: Dead, killed, fainted

## Winning

**Gold**:
The single currency that is both spent at stores and counted as points.
_Avoid_: Coins, money, points (as a separate thing)

**Pack**:
What a Player is carrying: Gold not yet Deposited, plus all their Materials; it is at risk when Lost, and its Gold scores only half at game end.
_Avoid_: Haul, inventory, satchel

**Guardian**:
The boss on the Dungeon's special square; defeating it is the feat that triggers the endgame.
_Avoid_: Boss, final boss

**Doom Track**:
The shared, visible round counter that ends the game if nobody defeats the Guardian first.
_Avoid_: Timer, clock

**Trophy**:
A point-scoring token earned by defeating a mob, worth more the tougher the mob; it scores immediately and is never at risk.
_Avoid_: Kill, bounty

**Deed**:
A public, first-come goal revealed at the start of a game that scores points for the first Player to achieve it.
_Avoid_: Achievement, quest, objective
