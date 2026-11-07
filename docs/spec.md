# Shenanyrinth v1 spec

This spec is put together from the design map [Shenanyrinth: v1 game design spec](https://github.com/danielbank/shenanyrinth/issues/1) and its closed tickets. Each ticket's resolution comment holds the reasoning and evidence; this document holds the result. Vocabulary follows `GLOSSARY.md`. Technical direction follows ADR 0001 (React + TypeScript client).

## Problem Statement

A group of 2–6 friends want a light, funny RPG board game they can play together in the browser in one sitting, on whatever they have: phones on the couch, laptops at a table. Ideally it takes no installs, no accounts and no cloud service. Existing browser board games are either solitaire-ish, heavy, or full of time pressure. They want something:

- **Relaxed:** turn-based, with no clocks on Turns.
- **Lucky but not random:** dice matter a lot, but there are good and bad moves.
- **Mostly co-operative against the game:** Players fight the labyrinth and its Mobs, with only light jabs at each other.
- **Forgiving:** a mistake is mild to annoying, never fatal and never tedious.
- **Short:** a game lasts 20–40 minutes.
- **Nice to look at and hear:** pleasing pixel art and sound effects, but no background music.

## Solution

**Shenanyrinth** is a 2–6 Player, turn-based RPG board game played in the browser. One Player hosts it on their laptop and shares it through an ngrok link. The game state lives on that server and is saved after every change, and each Player reconnects to their seat automatically.

Players ride path Tiles through a three-Level labyrinth:
- **The Town**: a safe, open 5×5 walled grid with every Player's Keep and the stores.
- **The Forest**: a 9×9 board of path Tiles with many straights.
- **The Dungeon**: a dark 7×7 board of mostly bends, with the best resources and the Guardian.

Movement works like a conveyor belt. You roll and must move the full roll, following each Tile's Exits. Leaving a Tile off your Heading costs a Pivot, and running out of Pivots makes you Lost: you're sent home to your Keep, dropping half your Pack.

Along the way Players do these things:
- **Collect** Gold, Herbs, Artifacts and Caches.
- **Fight Mobs** in quick Clashes made of Exchanges.
- **Shop** at four Town buildings, for Gear, Potions, Charms and Training.
- **Deposit** Gold in their Keep as locked-in points.
- **Jab at each other** through Shakedowns, Rams, Meddle and Sway.
- **Race for public Deeds.**

Slaying the Dungeon's Guardian, the Red Wyrm, triggers the end. Otherwise the Doom Track ends the game. Points decide the winner.

## User Stories

### Joining and hosting

1. As a Host, I want to start a game server on my laptop with one command, so that my friends can join without installing anything.
2. As a Host, I want to share the game through one ngrok link, so that Players on other networks can join.
3. As a Player, I want to join by opening a link and entering a name, so that I'm playing in seconds.
4. As a Player, I want to pick a Tiny Dungeon hero sprite and a colour when I join, so that everyone can tell my piece, my Keep and my Meddles apart.
5. As a Player, I want my seat tied to a token stored in my browser, so that I return to my seat if my phone sleeps or my tab reloads.
6. As a Host, I want to be able to pass the Host role to another Player, so that the game survives me leaving.
7. As a Host, I want the game saved to disk after every change, so that a server restart doesn't lose the game.
8. As a Player, I want any Player to be able to skip an offline Player's Turn, so that one absent friend doesn't stall the table.
9. As a Player, I want to assign 6 points across my six Stats at setup, with no more than 3 in any one, so that I can choose a build without classes.

### Turns and Rounds

10. As a Player, I want Turns to go around in join order from a random first Player, so that the order is fair and predictable.
11. As a Player, I want my Turn to follow clear phases (Start, Prepare, Roll and move, After moving, End), so that I always know what I can do next.
12. As a Player, I want my Pivots, Sway and Resist refreshed at the start of my Turn, so that I start every Turn with a known budget.
13. As a Player, I want no Turn timer, so that the game stays relaxed.
14. As a Player, I want to slap whoever's Turn it is when they dawdle, so that there's a playful nudge instead of a clock.
15. As a Player, I want to see the Round and the Doom Track at all times, so that I can plan around the end of the game.
16. As a Player, I want my menu limited to about 8 kinds of action, so that every Turn is quick to read.

### Movement

17. As a Player, I want to roll 1d6 and move the full roll along the path, so that the dice drive the adventure.
18. As a Player, I want to see which Exits are free and which cost a Pivot, outlined on the board, so that I can plan my route.
19. As a Player, I want to choose at junctions step by step, using buttons right above my piece, so that I stay in control without mis-taps.
20. As a Player, I want my Heading to carry over between Turns, so that momentum is part of the strategy.
21. As a Player, I want a Pivot Limit of 2 per Turn that resets every Turn, so that turning is a resource to manage.
22. As a Player, I want to be warned by the rules, not surprised, when I'd be Lost, so that being Lost feels fair.
23. As a Player with DEX, I want one optional extra square after my roll, so that I can stop exactly where I need to.
24. As a Player, I want to choose whether to take a Gate or the Stairs when my path crosses them, so that I decide when to change Level.
25. As a Player arriving on a new Level, I want to choose my Heading freely, so that I can set off in a useful direction.
26. As a Player in the Town, I want to move up to my roll in any direction with no Pivot Limit, so that errands are quick.
27. As a Player, I want to share or pass through other Players' squares freely, so that pieces never block each other.

### The board and exploration

28. As a Player, I want the Forest and Dungeon boards generated randomly each game from their Tile Mixes, so that every game is different.
29. As a Player, I want no Exit to ever point off the board, so that the board edge never traps me.
30. As a Player, I want the Forest's paths visible but its contents hidden, so that I can plan routes but still discover things.
31. As a Player, I want the Dungeon fully dark until revealed, so that going deep feels dangerous.
32. As a Player, I want my Torchlight to reveal the squares around me for everyone, permanently, so that exploring helps the whole table.
33. As a Player with WIS, I want a wider Torchlight, so that WIS is worth points.
34. As a Player, I want to tap any square, avatar, chip, item or Trinket to see what it is, so that I can learn the game from the board.
35. As a Player, I want a tap on information never to trigger an action, so that phones are safe from accidental moves.

### Being Lost and Knocked Out

36. As a Player who is Lost, I want my Turn to end and to be sent to my own Keep, so that the penalty is the walk back.
37. As a Player who is Lost, I want to drop only half my Pack's Gold and Materials, keeping the larger half, so that the penalty is mild but real.
38. As a Player, I want to pick up any dropped pile I pass over, mine or anyone's, so that scavenging is a light jab.
39. As a Player who is Lost or Knocked Out, I want to keep my items, Stats, Trophies and Deeds, so that a mistake is never fatal.
40. As a Player, I want arriving at my Keep to restore my HP in full, so that going home is how I heal.

### Mobs and Clashes

41. As a Player, I want Mobs hidden until Torchlight reveals them, so that exploration has risk.
42. As a Player, I want stepping onto a Mob to end my movement and start a Clash (an Ambush), so that Mobs act as brakes and threats.
43. As a Player, I want to choose an Approach (Fight, Magic or Trickery) each Exchange, so that reading the Mob's weak Approach is a skill.
44. As a Player, I want both sides' dice face-up, so that everyone can follow and react.
45. As a Player, I want to Press or Retreat after each Exchange, so that I decide how much risk to take.
46. As a Player, I want Wounds to stick on a Mob after a Clash, so that I or someone else can finish it later.
47. As a Player, I want to resume a Clash or walk away when my Turn starts on a Mob, so that a Retreat isn't a trap.
48. As a Player, I want a kill to pay a Trophy and Gold, and sometimes Loot, so that fighting is worth it.
49. As a Player, I want killed Mobs to respawn elsewhere on their Level, so that the board stays alive.
50. As a Player at 0 HP, I want being Knocked Out to work exactly like being Lost, so that there's one penalty to learn.
51. As a Player, I want Forest Mobs to be beatable but not free, and Dungeon Mobs to be dangerous, so that going deeper is a real choice.

### The Guardian and the end of the game

52. As a Player, I want the Red Wyrm on the Dungeon square farthest from the Stairs, so that reaching it is an expedition.
53. As a Player with WIS, I want to add WIS against the Guardian, so that a WIS build has a path to the feat.
54. As a Player, I want each Wound I land on the Guardian to give me Trophies and Loot, so that chipping at it pays even if someone else finishes it.
55. As the Player who lands the Guardian's final Wound, I want the Guardian bonus and the end of the game triggered, so that the feat feels like victory.
56. As a Player, I want play to finish the current Round after the end is triggered, so that everyone has had the same number of Turns.
57. As a Player, I want the Doom Track to end the game if nobody slays the Guardian, so that games stay within 20–40 minutes.

### Economy, the Town and items

58. As a Player, I want to pick up Gold, Herbs, Artifacts and piles from every square I pass over, so that routes matter, not just where I stop.
59. As a Player with INT, I want to see and claim Caches whose rating my INT meets, so that INT has a treasure-hunting payoff.
60. As a Player, I want to Deposit Gold in my Keep as locked-in points that can't be spent or stolen, so that banking is a real choice against shopping.
61. As a Player, I want to use every building I pass during my Town move, in any order, so that a Town trip is one quick Turn.
62. As a Player, I want the Blacksmith to sell and upgrade Gear in six Stat lines, so that I can grow my build.
63. As a Player, I want the Apothecary to sell Potions for healing and movement, so that I can recover and get out of trouble.
64. As a Player, I want the Arcanist to sell Charms with 3 Charges, so that I can Meddle with dice and the board.
65. As a Player, I want Training at the Adventurer's Guild to raise a Stat's base once per Stat, so that I have a permanent way to grow.
66. As a Player with CHA, I want Haggle to discount my purchases, so that CHA pays off in the Town.
67. As a Player, I want 5 shared Slots for Gear, Potions and Charms, so that every Slot is a build decision.
68. As a Player, I want items to cost no action and to be usable any number of times per Turn, so that Turns stay fluid.
69. As a Player, I want silly Trinkets that are worth a point and trigger gags, so that Loot is fun as well as useful.

### Player interaction

70. As a Player, I want to Shake down another Player I end my move on outside the safe zone, so that I can jab the leader.
71. As a Player with high STR, I want to Ram a Player I pass through, so that STR has a jab of its own.
72. As a defender, I want to choose my own Approach and to be able to win back from the attacker, so that a Shakedown cuts both ways.
73. As a Player who was just Shaken down, I want protection until my next Turn, so that I'm never ganged up on.
74. As a Player, I want the Town, Gates and Stairs to be a safe zone, so that home is always safe.
75. As a Player, I want to spend Sway to nudge any visible die by ±1 in anyone's Clash or Shakedown, so that CHA lets me help or hinder.
76. As a Player, I want to spend Resist to cancel a Meddle or Sway aimed at my dice, so that CON protects me.
77. As a Player, I want an 8-second Response window after Clash and Shakedown dice, shown only when I can act, so that reacting never stalls the game.
78. As a Player, I want an auto-pass setting, so that I can opt out of Response prompts.
79. As a Player, I want my movement rolls private from others' Meddle and Sway, so that jabs stay light.
80. As a Player, I want other Players' Packs and carried items hidden, so that a Shakedown is a gamble and Meddle threats stay a surprise.

### Deeds and scoring

81. As a Player, I want 3 public Deeds per game, one easy, one medium and one hard, so that there are side goals to race for.
82. As a Player, I want only the first Player to achieve a Deed to score it, so that Deeds are races.
83. As a Player, I want Trophies, Deeds and Trinkets to score immediately and never be at risk, so that progress feels safe.
84. As a Player, I want Pack Gold to count only half at the end, so that banking matters.
85. As a Player, I want ties broken by most Trophies and then the feat, so that the winner is clear.
86. As a Player, I want to see everyone's public score (excluding Pack Gold), so that I know who to jab.

### Look, feel and sound

87. As a Player, I want crisp pixel art at whole-number scale, so that the game looks good on phones and laptops.
88. As a Player, I want my piece to slide square by square, so that I can see where I went, where I Pivoted and where I got Lost.
89. As a Player, I want dice to flicker before landing, and Meddled dice to glow in the Meddler's colour, so that I can see who did what.
90. As a Player, I want sound effects for steps, dice, hits, coins and stings, so that the game feels alive.
91. As a Player, I want mute and volume on my own device, so that I can play quietly.
92. As a Player who prefers reduced motion, I want animations skipped, so that the game is comfortable.
93. As a Player, I want to skip ahead through other Players' animations, so that waiting is short.

## Implementation Decisions

### Architecture (ADR 0001)

- **Language and stack:** strict TypeScript everywhere. The client is React 19 on Vite, as a client-only single-page app. The server is Express + Socket.IO, running its TypeScript directly on Node's built-in type stripping (Node 22.18 or later). TypeScript is limited to syntax Node can strip: no enums and no namespaces.
- **Three modules in one package:**
  - **Rules:** pure, with no I/O; shared by everything.
  - **Server:** sockets, seats, the Host, timers and saving.
  - **Client:** React.
- **One port:** a single Express server serves the built client and Socket.IO, so one ngrok tunnel works. In dev, Vite's dev server proxies the socket to the server. One start command builds and runs, with an auto-restart loop.
- **The server is authoritative.** Rules run only on the server. After every change, each Player is sent their own view of the state. That view includes:
  - **their legal options right now**: move outlines (free or Pivot), Press and Retreat, Response choices, and so on;
  - **an ordered list of what just happened**, filtered like the view.

  The client never re-runs rules. It sends actions as socket messages with acknowledgements, keeps the latest view in one small store (no state library), plays the event list as animations, then settles on the view. A Player can skip ahead, and reduced-motion devices jump to the end.
- **Response windows fast-forward the animation queue.** When a Response window opens, every client jumps straight to the dice. The 8 seconds count from the server's opening of the window.
- **Presentation:**
  - graphics in plain DOM, HTML and CSS (no canvas or game engine), with whole-number pixelated scaling
  - CSS Modules with design tokens as CSS custom properties
  - all animation through Motion, the slap included
  - world sounds from Kenney files, and the slap and Trinket gags generated with Web Audio
- **Carried over from `push-poker`:**
  - the reducer-plus-per-Player-view pattern
  - seat tokens in the browser
  - a Host role that can pass between Players
  - saving the state to disk after every change
  - skipping an offline Player
  - the slap (1.5-second server cooldown, burst-and-shake)

### The board

- **Levels:**
  - **Town:** a fixed walled 5×5 grid, the same for every Player count. The Keep Hall sits in the centre and holds every Player's Keep. The Blacksmith, Apothecary, Arcanist and Adventurer's Guild sit in a plus around it. Four Gates sit mid-wall, one straight out from each store.
  - **Forest:** 9×9.
  - **Dungeon:** 7×7.
- **Tiles:** each Tile is a set of Exits, in one of four shapes (Straight, Bend, T-junction, Crossroads). There are no dead ends and no walls; every square can be entered.
- **Generation:** each Tile's shape is drawn by weight from its Level's Tile Mix, then rotated so that no Exit faces off the board. Edge squares lean towards inward-pointing T-junctions. The Tile Mixes (Straight / Bend / T / Cross) are:
  - **Forest:** 50/20/20/10
  - **Dungeon:** 5/75/15/5
- **Features:**
  - **Gates:** one Forest end on a random square of each Forest edge, each linked to the Town Gate on the matching side.
  - **Stairs:** one, on a random square in the Forest's middle 3×3. The Dungeon end is on a random Dungeon edge square.
  - **The Guardian's square:** a random square among those farthest by step count from the Dungeon's Stairs end.

  Features stay put when Tiles are swapped.
- **Fog:** the Forest's paths are visible, but its contents are hidden. The Dungeon is fully dark, except that the area around its Stairs end starts revealed. **Torchlight** reveals Tiles and contents around each piece, permanently and for everyone:
  - 3×3 at WIS 0–2
  - 5×5 at WIS 3–4
  - 7×7 at WIS 5 and up
- **Only items change the board.** Shuffling Stones swap path shapes only. A swapped edge Tile is rotated by the swapping Player so its Exits stay on the board.

### Movement

- **The roll:** 1d6 on every Level. You must move the full roll. DEX adds **at most 1 optional extra square** (none at DEX 0).
- **Each step:** move into the next square, then leave through one of its Exits, never straight back the way you came. Leaving in a direction other than your Heading is a **Pivot**: it changes your Heading and is spent on leaving. The **Pivot Limit** is 2 per Turn, plus items; it refills at the start of each of your Turns.
- **Lost:** you're Lost when every Exit you may take needs a Pivot and you have none left.
- **Gates and Stairs:** when your path crosses one, you may take it. Your movement ends, you arrive on the other Level, and you choose a new Heading for free.
- **The Town:** roll plus the optional DEX square, then move *up to* that many squares in any non-diagonal direction, with no Pivot Limit.
- **Other Players:** squares can be shared, and pieces pass through each other.

### Lost and Knocked Out

- **Being Lost** ends your Turn and sends you to your own Keep from any Level. Remaining steps are forfeited. You drop half your Pack's Gold and half its Materials, keeping the larger half, as a pile on the square where you were Lost. Anyone, you included, can pick it up.
- **What you keep:** items, Stats, Trophies and Deeds.
- **HP:** arriving at your Keep restores full HP.
- **Knocked Out** (0 HP) has exactly the same effect as being Lost.

### Stats

| Stat | Core job | Perk |
|---|---|---|
| STR | Fight Approach | **Ram**: stop on a Player you pass through with steps left and Shake them down, if your STR is greater than their CON |
| DEX | Trickery Approach | at most 1 optional extra square when moving |
| INT | Magic Approach | see and claim Caches rated at or below your INT |
| WIS | Foresight (wider Torchlight) | added on top of your Approach Stat against the Guardian |
| CON | HP = 4 + CON | **Resist**: CON points per Turn, each cancelling one Meddle or Sway aimed at your dice (not at a Mob's die); also blocks Rams from anyone whose STR isn't higher |
| CHA | **Sway**: CHA points per Turn, each nudging any visible die in play by ±1 | **Haggle**: each purchase costs 1 less Gold per 2 CHA (minimum 1) |

- **Setup:** every Stat starts at 0. Each Player assigns 6 points, with at most 3 in any one Stat.
- **Base:** setup points plus Training, capped at 5.
- **With Gear:** capped at 7.
- There is no XP and no levelling.

### Mobs and Clashes

- **Placement:** each Level is seeded with Mobs on random squares: 6 in the Forest and 5 in the Dungeon. Mobs are hidden until revealed and never wander.
- **Respawns:** a killed Mob respawns on a random empty square of the same Level. The Guardian never respawns.
- **Ambush:** stepping onto a Mob's square ends your movement and starts a Clash.
- **Each Exchange:**
  1. The Player chooses an Approach.
  2. Both sides roll face-up. The Player rolls 1d6 plus their Stat for that Approach (plus WIS against the Guardian). The Mob rolls its die for that Approach.
  3. The Response window opens.
  4. The higher total lands a hit: the Player deals 1 Wound, or the Mob deals its Damage. A tie does nothing.
- **After each Exchange:** **Press** (and you may switch Approach) or **Retreat**. A Retreat leaves you on the square and the Mob keeps its Wounds.
- **Starting a Turn on a Mob:** you may resume the Clash, which takes the whole Turn, or move away without triggering a new Ambush.
- **Wounds and rewards:** Wounds persist. **Only the kill pays**: its Trophy, scored immediately, plus its Gold into the Pack, plus a chance of Loot.

**Forest Mobs** (Damage 1, Trophy 1; ★ marks the weak Approach):

| Mob | Fight | Magic | Trickery | Wounds | Gold |
|---|---|---|---|---|---|
| Goblin | d8 | d8 | d6★ | 1 | 1 |
| Myconid | d6★ | d8 | d10 | 1 | 1 |
| Pixie | d10 | d6★ | d8 | 1 | 1 |
| Dire Wolf | d6★ | d8 | d10 | 2 | 2 |
| Bandit | d6★ | d8 | d10 | 2 | 2 |
| Treant | d10 | d6★ | d8 | 2 | 2 |

**Dungeon Mobs** (Damage 2):

| Mob | Fight | Magic | Trickery | Wounds | Trophy | Gold |
|---|---|---|---|---|---|---|
| Skeleton | d8★ | d12 | d12 | 2 | 2 | 3 |
| Wraith | d12 | d8★ | d10 | 2 | 2 | 3 |
| Gazer | d10 | d12 | d8★ | 2 | 2 | 3 |
| Cave Troll | d12 | d8★ | d10 | 3 | 3 | 5 |
| Necromancer | d8★ | d12 | d12 | 3 | 3 | 5 |

**The Guardian, Red Wyrm:**
- Dice: Fight d12, Magic d10, Trickery d8★.
- 3 Wounds, Damage 3.
- **2 Trophies per Wound** to whoever lands it, plus Loot on every Wound.
- Whoever lands the final Wound performs the **feat**: the **Guardian bonus of 5** goes straight into their Keep, and the end of the game is triggered.

Sprites come from Tiny Creatures; sprite numbers are in the Starter mob roster ticket.

### Resources and the economy

- **Resources:** **Gold** is both money and points. **Herbs** (Forest) and **Artifacts** (Dungeon) are **Materials**: worth no points, spent with Gold.
- **Tokens:** seeded at setup on random empty squares, and respawning on a random empty square of the same Level when collected.

| | Gold tokens | Material tokens | Caches |
|---|---|---|---|
| **Forest** | 6, worth 1–2 Gold each | 4 Herbs | 2 (rating 2–3; 3 Gold + 1 Herb) |
| **Dungeon** | 5, worth 3–5 Gold each | 5 Artifacts | 2 (rating 3–5; 5 Gold + 1 Artifact) |

- **Pickups:** Gold, Materials, piles and visible Caches are collected from **every square you pass over**.
- **Caches:** visible and claimable only by Players whose INT is at least the Cache's rating. Other Players' views never mention them.
- **The Keep:** holds Gold only. **Depositing is one-way**, so Deposited Gold is locked-in points. Stores take Gold **only from the Pack**.
- **Errands:** in the Town you use every building you passed this Turn, in any order: Deposit, buy and Train. This includes buildings passed on a move that ends by taking a Gate.

### Items

- **Slots:** 5, shared by Gear, Potions and Charms. Trinkets take no Slot. Items are never lost when Lost or Knocked Out.
- **Overflow:** if Loot takes you over 5 Slots, you choose what to discard.
- **Using items:** free and unlimited per Turn. Items are used during Prepare, during a Response window, or the moment their effect applies.

**Gear** (Blacksmith; Gold + Artifacts):
- Six lines, one per Stat, at +1/+2/+3. You can hold at most one piece per line.
- **Tier 1** costs 5 Gold.
- **Upgrading** trades in your current piece: +4 Gold for tier 2, +6 Gold + 1 Artifact for tier 3.

| Line | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| CON | Bronze Buckler | Iron Shield | Enchanted Aegis |
| STR | Rusty Sword | Steel Blade | Runed Greatsword |
| DEX | Leather Gloves | Thief's Gloves | Shadowsilk Gloves |
| INT | Apprentice's Tome | Grimoire | Archmage's Codex |
| WIS | Tin Lantern | Oracle's Lantern | Lantern of the Seer |
| CHA | Feathered Cap | Silver Circlet | Crown of Charm |

**Special Gear** (one Slot each, no tiers):
- **Boots of Second Thoughts:** +1 Pivot Limit. 8 Gold + 1 Artifact.
- **Lodestone Compass:** spend a Pivot to turn before moving, but never a U-turn. 4 Gold + 1 Artifact.

**Potions** (Apothecary; Gold + 1 Herb; single use; scrolls count as Potions):

| Potion | Effect | Gold |
|---|---|---|
| Troll-Blood Tonic | restore full HP | 2 |
| Draught of Wandering | this Turn, move as in the Town: any direction, up to your roll, ignoring Exits | 4 |
| Scroll of Teleportation | instead of moving, teleport to any revealed square on your Level | 6 |
| Stoneskin Salve | immune to Shakedowns and Rams until your next Turn | 2 |
| Twirlwater | +1 Pivot this Turn | 3 |

**Charms** (Arcanist; Gold + 1 Herb or Artifact; 3 Charges, crumbling when empty):

| Charm | Effect | Gold |
|---|---|---|
| Lucky Knucklebone | add 1d6 to any roll of yours | 4 |
| Trickster's Coin | Meddle: swap the values of any two dice in play | 5 |
| Hush Rune | remove one die from a roll of 2 or more dice | 5 |
| Shuffling Stones | swap the path shapes of two unoccupied squares on your Level | 4 |
| Orb of Foresight | reveal a 3×3 area anywhere on your Level (not Caches) | 3 |

**Training** (Adventurer's Guild):
- +1 to a Stat's base, at most once per Stat per game.
- Costs 6 Gold + 1 Herb + 1 Artifact.
- Never carried, and never Loot.

**Haggle** applies to every purchase.

**Trinkets** (Loot only; unique; 1 point each; never at risk):
- **Glove of Slapping:** halves your slap cooldown.
- **Ring of Reflection:** slaps aimed at you bounce back 50% of the time.
- **Trombone of Sorrow:** sad trombone when another Player is Lost or rolls a 1.
- **Sack of Flatulence:** fart sound when you pass through a Player.
- **Kazoo of Triumph:** fanfare when you kill a Mob.
- **Rubber Chicken:** squeak on demand, with a cooldown, and when you're slapped.
- **Lute of the Bard:** jingle when you Deposit.
- **Party Popper:** confetti for everyone when you Deposit 10 or more Gold at once.

Gags have a short cooldown.

**Loot:**
- **When it drops:** a Forest kill drops Loot on a 6 (d6), a Dungeon kill on 4+, a Cache on 3+, and every Guardian Wound always.
- **What drops, on a d20:**

| d20 | Loot |
|---|---|
| 1–6 | 2 Herbs |
| 7–10 | 1 Artifact |
| 11–14 | a random Potion |
| 15–17 | a random Charm |
| 18–19 | a random Trinket |
| 20 | a random tier-1 Gear |

### Player interaction

- **Shakedown:** if your movement ends on another Player's square outside the safe zone, you may Shake them down.
  1. You choose an Approach, then they choose theirs.
  2. Each rolls 1d6 plus that Stat.
  3. The Response window opens.
  4. **The winner takes up to 3 Gold or 1 Material from the loser's Pack.** This cuts both ways: the defender can win too. A tie does nothing.

  No one takes damage. The defender is then safe from Shakedowns until their next Turn.
- **Ram (STR's perk):** a Shakedown started while passing through a Player with steps left. It forfeits the rest of your move.
- **The safe zone:** the Town, every Gate square and the Stairs squares.
- **Sway and Resist** work as described under Stats.
- **Meddle:** using a dice item on dice in play during anyone's Clash or Shakedown, before the result is final.
- **Movement rolls are private:** only your own items can change them.
- **Not in the game:** no Keep attacks, and no trading or gifting.
- **Visibility:** other Players' Stats, HP, Level, Trinkets and public score are visible. Their **Pack and carried items, including Charges, are hidden**. The public score leaves out Pack Gold.

### Turn structure

1. **Start:** refresh Pivots, Sway and Resist. If you're on a Mob, resume the Clash or move away.
2. **Prepare:** use items.
3. **Roll and move:** step by step. Pickups are automatic. Prompts appear for Gates, Stairs and Rams, an Ambush ends the movement, and the optional DEX square comes last.
4. **After moving:** a Clash, a Shakedown, or Errands in the Town.
5. **End.**

- **Response windows:** one opens after the dice in every Clash and Shakedown. Only Players who can actually act (they have Sway or a usable dice item) are prompted. A targeted Player gets an instant Resist prompt. The window closes when everyone eligible has passed, or after 8 seconds. Each Player has an auto-pass setting.
- **Seats and Rounds:** seats go in join order from a random first Player. A Round is every Player taking one Turn, and the Doom Track advances after the last seat.
- **The menu's 8 kinds of action:**
  1. roll and move
  2. use an item
  3. take a Gate or the Stairs
  4. Clash: Press, Retreat or resume
  5. Shakedown or Ram
  6. Errands
  7. Respond: Meddle, Sway, Resist or Pass
  8. skip an offline Player

### Victory

- **The end:** the feat triggers the end. Otherwise the **Doom Track** ends the game after **30 / 24 / 20 / 19 / 18 Rounds** for 2 / 3 / 4 / 5 / 6 Players. Either way, play finishes the current Round.
- **Score:**
  - Keep Gold, in full
  - Pack Gold, at half (rounded down)
  - Trophies
  - Deeds
  - 1 point per Trinket
  - the Guardian bonus, already in the slayer's Keep
- **Ties:** most Trophies wins, then whoever performed the feat. If still tied, they share the win.
- **The feat is effectively the victory.** In simulation, the slayer wins 87–97% of the games the Guardian ends. That's accepted, and points decide Doom Track games.

### Deeds

Three per game, drawn one per tier and public from the start. Only the first Player to achieve each one scores it. Values: easy 3, medium 4, hard 5.

| Tier | Deed | First to… |
|---|---|---|
| Easy | Trailblazer | reach the Dungeon |
| Easy | Monster Hunter | kill 3 Mobs |
| Easy | Nest Egg | have 6 Gold Deposited |
| Easy | Shakedown Artist | win a Shakedown |
| Medium | Relic Hunter | carry 2 Artifacts into the Town at once |
| Medium | Treasure Sense | claim any Cache |
| Medium | Collector | own 1 Trinket |
| Medium | First Blood | land a Wound on the Guardian |
| Hard | Pathfinder | end 5 Turns in a row in the Dungeon without being Lost or Knocked Out |
| Hard | Deep Secrets | claim a Cache rated 3 or higher |
| Hard | Master-at-Arms | wield a tier-2 Gear |
| Hard | Dungeon Slayer | kill 3 Dungeon Mobs |

### Screen layout (variant C, "HUD overlay", on every device)

The board fills a fixed-height app shell at a whole-number scale (×2 on phones, ×3 on laptops). Panels scroll inside themselves; the page never scrolls.

- **Top:**
  - **Player row:** in Turn order, each showing name and public score. The current Player has a glowing ring and a TURN tag, and offline Players are dimmed.
  - **Turn bar:** the phase breadcrumb.
  - **Chips:** the roll and steps left, and the Doom Track.
- **On the board:** move options are outlined (green for free, orange for a Pivot), with contextual buttons right above your piece.
- **Bottom left:** your vitals strip (HP and Pivots), which opens your full sheet in a drawer.
- **Bottom right:** Deeds, Clash and Response (⚔), and the slap button.

**Taps:** information taps never act. They open an inspect card for any square, avatar, chip, item or Trinket. Actions are always explicit buttons.

**Response window:** a modal card showing both dice, your options, and the 8-second countdown bar.

**The slap:** always hits whoever's Turn it is. It has a cooldown ring, and an offline Player's avatar card offers "Skip their Turn".

### Art and sound

All assets are CC0.

**Art:** everything is 16×16 pixel art from the Kenney "Tiny" family:
- Tiny Town for the Town and Forest
- Tiny Dungeon for the Dungeon and heroes
- Tiny Creatures for Mobs
- Tiny items
- UI Pack – Pixel Adventure for frames
- Kenney Fonts

**Icons:** from Kenney's 1-Bit Pack, in two treatments:
- **Dark-tile badges** for HUD buttons over the board.
- **Glyphs tinted to Tiny colours** with a 1px `#3F2631` outline, for inline icons.

**In-house drawings:**
- **8 path overlays:** 4 shapes each for the Forest (dirt trail on grass) and the Dungeon (stone corridor on dark rock), rotated in CSS.
- **3 icons:** mute, open hand (the slap) and info.

**Dice:** a badge whose shape shows the face count, showing the rolled number. A roll flickers for about 0.6 seconds, and a Meddled or Swayed die glows in that Player's colour.

**Fog:** dark rock in the Dungeon, and a leafy overlay in the Forest. Revealed squares fade in.

**Sound:** Kenney Impact, RPG, Casino, Interface and Music Jingles files, for:
- footsteps by surface
- dice
- hits
- coins
- clicks
- the Lost and Stairs stings
- the Turn chime

Generated Web Audio makes the slap clap and the Trinket gags. Each Player has mute and volume on their own device. There's no music.

## Testing Decisions

- **A good test checks external behaviour** through the highest seam: given a game state and an action, what state, views and events come out. Tests don't check how a rule is implemented. They're named after the rule in glossary terms, for example "Lost drops half the Pack's Gold, keeping the larger half". Every rule in this spec has at least one such test.
- **Three test seams, each at the highest point that reaches the behaviour:**
  1. **The rules engine's public interface (the main seam).** It's two functions:
     - one that applies an action: given a game state, a Player and an action, it returns the next state plus the ordered list of what just happened;
     - one that builds a Player's view: what that Player sees, their legal options right now, and their filtered event list.

     Almost every test goes through it, including the fuzz games. Hidden information is tested through the view.
  2. **The server over real sockets.** This seam is only for what the rules engine can't cover: seats and reconnect tokens, Host passing, skipping an offline Player, the Response window timer and auto-pass, and saving and reloading.
  3. **The client's event queue**, as a pure module: play, skip and fast-forward.

  React components have no test seam.
- **Business logic is unit-tested in full:**
  - **The rules module:** every rule.
  - **The server's action handling:** each action's state change, and each Player's view, legal options and event list, including that hidden things stay hidden (others' Packs and items, and Caches above your INT).
  - **Table logic:** seats and reconnect tokens, Host passing, skipping an offline Player, and the Response window's 8-second timer and auto-pass.
  - **Saving and reloading.**
  - **The client's event queue:** play, skip and fast-forward, as a pure module.

  React components are not tested. Playtests catch visual problems, and React Doctor covers component quality.
- **Runner:** Vitest, with v8 coverage. **90% branch coverage is enforced** across the rules, the server and the event-queue module.
- **Determinism:** every random draw comes from a seeded generator stored in the game state, never `Math.random`. That covers dice, board generation, Loot and respawns. Tests can force the next rolls.
- **Fixtures:** small builders for games, Players, boards drawn from text glyphs, Mobs and tokens. Each builds through the real rules setup and then adjusts, so a fixture is always a reachable state. Game-state fixtures are the only "mocks".
- **No library is mocked:**
  - Server tests run the real Express and Socket.IO on a random port, with real `socket.io-client` sockets as Players.
  - Saving uses a real temporary folder.
  - Only time is faked, for the Response window timer.
- **Fuzzing:** the Balance simulation's bots, ported to drive the real rules engine, play about 200 seeded games at mixed Player counts in CI. Every Turn they check these invariants:
  - Exits stay on the board.
  - Slots stay at 5 or fewer.
  - Stats stay within their caps.
  - Gold and Materials never go negative.
  - HP stays within bounds.
  - Every game ends by the Doom Track.

  A failing seed prints as a test you can replay.
- **React Doctor at 100/100 means zero findings:** a pinned version with `--scope full --blocking warning --no-score`, on the client only. It's offline and uploads nothing. Every suppression needs a written reason and is reviewed.
- **Other gates:** strict typechecking and Prettier. No ESLint.
- **Where the gates run:**
  - **Pre-commit (Husky + lint-staged):** Prettier, a typecheck, the related Vitest tests, and React Doctor on staged files.
  - **GitHub Actions on every PR and push to main:** the full suite, including the fuzz games, coverage and a full React Doctor scan. Branch protection blocks merging while any check fails.
- **Prior art:** `push-poker`'s `node:test` suite over its pure reducer, with small state helpers. The Balance simulation prototype's pure `Sim` module and invariant checks.

## Out of Scope

- Cloud hosting, accounts and room codes: one table per server, on the Host's laptop, shared through ngrok.
- Making the art and sound assets; this spec only picks the style and the sources.
- Deckbuilding.
- Background music.
- Keep attacks, and trading or gifting between Players.
- Secret per-Player goals.
- Bots as opponents in the real game (the bots are a test harness only).
- Testing React components directly.

## Further Notes

- **Balance:** all numbers come from the Balance simulation. With them, the Guardian ends about half of games, games average 21–36 minutes, and builds win between 0.75× and 1.23× a fair share.
- **Watch in playtests:**
  - Training is rarely bought.
  - 2-Player games can end in about 10 minutes when someone slays the Wyrm early.
  - The minutes rest on a timing guess.
  - The simulator stays useful for retuning: `prototypes/balance-sim.html` on the `prototype/balance-simulation` branch.
- **Prototype branches,** kept as references and never merged:
  - `prototype/movement-feel`
  - `prototype/town-layouts`
  - `prototype/screen-layout`
  - `prototype/balance-simulation`
- **Research branches:**
  - `research/free-art-and-sound-assets`
  - `research/pixel-ui-icon-set`
  - `research/react-doctor`
