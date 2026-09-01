/*
  The social module's design language, in one place.

  Two systems live here on purpose, because the product is two products. The
  feed side of Social follows Facebook: a grey page with white cards floating
  on it, dark near-black text, one blue accent, generous 8px rhythm. Live
  follows TikTok: edge-to-edge video on black, every control an overlay on top
  of it, hot pink accent, text that has to stay readable over whatever the
  camera happens to be pointing at.

  Everything before this was per-file literals -- '#3B82F6' in one screen,
  '#2563EB' in the next, '#1877F2' in a third, five greys within two shades of
  each other. That is why the module read as several apps stitched together.

  Import the tokens; do not re-type the hex.
*/

/* ------------------------------------------------------------------ */
/* Facebook — the feed, stories, profile, composer                     */
/* ------------------------------------------------------------------ */

export const FB = {
  /* The one accent. Buttons, active tabs, links, the "like" state. */
  primary: '#1877F2',
  primaryPressed: '#166FE5',
  /* Tint behind a primary-coloured icon or a selected chip. */
  primarySoft: '#E7F3FF',

  /*
    The page is grey and the cards are white. This is the single most
    recognisable thing about the Facebook feed and the app did not do it --
    white cards on a white page, separated by hairlines, which is why the
    timeline read as one long undifferentiated column.
  */
  page: '#F0F2F5',
  surface: '#FFFFFF',
  /* A pressed row, a chip, the composer's shortcut buttons. */
  fill: '#E4E6EB',
  fillPressed: '#D8DADF',

  text: '#050505',
  textSecondary: '#65676B',
  textTertiary: '#8A8D91',
  /* On a coloured surface. */
  onPrimary: '#FFFFFF',

  divider: '#CED0D4',
  /* The hairline inside a card, lighter than a card-to-card gap. */
  hairline: '#E4E6EB',

  danger: '#E41E3F',
  online: '#31A24C',

  radius: { sm: 6, md: 8, lg: 12, xl: 18, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },

  /*
    Facebook's type scale. The feed is 15px, not 14 -- a point that sounds
    trivial and is most of why a rebuilt feed "looks close but not right".
  */
  font: {
    title: { fontSize: 17, fontWeight: '700' as const, color: '#050505' },
    name: { fontSize: 15, fontWeight: '600' as const, color: '#050505' },
    body: { fontSize: 15, fontWeight: '400' as const, color: '#050505', lineHeight: 20 },
    meta: { fontSize: 13, fontWeight: '400' as const, color: '#65676B' },
    action: { fontSize: 14, fontWeight: '600' as const, color: '#65676B' },
    tiny: { fontSize: 12, fontWeight: '400' as const, color: '#8A8D91' },
  },

  /* Card metrics. On a phone a feed card is full-bleed: square corners, no
     side margin, separated from its neighbour by the grey page showing
     through. Rounding them is the other half of the "close but not right". */
  card: {
    gap: 8,
    padding: 12,
    radius: 0,
  },

  avatar: { xs: 24, sm: 32, md: 40, lg: 56, xl: 84 },

  /* Story tiles are tall rounded rectangles, not circles -- circles are
     Instagram. */
  story: { width: 110, height: 196, radius: 12, gap: 8 },
} as const;

/* ------------------------------------------------------------------ */
/* TikTok — live rooms and the live discovery grid                     */
/* ------------------------------------------------------------------ */

export const TT = {
  /* Not #111 or #0A0A0A. Full black, so the video is the only light source
     and the phone's own bezel disappears into the page. */
  ground: '#000000',
  /* A card on the discovery grid, which needs to read as a surface without
     lifting off the black. */
  surface: '#161823',

  accent: '#FE2C55',
  accentPressed: '#E0244A',
  cyan: '#25F4EE',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textTertiary: 'rgba(255,255,255,0.5)',

  /* Overlay fills. Everything on a live screen sits on top of moving video,
     so a control is legible only if it carries its own ground. */
  scrim: 'rgba(0,0,0,0.35)',
  scrimStrong: 'rgba(0,0,0,0.55)',
  chip: 'rgba(0,0,0,0.4)',
  glass: 'rgba(255,255,255,0.15)',

  radius: { sm: 6, md: 10, lg: 16, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },

  /*
    White text on video is unreadable the moment the video goes pale. Every
    text style on a live surface carries this shadow; it costs nothing and it
    is the difference between a caption you can read over a window and one you
    cannot.
  */
  textShadow: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  font: {
    name: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
    body: { fontSize: 14, fontWeight: '400' as const, color: '#FFFFFF', lineHeight: 19 },
    meta: { fontSize: 12, fontWeight: '500' as const, color: 'rgba(255,255,255,0.75)' },
    railCount: { fontSize: 12, fontWeight: '600' as const, color: '#FFFFFF' },
  },

  /* The right-hand action rail: the column of round buttons that is the
     single most TikTok thing about a TikTok screen. */
  rail: { icon: 30, gap: 20, right: 10, labelGap: 4 },
} as const;

export default { FB, TT };
