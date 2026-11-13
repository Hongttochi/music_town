# Park resident artwork

## Additional residents

`public/art/park-residents-extra.png` was generated with the built-in image tool. It contains squirrel Tori, penguin Pingu, deer Ruru and raccoon Momo in four columns, with front views on the first row and rear views on the second. Eight residents now share the existing routines, with two rows of audience positions.

Prompt:

One transparent game sprite atlas, exactly 4 equal columns by 2 equal rows, eight isolated full-body figures. Top row FRONT views of four distinct cute anthropomorphic animal villagers; bottom row matching BACK views of exactly same four animals, same scale and clothes, heads turned completely away. Column 1 cinnamon squirrel with fluffy tail wearing cream knitted vest and olive trousers; column 2 small penguin wearing dusty blue scarf and sand jacket; column 3 gentle tan deer with small antlers wearing muted lavender cardigan and cream trousers; column 4 gray raccoon wearing rust overalls with cream shirt and striped tail. Soft polished clay storybook 3D style, chibi big heads small bodies, friendly eyes, warm gentle pastel colors, cozy music park game. Strict equal cell grid, each complete character fully contained within cell with generous transparent margins, feet aligned per row, no overlapping figures, no text, no grid lines, no backdrop, no floor or ground shadows, no objects held in hands. Clearly separated legs suitable for sprites. Back views below each corresponding front view.

Generated with the built-in image generation tool; transparent PNG assets are stored in the repository:

- `public/art/park-residents.png`: four equal columns, bear / fox / cat / duck, front views.
- `public/art/park-residents-back.png`: matching rear views.

## Front atlas prompt

Create one game sprite atlas on transparent background, wide horizontal canvas with exactly four equal-width columns and one row. Each column contains one full-body cute anthropomorphic animal village resident, front-facing, standing relaxed, all same scale and feet aligned. Col1 small honey brown bear wearing sage cardigan and cream trousers; col2 orange fox with cream muzzle wearing dusty blue overalls; col3 cream cat wearing peach pinafore dress; col4 yellow duck wearing lilac sweater. Soft polished clay storybook 3D illustration, rounded chibi head, small expressive eyes, warm gentle colors, matching cozy Korean music park game. Each character entirely inside its own equal column with generous transparent margins, no overlap. No text, no grid, no backdrop, no ground, no shadows outside silhouette, no accessories held in hands. Four distinct charming villagers, leg silhouettes separate and visible for walking animation.

## Rear atlas prompt

Reference: front atlas above.

Create a matching REAR VIEW sprite atlas of these exact four villagers. Preserve exact four equal columns, image aspect ratio, size and vertical feet alignment of reference. All four now face directly AWAY from viewer, showing backs of heads and clothes. Col1 honey bear sage cardigan cream trousers, col2 orange fox dusty blue overalls and fluffy tail, col3 cream cat peach pinafore dress and tail, col4 yellow duck lilac sweater. Same soft clay style, same bodies and proportions, full bodies, separate feet visible. Transparent background, no text, no props, no ground. Only rear views, never faces or eyes. This is a matching second game animation direction sheet.

## Runtime behavior

Four local ambient residents wander, talk, watch active performances, rest on unoccupied seats, visit the bar at night, greet each other, and visit the coffee machine. They do not create accounts, attendance, hearts, rankings, or paid orders. NPC positions are local to each client. The player has priority over NPC seats and the coffee machine. Navigation uses collision checks and the river bridge, with lifecycle cleanup on scene changes.

Validation: `node --test tests/park-residents.test.mjs` and `npm.cmd run build`.
