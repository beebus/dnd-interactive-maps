export interface MapVariant {
  filename: string;
  label: string;
  description: string;
  mapKey: string;
  feetPerPixel?: number;
  isRealm?: boolean;
}

export interface MapLocation {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  maps: MapVariant[];
}

export const MAP_LOCATIONS: MapLocation[] = [
  {
    slug: 'underdark',
    name: 'Underdark',
    description:
      'The vast subterranean realm beneath Faerûn — a lightless expanse of caverns, tunnels, and sunken seas home to drow, mind flayers, beholders, and countless other horrors.',
    tags: ['Underground', 'Faerûn', 'Out of the Abyss'],
    maps: [
      {
        filename: 'Underdark_1.jpg',
        label: 'Underdark',
        description: 'The sprawling underground network of caverns and passages.',
        mapKey: 'underdark',
        feetPerPixel: 14256,
        isRealm: true,
      },
    ],
  },
  {
    slug: 'elturel',
    name: 'Elturel',
    description:
      'A holy city on the River Chionthar in the Western Heartlands, blessed by the Companion — a second sun — that keeps undead at bay.',
    tags: ['City', 'Faerûn', 'Sword Coast'],
    maps: [
      {
        filename: 'Elturel_1.png',
        label: 'Elturel (Classic)',
        description: 'Elturel, capital of Elturgard, located on the River Chionthar in the Western Heartlands.',
        mapKey: 'elturel',
        feetPerPixel: 2.92,
      },
      {
        filename: 'Elturel_2.jpg',
        label: 'Elturel in Avernus',
        description: 'Elturel chained above the River Styx after being pulled into the first layer of the Nine Hells.',
        mapKey: 'elturel_avernus',
        feetPerPixel: 4.69,
        isRealm: true,
      },
    ],
  },
  {
    slug: 'candlekeep',
    name: 'Candlekeep',
    description:
      'The legendary fortress-library on the Sword Coast, housing the greatest collection of books and scrolls in all of Faerûn. Entry requires the gift of a book found nowhere else in the collection.',
    tags: ['Library', 'Sword Coast', 'Faerûn'],
    maps: [
      {
        filename: 'Candlekeep_2.jpg',
        label: 'Candlekeep (Full)',
        description: 'The full Candlekeep complex, from the Court of Air to the innermost keep.',
        mapKey: 'candlekeep',
        feetPerPixel: 1.11,
      },
      {
        filename: 'Candlekeep_1.jpg',
        label: 'Court of Air (Outer Ward)',
        description: 'The outer ward and gatehouse — the first area visitors encounter upon arrival.',
        mapKey: 'candlekeep_outer',
        feetPerPixel: 0.45,
      },
    ],
  },
  {
    slug: 'avernus',
    name: 'Avernus',
    description:
      'The first layer of the Nine Hells — a blasted hellscape of fire, blood, and bone ruled by the fallen angel Zariel. Demons and devils wage the eternal Blood War across its scorched plains.',
    tags: ['Nine Hells', 'Outer Planes', 'Avernus'],
    maps: [
      {
        filename: 'Avernus.jpg',
        label: 'Avernus',
        description: 'The full expanse of the first layer of the Nine Hells.',
        mapKey: 'avernus',
        feetPerPixel: 243,
        isRealm: true,
      },
    ],
  },
  {
    slug: 'beregost',
    name: 'Beregost',
    description:
      'A modest town straddling the Coast Way south of Baldur\'s Gate, Beregost serves as a waypoint for travelers on the Sword Coast — and a haven for those with business best conducted quietly.',
    tags: ['Town', 'Sword Coast', 'Faerûn'],
    maps: [
      {
        filename: 'Beregost_1.webp',
        label: 'Beregost',
        description: 'The town of Beregost and its surroundings.',
        mapKey: 'beregost',
        feetPerPixel: 0.21,
      },
    ],
  },
  {
    slug: 'prismeer',
    name: 'Prismeer',
    description:
      'A splinter domain of the Feywild once ruled by the archfey Zybilna, now fractured into three bickering fiefdoms. Featured in The Wild Beyond the Witchlight.',
    tags: ['Feywild', 'Outer Planes', 'Wild Beyond the Witchlight'],
    maps: [
      {
        filename: 'Prismeer_1.webp',
        label: 'Prismeer',
        description: 'The fractured Feywild domain of Prismeer.',
        mapKey: 'prismeer',
        feetPerPixel: 134.8,
        isRealm: true,
      },
    ],
  },
];

export function getMapLocation(slug: string): MapLocation | undefined {
  return MAP_LOCATIONS.find((m) => m.slug === slug);
}
