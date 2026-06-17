import type { StyleRecord, EntityRecord, RuleRecord } from './types'

/**
 * Geographic context
 * ------------------
 * Center: Alversjö, Sweden  [lat: 57.6206, lng: 14.9274]
 * GeoJSON coordinates are always [lng, lat].
 *
 * Rough scale at this latitude:
 *   0.001° lat ≈ 111 m
 *   0.001° lng ≈  59 m
 *
 * The seed layout covers roughly 1.2 km × 0.9 km — a plausible festival site.
 */

// ── Styles ────────────────────────────────────────────────

export const SEED_STYLES: StyleRecord[] = [
  { id: 'style-neighbourhood',  type: 'neighbourhood',  displayName: 'Neighbourhood',   fillColor: '#3b82f6', borderColor: '#1d4ed8', fillOpacity: 0.30, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-plaza',          type: 'plaza',          displayName: 'Plaza',            fillColor: '#a855f7', borderColor: '#7e22ce', fillOpacity: 0.35, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-oktocamp',       type: 'oktocamp',       displayName: 'Oktocamp',         fillColor: '#22c55e', borderColor: '#15803d', fillOpacity: 0.30, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-fireroad',       type: 'fireroad',       displayName: 'Fire Road',        fillColor: '#ef4444', borderColor: '#b91c1c', fillOpacity: 0.20, borderWidth: 4, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-minorroad',      type: 'minorroad',      displayName: 'Walking Path',     fillColor: '#f97316', borderColor: '#c2410c', fillOpacity: 0.20, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-publicplease',   type: 'publicplease',   displayName: 'Public Please',    fillColor: '#facc15', borderColor: '#a16207', fillOpacity: 0.30, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-naturereserve',  type: 'naturereserve',  displayName: 'Nature Reserve',   fillColor: '#84cc16', borderColor: '#4d7c0f', fillOpacity: 0.35, borderWidth: 2, dashPattern: '5,5', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-propertyborder', type: 'propertyborder', displayName: 'Property Border',  fillColor: '#94a3b8', borderColor: '#475569', fillOpacity: 0.50, borderWidth: 3, dashPattern: '8,4', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-forbidden',      type: 'forbidden',      displayName: 'Forbidden',        fillColor: '#dc2626', borderColor: '#991b1b', fillOpacity: 0.50, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-toilet',         type: 'toilet',         displayName: 'Toilet',           fillColor: '#06b6d4', borderColor: '#0e7490', fillOpacity: 0.40, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-bridge',         type: 'bridge',         displayName: 'Bridge',           fillColor: '#78716c', borderColor: '#44403c', fillOpacity: 0.60, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-parking',        type: 'parking',        displayName: 'Parking',          fillColor: '#6366f1', borderColor: '#4338ca', fillOpacity: 0.35, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-slope',          type: 'slope',          displayName: 'Slope',            fillColor: '#d97706', borderColor: '#92400e', fillOpacity: 0.30, borderWidth: 2, dashPattern: '5,5', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-hiddenforbidden',type: 'hiddenforbidden',displayName: 'Hidden Forbidden', fillColor: '#dc2626', borderColor: '#991b1b', fillOpacity: 0.00, borderWidth: 0, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-poi',            type: 'poi',            displayName: 'POI',              fillColor: '#f43f5e', borderColor: '#be123c', fillOpacity: 0.40, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-lake',           type: 'lake',           displayName: 'Lake',             fillColor: '#38bdf8', borderColor: '#0369a1', fillOpacity: 0.50, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
  { id: 'style-friends',        type: 'friends',        displayName: 'Friends',          fillColor: '#fb923c', borderColor: '#c2410c', fillOpacity: 0.30, borderWidth: 2, dashPattern: '',     createdAt: '2025-01-01T00:00:00Z' },
]

// ── Rules ─────────────────────────────────────────────────

export const SEED_RULES: RuleRecord[] = [
  {
    id: 'rule-forbidden-overlap',
    name: 'No camps in forbidden zones',
    ruleType: 'overlap',
    severity: 'high',
    message: 'This area is strictly off-limits for camping. Please move your camp.',
    styleOverride: { fillColor: '#dc2626', fillOpacity: 0.70 },
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rule-fireroad-overlap',
    name: 'Keep fire roads clear',
    ruleType: 'overlap',
    severity: 'high',
    message: 'Fire roads must remain clear at all times for emergency vehicle access.',
    styleOverride: { fillColor: '#f97316', fillOpacity: 0.70 },
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rule-nature-buffer',
    name: 'Nature reserve buffer',
    ruleType: 'proximity',
    severity: 'medium',
    message: 'Please keep your camp at least 15 m from the nature reserve boundary.',
    styleOverride: { fillColor: '#facc15', fillOpacity: 0.50 },
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rule-lake-buffer',
    name: 'Lake shore buffer',
    ruleType: 'proximity',
    severity: 'low',
    message: "Camps should be at least 10 m from the water's edge.",
    createdAt: '2025-01-01T00:00:00Z',
  },
]

// ── Entities ──────────────────────────────────────────────
//
// Layout (all coordinates [lng, lat]):
//
//   ┌─────────────────────────────────┐  lat 57.625
//   │  [forbidden]  │  [neighbourhood]│
//   │               │   Main Gathering│
//   ├───────────────┼─────────────────┤  lat 57.622  ← north fire road
//   │               │                 │
//   │  [natureres.] │   [plaza]       │
//   │               │   Chill Zone    │
//   ├───────────────┴─────────────────┤  lat 57.619  ← main fire road
//   │  [parking]    │   [oktocamp]    │
//   │               │   Oak Camp      │
//   └─────────────────────────────────┘  lat 57.617
//      lng 14.917                14.939

export const SEED_ENTITIES: EntityRecord[] = [

  // ── Polygons ────────────────────────────────────────────

  {
    id: 'entity-propertyborder-1',
    styleType: 'propertyborder',
    name: 'Main fields',
    tagline: 'Outer boundary of the event area',
    geometry: {
      type: 'Polygon',
      coordinates: [
                    [
                        [
                            14.931221922347703,
                            57.619421464469418
                        ],
                        [
                            14.928847874721891,
                            57.619343110121058
                        ],
                        [
                            14.926222788196252,
                            57.619101753739422
                        ],
                        [
                            14.925431745178072,
                            57.619244357031093
                        ],
                        [
                            14.925425211085834,
                            57.619295419173127
                        ],
                        [
                            14.925142298491519,
                            57.619699970617553
                        ],
                        [
                            14.924700667587945,
                            57.61975235470846
                        ],
                        [
                            14.923424853226059,
                            57.619896365877779
                        ],
                        [
                            14.923216494410074,
                            57.619830431616947
                        ],
                        [
                            14.92291542085807,
                            57.620109932013662
                        ],
                        [
                            14.921890326189933,
                            57.620363378334865
                        ],
                        [
                            14.921291600391896,
                            57.620570307981652
                        ],
                        [
                            14.922424645491425,
                            57.621753527487208
                        ],
                        [
                            14.923291398984267,
                            57.621701945262544
                        ],
                        [
                            14.924509089634229,
                            57.621746772050273
                        ],
                        [
                            14.924710388623174,
                            57.621880701212532
                        ],
                        [
                            14.924972772078238,
                            57.621976131621139
                        ],
                        [
                            14.925250592110615,
                            57.62191446912518
                        ],
                        [
                            14.925314159017423,
                            57.622236818115546
                        ],
                        [
                            14.925485465848809,
                            57.622529837415037
                        ],
                        [
                            14.925588504239974,
                            57.622951538154631
                        ],
                        [
                            14.92542168443695,
                            57.623233208939709
                        ],
                        [
                            14.924996036195362,
                            57.623520807578927
                        ],
                        [
                            14.92435899079879,
                            57.623714017630675
                        ],
                        [
                            14.924092230496205,
                            57.623900352389533
                        ],
                        [
                            14.92398986399774,
                            57.624230210650019
                        ],
                        [
                            14.924995322096246,
                            57.62443697378319
                        ],
                        [
                            14.924401019923366,
                            57.626217529773335
                        ],
                        [
                            14.92431146874115,
                            57.626580329704993
                        ],
                        [
                            14.924278943515482,
                            57.626775926776304
                        ],
                        [
                            14.924186701194834,
                            57.627271977806757
                        ],
                        [
                            14.924086769366015,
                            57.627424488134878
                        ],
                        [
                            14.923050625663763,
                            57.626898839281232
                        ],
                        [
                            14.922646704583176,
                            57.626713111877798
                        ],
                        [
                            14.921955563338104,
                            57.626550518057115
                        ],
                        [
                            14.9208942349638,
                            57.6257912157064
                        ],
                        [
                            14.92067474381343,
                            57.625467013440506
                        ],
                        [
                            14.920358823540964,
                            57.624949115371201
                        ],
                        [
                            14.919313114337665,
                            57.623709085141719
                        ],
                        [
                            14.918174008329457,
                            57.622892180423108
                        ],
                        [
                            14.916571298866518,
                            57.623138486239476
                        ],
                        [
                            14.915625294430077,
                            57.623759169491954
                        ],
                        [
                            14.917401600281076,
                            57.62524251252529
                        ],
                        [
                            14.918489584455099,
                            57.626442105670293
                        ],
                        [
                            14.919461122436022,
                            57.626719394402912
                        ],
                        [
                            14.920118653491503,
                            57.626926516117017
                        ],
                        [
                            14.920799460545554,
                            57.627337173543147
                        ],
                        [
                            14.921200877065649,
                            57.628113361637801
                        ],
                        [
                            14.921453825668152,
                            57.629019839112921
                        ],
                        [
                            14.922128765510111,
                            57.629427305511058
                        ],
                        [
                            14.922270390978914,
                            57.629732679362739
                        ],
                        [
                            14.923099644806925,
                            57.630067093674661
                        ],
                        [
                            14.923068062759281,
                            57.630268926658275
                        ],
                        [
                            14.923649881686886,
                            57.630339214668012
                        ],
                        [
                            14.923703492274205,
                            57.630034460324893
                        ],
                        [
                            14.924019177067054,
                            57.62985745518985
                        ],
                        [
                            14.924078300735315,
                            57.629672552295325
                        ],
                        [
                            14.924170176632769,
                            57.62944945989566
                        ],
                        [
                            14.9243958385324,
                            57.629237497706185
                        ],
                        [
                            14.924497362056472,
                            57.628955204977302
                        ],
                        [
                            14.924867650724739,
                            57.628974683094029
                        ],
                        [
                            14.924935812436098,
                            57.628905801706068
                        ],
                        [
                            14.925294739293689,
                            57.628937434509972
                        ],
                        [
                            14.925227842863467,
                            57.629310383881446
                        ],
                        [
                            14.925917524849465,
                            57.62929457287693
                        ],
                        [
                            14.926129606005318,
                            57.629066646659503
                        ],
                        [
                            14.926175645413979,
                            57.628725104888829
                        ],
                        [
                            14.927062559241454,
                            57.628230199042029
                        ],
                        [
                            14.928106049698309,
                            57.628064364419721
                        ],
                        [
                            14.927991855249298,
                            57.627575566654578
                        ],
                        [
                            14.928144890046443,
                            57.62753125551324
                        ],
                        [
                            14.928422091265528,
                            57.627803046000125
                        ],
                        [
                            14.928803728364734,
                            57.627811369894452
                        ],
                        [
                            14.929378921431194,
                            57.62738701202975
                        ],
                        [
                            14.929926524449652,
                            57.627547458668907
                        ],
                        [
                            14.930225478287236,
                            57.627320587196806
                        ],
                        [
                            14.930278915903617,
                            57.627040874916517
                        ],
                        [
                            14.9303868016781,
                            57.626939578641725
                        ],
                        [
                            14.930982911180221,
                            57.626637306263412
                        ],
                        [
                            14.931300391866996,
                            57.626230732697074
                        ],
                        [
                            14.931454287312992,
                            57.626050612082466
                        ],
                        [
                            14.931614959001578,
                            57.625884122174419
                        ],
                        [
                            14.931814804689196,
                            57.625718716512438
                        ],
                        [
                            14.932004690519904,
                            57.625594454949507
                        ],
                        [
                            14.932448926422685,
                            57.625335479454385
                        ],
                        [
                            14.932919925748644,
                            57.625141883633354
                        ],
                        [
                            14.933326578766534,
                            57.624886682233772
                        ],
                        [
                            14.933644228257844,
                            57.624743937721519
                        ],
                        [
                            14.934059518967908,
                            57.624929635972535
                        ],
                        [
                            14.934685129792985,
                            57.624774886374766
                        ],
                        [
                            14.935233170140766,
                            57.624713944636866
                        ],
                        [
                            14.935423789937616,
                            57.623723193057153
                        ],
                        [
                            14.935545826887413,
                            57.623084714006048
                        ],
                        [
                            14.935619202743942,
                            57.622720377385022
                        ],
                        [
                            14.935875163562571,
                            57.622234637808546
                        ],
                        [
                            14.934738796673425,
                            57.622003439181192
                        ],
                        [
                            14.93420204241214,
                            57.621711855017729
                        ],
                        [
                            14.93361386047715,
                            57.621714582017283
                        ],
                        [
                            14.933461393788523,
                            57.62158705549971
                        ],
                        [
                            14.932702839463616,
                            57.62147066235994
                        ],
                        [
                            14.932967707995338,
                            57.620450123544728
                        ],
                        [
                            14.931873941810002,
                            57.620841930884382
                        ],
                        [
                            14.931859328180659,
                            57.620247006220595
                        ],
                        [
                            14.931678998362489,
                            57.619964217934189
                        ],
                        [
                            14.931978092655518,
                            57.619812485527639
                        ],
                        [
                            14.931134555781046,
                            57.619672779375136
                        ],
                        [
                            14.931221922347703,
                            57.619421464469418
                        ]
                    ]
                ],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-propertyborder-2',
    styleType: 'propertyborder',
    name: 'Far flung field',
    tagline: 'Outer boundary of the event area',
    geometry: {
      type: 'Polygon',
      coordinates: [
      [
        [
          14.932957679257562,
          57.62802778789465
        ],
        [
          14.932941186903783,
          57.627715722949596
        ],
        [
          14.93353429754557,
          57.62746632470371
        ],
        [
          14.933900541532326,
          57.62662084457923
        ],
        [
          14.934226627542273,
          57.6264331622758
        ],
        [
          14.935025960028947,
          57.62662969323552
        ],
        [
          14.936085837687399,
          57.62690772018978
        ],
        [
          14.93607246999401,
          57.62711622783306
        ],
        [
          14.936078523216656,
          57.62753243316312
        ],
        [
          14.936307114994815,
          57.62797232309968
        ],
        [
          14.936243482629019,
          57.628440139561384
        ],
        [
          14.935535076243545,
          57.6283546995459
        ],
        [
          14.932957679257562,
          57.62802778789465
        ]
      ]
    ]
  },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
},

  {
    id: 'entity-neighbourhood-main',
    styleType: 'neighbourhood',
    name: 'Main Gathering',
    tagline: 'The heart of the festival',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.929, 57.622],
        [14.939, 57.622],
        [14.939, 57.625],
        [14.929, 57.625],
        [14.929, 57.622],
      ]],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-plaza-chill',
    styleType: 'plaza',
    name: 'Chill Zone',
    tagline: 'Relax, connect, breathe',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.929, 57.619],
        [14.939, 57.619],
        [14.939, 57.622],
        [14.929, 57.622],
        [14.929, 57.619],
      ]],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-oktocamp',
    styleType: 'oktocamp',
    name: 'Oak Camp',
    tagline: 'Shaded camping under the oaks',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.929, 57.617],
        [14.939, 57.617],
        [14.939, 57.619],
        [14.929, 57.619],
        [14.929, 57.617],
      ]],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-naturereserve',
    styleType: 'naturereserve',
    name: 'Forest Reserve',
    tagline: 'Protected woodland — do not enter',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.917, 57.619],
        [14.929, 57.619],
        [14.929, 57.622],
        [14.917, 57.622],
        [14.917, 57.619],
      ]],
    },
    rules: [
      { ruleId: 'rule-nature-buffer', distanceMeters: 15 },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-parking',
    styleType: 'parking',
    name: 'Parking Area',
    tagline: 'Festival parking — no overnight camping',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.917, 57.617],
        [14.929, 57.617],
        [14.929, 57.619],
        [14.917, 57.619],
        [14.917, 57.617],
      ]],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-forbidden',
    styleType: 'forbidden',
    name: 'No Entry Zone',
    tagline: 'Technical area — authorised personnel only',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.917, 57.622],
        [14.929, 57.622],
        [14.929, 57.625],
        [14.917, 57.625],
        [14.917, 57.622],
      ]],
    },
    rules: [
      { ruleId: 'rule-forbidden-overlap' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },

  // ── Roads ───────────────────────────────────────────────

  {
    id: 'entity-fireroad-main',
    styleType: 'fireroad',
    name: 'Main Artery',
    geometry: {
      // Fire roads are saved as MultiLineString
      type: 'MultiLineString',
      coordinates: [
        [[14.917, 57.619], [14.939, 57.619]],
      ],
    },
    rules: [
      { ruleId: 'rule-fireroad-overlap' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-fireroad-north',
    styleType: 'fireroad',
    name: 'North Perimeter Road',
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [[14.917, 57.622], [14.939, 57.622]],
      ],
    },
    rules: [
      { ruleId: 'rule-fireroad-overlap' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-minorroad-forest',
    styleType: 'minorroad',
    name: 'Forest Trail',
    geometry: {
      type: 'LineString',
      coordinates: [
        [14.919, 57.617],
        [14.920, 57.619],
        [14.921, 57.622],
        [14.922, 57.625],
      ],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-minorroad-plaza',
    styleType: 'minorroad',
    name: 'Plaza Path',
    geometry: {
      type: 'LineString',
      coordinates: [
        [14.929, 57.620],
        [14.932, 57.620],
        [14.934, 57.621],
        [14.936, 57.623],
      ],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  // ── POIs ────────────────────────────────────────────────

  {
    id: 'entity-poi-info',
    styleType: 'poi',
    name: 'Info Point',
    description: 'Festival information, maps and lost property.',
    icon: 'info',
    geometry: {
      type: 'Point',
      coordinates: [14.929, 57.6205],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-poi-medical',
    styleType: 'poi',
    name: 'Medical Tent',
    description: '24-hour first aid and medical support.',
    icon: 'hospital',
    geometry: {
      type: 'Point',
      coordinates: [14.920, 57.6205],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-poi-toilet-a',
    styleType: 'poi',
    name: 'Toilets — Block A',
    description: 'Near the main fire road crossing.',
    icon: 'toilet',
    geometry: {
      type: 'Point',
      coordinates: [14.934, 57.6195],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-poi-toilet-b',
    styleType: 'poi',
    name: 'Toilets — Block B',
    description: 'North end, near the forbidden zone.',
    icon: 'toilet',
    geometry: {
      type: 'Point',
      coordinates: [14.923, 57.6235],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-poi-bar',
    styleType: 'poi',
    name: 'Bar & Kitchen',
    description: 'Food, drinks and good company.',
    icon: 'bar',
    link: 'https://example.com/menu',
    geometry: {
      type: 'Point',
      coordinates: [14.935, 57.621],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },

  {
    id: 'entity-poi-water',
    styleType: 'poi',
    name: 'Water Station',
    description: 'Free drinking water — bring your own bottle.',
    icon: 'water',
    geometry: {
      type: 'Point',
      coordinates: [14.931, 57.6215],
    },
    rules: [],
    createdAt: '2025-01-01T00:00:00Z',
  },
]
