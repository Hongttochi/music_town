# Resident eye revision

Generated with the built-in image generation tool on 2026-11-15, editing existing transparent atlases in place. Runtime walking and dialogue portraits use the same revised base artwork.

Assets in `public/art/`:

- `park-residents-simple.png` and `park-residents-extra-simple.png`: front, side and back views.
- `park-residents-motion.png` and `park-residents-extra-motion.png`: movement, seated, happy and blinking poses.
- `park-residents-seated-side.png`: side seating.
- `park-residents-drinking.png`: holding and sipping drinks.

## Edit prompt

Edit the provided transparent game sprite atlas. ONLY revise visible open EYES to give each animal a distinctive calm friendly personality instead of identical staring white ovals. Bear: small soft dark bean eyes with gentle relaxed upper lids, almost no white. Fox: cheerful narrow almond eyes with warm brown iris and subtle small highlights. Cat: softly tapered almond eyes, muted olive iris, relaxed upper lids. Duck: small dark round button eyes with tiny catchlights, no large white oval. Squirrel: small warm brown oval eyes, tiny highlights, minimal white. Penguin: relaxed half-lidded dark eyes, friendly and content, not angry. Deer: gentle elongated dark doe eyes, tiny soft highlight and delicate upper lash. Raccoon: short rounded almond dark eyes with a narrow cream rim within existing mask. Preserve already closed smiling/blinking/sipping eyes. Keep faces kind and simple to match a cozy low-detail game. Preserve EXACT original poses, species order, clothing, body proportions, head silhouette, colors, props, feet, framing and all frame placements. No face features on rear views. Do not add any background, shadows, labels, borders or detached elements. Transparent background, all complete figures isolated.

For each target, append: “Output keeps exactly 4 columns and [original row count] rows from the edit target.” Row counts are 3 for base, 5 for motion, 2 for seated side and 4 for drinking.

## Side seating transparency correction

Remove the entire background of this sprite sheet. Make the background completely transparent alpha=0, no cloudy painted backdrop, no floor, no shadows. Keep the exact eight seated animal sprites, poses, facial features, clothes, scale, 4-column 2-row positions, full bodies and all feet intact, unchanged. Clean cutout of eight isolated figures. Only background removal, no other changes.
