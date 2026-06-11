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
  { id: 'style-propertyborder', type: 'propertyborder', displayName: 'Property Border',  fillColor: '#94a3b8', borderColor: '#475569', fillOpacity: 0.08, borderWidth: 3, dashPattern: '8,4', createdAt: '2025-01-01T00:00:00Z' },
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
    id: 'entity-propertyborder',
    styleType: 'propertyborder',
    name: 'Festival Site',
    tagline: 'Outer boundary of the event area',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [14.917, 57.617],
        [14.939, 57.617],
        [14.939, 57.625],
        [14.917, 57.625],
        [14.917, 57.617],
      ]],
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
