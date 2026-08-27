function parseRankRole(roleName) {
  const original = clean(roleName);

  if (!original) {
    return null;
  }

  const name = original.toUpperCase();

  /*
   * Find tier ANYWHERE in the role name.
   *
   * Supports:
   * HT1 Sword
   * Sword HT1
   * ⚔️ HT1
   * Sword • HT1
   * HT1 | Sword
   * SWORD - HT1
   */

  const tierMatch = name.match(
    /\b(HT1|LT1|HT2|LT2|HT3|LT3|HT4|LT4|HT5|LT5)\b/
  );

  if (!tierMatch) {
    return null;
  }

  const tier = tierMatch[1];

  /*
   * Remove the tier from the role name.
   */

  let mode = name
    .replace(
      /\b(HT1|LT1|HT2|LT2|HT3|LT3|HT4|LT4|HT5|LT5)\b/g,
      " "
    );

  /*
   * Remove emojis / separators / punctuation.
   */

  mode = mode
    .replace(/[|:_()[\]{}<>]/g, " ")
    .replace(/[-–—•·]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  /*
   * Empty mode is not a valid SloTiers rank.
   */

  if (!mode) {
    return null;
  }

  /*
   * Normalize common mode names.
   *
   * This means:
   * Sword -> SWORD
   * sword -> SWORD
   * Sword PvP -> SWORD PVP
   */

  const MODE_ALIASES = {
    "SWORD": "SWORD",
    "SWORDS": "SWORD",

    "SMP": "SMP",

    "UHC": "UHC",

    "MACE": "MACE",

    "POT": "POT",
    "POTS": "POT",

    "AXE": "AXE",

    "CART": "CART",

    "NETH POT": "NETH POT",
    "NETHER POT": "NETH POT",
    "NETHERITE POT": "NETH POT",

    "VANILLA": "VANILLA",

    "SPEAR MACE": "SPEAR MACE",
    "SPEAR": "SPEAR MACE"
  };

  if (
    MODE_ALIASES[mode]
  ) {
    mode = MODE_ALIASES[mode];
  }

  return {
    mode,
    tier
  };
}
