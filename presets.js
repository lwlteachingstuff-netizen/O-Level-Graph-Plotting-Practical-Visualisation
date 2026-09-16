/**
 * presets.js
 * Pre-configured science practical experiments matching Singapore GCE practicals
 */

const GraphPresets = {
  // 1. Blank Sheet (Start Fresh)
  custom: {
    name: "Blank Sheet (Start Fresh)",
    title: "",
    axisY: {
      symbol: "y",
      unit: "",
      display: "y"
    },
    axisX: {
      symbol: "x",
      unit: "",
      display: "x"
    },
    xOrigin: 0.0,
    yOrigin: 0.0,
    xScalePerMajor: 1.0,
    yScalePerMajor: 1.0,
    originCol: 1.5,
    originRow: 11.0,
    points: [
      { x: "", y: "" },
      { x: "", y: "" },
      { x: "", y: "" },
      { x: "", y: "" },
      { x: "", y: "" }
    ],
    defaultGradientPoints: {
      p1: { x: null, y: null },
      p2: { x: null, y: null }
    },
    teachingNotes: "Blank graph sheet ready. Enter your axis titles, units, scales, and at least 5 coordinate points."
  },

  // 2. sin i against sin r graph (Snell's Law / Refraction)
  sin_i_sin_r: {
    name: "sin i against sin r graph",
    title: "Graph of sin i against sin r",
    axisY: {
      symbol: "sin i",
      unit: "",
      display: "sin i"
    },
    axisX: {
      symbol: "sin r",
      unit: "",
      display: "sin r"
    },
    xOrigin: 0.0,
    yOrigin: 0.0,
    xScalePerMajor: 0.1,
    yScalePerMajor: 0.1,
    originCol: 1.5,
    originRow: 11.0,
    points: [
      { x: 0.115, y: 0.175 },
      { x: 0.230, y: 0.345 },
      { x: 0.335, y: 0.500 },
      { x: 0.430, y: 0.645 },
      { x: 0.510, y: 0.765 },
      { x: 0.580, y: 0.870 }
    ],
    defaultGradientPoints: {
      p1: { x: 0.040, y: 0.060 },
      p2: { x: 0.560, y: 0.840 }
    },
    teachingNotes: "Refraction practical: slope m represents refractive index n of glass (n ≈ 1.50, dimensionless)."
  },

  // 3. I against V graph (Current against Potential Difference)
  i_against_v: {
    name: "I against V graph",
    title: "Graph of I / A against V / V",
    axisY: {
      symbol: "I",
      unit: "A",
      display: "I / A"
    },
    axisX: {
      symbol: "V",
      unit: "V",
      display: "V / V"
    },
    xOrigin: 0.0,
    yOrigin: 0.0,
    xScalePerMajor: 0.5,
    yScalePerMajor: 0.1,
    originCol: 1.5,
    originRow: 11.0,
    points: [
      { x: 0.50, y: 0.125 },
      { x: 1.00, y: 0.250 },
      { x: 1.50, y: 0.370 },
      { x: 2.00, y: 0.505 },
      { x: 2.50, y: 0.620 },
      { x: 3.00, y: 0.750 },
      { x: 3.50, y: 0.875 }
    ],
    defaultGradientPoints: {
      p1: { x: 0.40, y: 0.100 },
      p2: { x: 3.40, y: 0.850 }
    },
    teachingNotes: "Ohmic conductor: slope m = 1/R = 0.250 A/V, giving resistance R = 1/m = 4.00 Ω."
  },

  // 4. F against m graph (Force against Mass)
  f_against_m: {
    name: "F against m graph",
    title: "Graph of F / N against m / kg",
    axisY: {
      symbol: "F",
      unit: "N",
      display: "F / N"
    },
    axisX: {
      symbol: "m",
      unit: "kg",
      display: "m / kg"
    },
    xOrigin: 0.0,
    yOrigin: 0.0,
    xScalePerMajor: 0.1,
    yScalePerMajor: 1.0,
    originCol: 1.5,
    originRow: 11.0,
    points: [
      { x: 0.100, y: 0.98 },
      { x: 0.200, y: 1.95 },
      { x: 0.300, y: 2.94 },
      { x: 0.400, y: 3.90 },
      { x: 0.500, y: 4.92 },
      { x: 0.600, y: 5.90 },
      { x: 0.700, y: 6.85 }
    ],
    defaultGradientPoints: {
      p1: { x: 0.050, y: 0.50 },
      p2: { x: 0.650, y: 6.38 }
    },
    teachingNotes: "Newton's Second Law: slope m represents acceleration / gravitational field strength g = 9.80 N/kg."
  }
};

// Aliases for compatibility
GraphPresets.refraction = GraphPresets.sin_i_sin_r;
GraphPresets.ohms_law = GraphPresets.i_against_v;
GraphPresets.hookes_law = GraphPresets.f_against_m;
