/**
 * app.js
 * Main Application Controller for Best Fit Line Master
 */

// Global Navigation Helpers (Callable immediately from inline onclick handlers)
window.navToStep = function(stepNum) {
  if (typeof window._applyStepGlobal === 'function') {
    window._applyStepGlobal(Number(stepNum) - 1);
  }
};

window.navToNextStep = function() {
  if (typeof window._applyNextStepGlobal === 'function') {
    window._applyNextStepGlobal();
  }
};

window.navToPrevStep = function() {
  if (typeof window._applyPrevStepGlobal === 'function') {
    window._applyPrevStepGlobal();
  }
};

window.scrollLeftPanel = function(delta) {
  const scrollContent = document.getElementById('sidebarScrollContent');
  if (scrollContent) {
    scrollContent.scrollBy({ top: delta, behavior: 'smooth' });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // State (Initialized to Clean Blank Sheet)
  const state = {
    title: "",
    axisY: {
      symbol: "",
      unit: "",
      display: ""
    },
    axisX: {
      symbol: "",
      unit: "",
      display: ""
    },
    xOrigin: 0.0,
    yOrigin: 0.0,
    xScale: 1.0,
    yScale: 1.0,
    originCol: 1.5,
    originRow: 11.0,
    numMajorX: 10,
    numMajorY: 10,
    points: [
      { x: "", y: "" },
      { x: "", y: "" },
      { x: "", y: "" },
      { x: "", y: "" },
      { x: "", y: "" }
    ],
    plotSymbol: 'cross', // 'cross', 'plus', 'circledot'
    showBestFitLine: true,
    showExtrapolation: true,
    showCentroid: false,
    showGradientTriangle: true,
    isCustomLine: false,
    isSLAPSatisfied: false,
    bestFitLine: null,
    gradientTriangle: {
      p1: { x: null, y: null },
      p2: { x: null, y: null }
    },
    currentStep: 1,
    mode: 'walkthrough' // 'walkthrough' or 'sandbox'
  };

  // DOM Elements
  const canvas = document.getElementById('graphCanvas');
  const canvasContainer = document.getElementById('canvasContainer');
  const virtualRulerEl = document.getElementById('virtualRuler');
  const rulerTicksContainer = document.getElementById('rulerTicksContainer');

  // Dedicated Visual Custom Scroll Slider function reference
  let updateCustomScrollThumb = () => {};

  // Initialize Engines
  const graphEngine = new GraphEngine(canvas, canvasContainer);
  const rulerTool = new RulerTool(virtualRulerEl, rulerTicksContainer, graphEngine);

  window.state = state;
  window.graphEngine = graphEngine;
  window.rulerTool = rulerTool;
  window.updateAll = updateAll;
  window.loadPreset = loadPreset;

  // Initialize Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Ensure canvas fits viewport properly after layout renders
  setTimeout(() => {
    graphEngine.initCanvasSize();
    loadPreset('custom');
    updateAll();
  }, 60);

  // Re-render when handwriting fonts are loaded from Google Fonts
  if (document.fonts) {
    document.fonts.ready.then(() => {
      graphEngine.render();
    });
  }

  // Bind UI Events
  setupUIEventListeners();

  // Graph Engine Hover Tracking
  graphEngine.onHoverCallback = (dataCoords) => {
    const xPrec = PedagogyEngine.calculateAxisPrecision(state.xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(state.yScale);
    const hudCoords = document.getElementById('hudCoords');
    const hudSmallSq = document.getElementById('hudSmallSq');

    if (hudCoords) {
      hudCoords.textContent = `X: ${PedagogyEngine.formatToDecPlaces(dataCoords.x, xPrec.decimalPlaces)}, Y: ${PedagogyEngine.formatToDecPlaces(dataCoords.y, yPrec.decimalPlaces)}`;
    }
    if (hudSmallSq) {
      hudSmallSq.textContent = `${xPrec.smallSquareValue} × ${yPrec.smallSquareValue}`;
    }
  };

  // Axis Dragging Callbacks (Step 2 / Sandbox)
  graphEngine.onAxisDragCallback = (col, row) => {
    state.originCol = col;
    state.originRow = row;
    updateAll();
  };

  graphEngine.onAxisDragEndCallback = (draggedAxis, col, row) => {
    state.originCol = col;
    state.originRow = row;
    updateAll();
    if (draggedAxis === 'y-axis') {
      showToast(`Positioned Y-Axis at Grid Column ${col.toFixed(1)}`);
    } else if (draggedAxis === 'x-axis') {
      showToast(`Positioned X-Axis at Grid Row ${row.toFixed(1)}`);
    } else {
      showToast(`Positioned Origin at Col ${col.toFixed(1)}, Row ${row.toFixed(1)}`);
    }
  };

  // Best Fit Line Dragging Callbacks (Step 4 / Sandbox)
  graphEngine.onLineDragCallback = (bestFitLine) => {
    state.isCustomLine = true;
    state.bestFitLine = bestFitLine;
    updateAll();
  };

  graphEngine.onLineDragEndCallback = (bestFitLine) => {
    state.isCustomLine = true;
    state.bestFitLine = bestFitLine;
    updateAll();
    showToast(`Adjusted Best Fit Line: slope = ${bestFitLine.slope.toFixed(3)}, c = ${bestFitLine.intercept.toFixed(2)}`);
  };

  // Physical Point Plotting via Click on Graph Paper (Step 3 / Sandbox)
  graphEngine.onCanvasClickCallback = (dataCoords) => {
    // Only allow plotting in Step 3 or later, or in sandbox mode!
    if (state.mode === 'walkthrough' && state.currentStep < 3) {
      if (state.currentStep === 2) {
        showToast('You are in Step 2 (Scales & Axes). Drag axes to set origin, or proceed to Step 3 to plot points!');
      } else {
        showToast('Proceed to Step 3 to plot experimental data points!');
      }
      return;
    }

    const xPrec = PedagogyEngine.calculateAxisPrecision(state.xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(state.yScale);

    // In Step 5: Clicking on the graph places or updates Gradient Triangle measurement DOTS (●) on the Best Fit Line
    if (state.mode === 'walkthrough' && state.currentStep === 5) {
      if (!state.bestFitLine) {
        showToast('Plot at least 5 points in Step 3 first to generate the Best Fit Line!');
        return;
      }

      const { slope, intercept } = state.bestFitLine;
      const snappedX = Math.round(dataCoords.x / xPrec.stepPrecision) * xPrec.stepPrecision;
      const lineY = slope * snappedX + intercept;
      const snappedY = Math.round(lineY / yPrec.stepPrecision) * yPrec.stepPrecision;

      const formattedX = parseFloat(PedagogyEngine.formatToDecPlaces(snappedX, xPrec.decimalPlaces));
      const formattedY = parseFloat(PedagogyEngine.formatToDecPlaces(snappedY, yPrec.decimalPlaces));

      if (!state.gradientTriangle) {
        state.gradientTriangle = { p1: { x: null, y: null }, p2: { x: null, y: null } };
      }

      const { p1, p2 } = state.gradientTriangle;
      const hasP1 = p1 && p1.x !== null && !isNaN(p1.x);
      const hasP2 = p2 && p2.x !== null && !isNaN(p2.x);

      if (!hasP1 && !hasP2) {
        state.gradientTriangle.p1 = { x: formattedX, y: formattedY };
        showToast(`Set Point 1 at (${formattedX}, ${formattedY}) with dot ●. Click second point on line!`);
      } else if (!hasP1) {
        state.gradientTriangle.p1 = { x: formattedX, y: formattedY };
        showToast(`Set Point 1 at (${formattedX}, ${formattedY}) with dot ●`);
      } else if (!hasP2) {
        if (formattedX < state.gradientTriangle.p1.x) {
          state.gradientTriangle.p2 = { ...state.gradientTriangle.p1 };
          state.gradientTriangle.p1 = { x: formattedX, y: formattedY };
        } else {
          state.gradientTriangle.p2 = { x: formattedX, y: formattedY };
        }
        showToast(`Set Point 2 at (${formattedX}, ${formattedY}) with dot ●. Triangle created!`);
      } else {
        // Both points already set: update the closer point
        const d1 = Math.abs(formattedX - state.gradientTriangle.p1.x);
        const d2 = Math.abs(formattedX - state.gradientTriangle.p2.x);
        if (d1 <= d2) {
          state.gradientTriangle.p1 = { x: formattedX, y: formattedY };
          showToast(`Updated Point 1 to (${formattedX}, ${formattedY}) with dot ●`);
        } else {
          state.gradientTriangle.p2 = { x: formattedX, y: formattedY };
          showToast(`Updated Point 2 to (${formattedX}, ${formattedY}) with dot ●`);
        }
        // Ensure p1 is left and p2 is right
        if (state.gradientTriangle.p1.x > state.gradientTriangle.p2.x) {
          const tmp = state.gradientTriangle.p1;
          state.gradientTriangle.p1 = state.gradientTriangle.p2;
          state.gradientTriangle.p2 = tmp;
        }
      }

      updateAll();
      return;
    }

    // Snap coordinates to 1/2 smallest division precision (D/20)
    let snappedX = Math.round(dataCoords.x / xPrec.stepPrecision) * xPrec.stepPrecision;
    let snappedY = Math.round(dataCoords.y / yPrec.stepPrecision) * yPrec.stepPrecision;

    // Active Grid Coordinate Bounds relative to originCol and originRow
    const originCol = graphEngine.getOriginCol();
    const originRow = graphEngine.getOriginRow();
    const minGridX = state.xOrigin - (originCol - 0.5) * state.xScale;
    const maxGridX = state.xOrigin + (graphEngine.gridMajorCols - originCol - 0.5) * state.xScale;
    const minGridY = state.yOrigin - (graphEngine.gridMajorRows - originRow - 0.5) * state.yScale;
    const maxGridY = state.yOrigin + (originRow - 1.5) * state.yScale;

    // Snap cleanly to border if clicked within 1 division of the axes
    if (Math.abs(snappedX - minGridX) <= xPrec.stepPrecision) snappedX = minGridX;
    if (Math.abs(snappedX - maxGridX) <= xPrec.stepPrecision) snappedX = maxGridX;
    if (Math.abs(snappedY - minGridY) <= yPrec.stepPrecision) snappedY = minGridY;
    if (Math.abs(snappedY - maxGridY) <= yPrec.stepPrecision) snappedY = maxGridY;

    const formattedX = parseFloat(PedagogyEngine.formatToDecPlaces(snappedX, xPrec.decimalPlaces));
    const formattedY = parseFloat(PedagogyEngine.formatToDecPlaces(snappedY, yPrec.decimalPlaces));

    if (formattedX < minGridX || formattedX > maxGridX || formattedY < minGridY || formattedY > maxGridY) {
      return; // Ignore clicks outside active plotting area
    }

    // Check if clicked close to an existing point to remove it
    const toleranceX = xPrec.smallSquareValue * 1.2;
    const toleranceY = yPrec.smallSquareValue * 1.2;
    const existingIdx = state.points.findIndex(p => {
      if (p.x === '' || p.y === '' || p.x === null || p.y === null || isNaN(Number(p.x)) || isNaN(Number(p.y))) return false;
      return Math.abs(Number(p.x) - formattedX) <= toleranceX && Math.abs(Number(p.y) - formattedY) <= toleranceY;
    });

    if (existingIdx !== -1) {
      if (state.points.length > 5) {
        state.points.splice(existingIdx, 1);
        updateAll();
        showToast(`Removed Point at (${formattedX}, ${formattedY})`);
      } else {
        state.points[existingIdx] = { x: '', y: '' };
        updateAll();
        showToast(`Cleared Point #${existingIdx + 1}`);
      }
      return;
    }

    // Add new point: check for an unfilled slot first
    let targetIdx = state.points.findIndex(p => p.x === '' || p.y === '' || p.x === null || p.y === null);
    if (targetIdx !== -1) {
      state.points[targetIdx] = { x: formattedX, y: formattedY };
      updateAll();
      showToast(`Plotted Point #${targetIdx + 1}: (${formattedX}, ${formattedY})`);
    } else if (state.points.length < 20) {
      state.points.push({ x: formattedX, y: formattedY });
      updateAll();
      showToast(`Plotted Point #${state.points.length}: (${formattedX}, ${formattedY})`);
    } else {
      showToast(`Maximum of 20 points allowed!`);
    }
  };

  // Dragging Gradient Triangle measurement dots along the Best Fit Line
  graphEngine.onTrianglePointDragCallback = (gradientTriangle) => {
    state.gradientTriangle = gradientTriangle;
    const xPrec = PedagogyEngine.calculateAxisPrecision(state.xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(state.yScale);
    updateGradientCalculations(xPrec, yPrec);
    updateScorecard();
  };

  graphEngine.onTrianglePointDragEndCallback = (gradientTriangle) => {
    state.gradientTriangle = gradientTriangle;
    updateAll();
    showToast('Updated Gradient Triangle measurement points');
  };

  graphEngine.onZoomCallback = (zoom) => {
    const zoomDisplay = document.getElementById('zoomLevelDisplay');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
    }
  };

  rulerTool.onTransformChange = (angle) => {
    const badge = document.getElementById('rulerAngleBadge');
    if (badge) {
      badge.textContent = `Angle: ${angle.toFixed(1)}°`;
    }
  };

  /**
   * Main Update Function
   */
  function updateAll() {
    // 1. Calculate Regression / Best Fit Line (preserve dragged line if custom)
    const validCount = PedagogyEngine.getValidPoints(state.points).length;
    if (validCount >= 5) {
      const reg = PedagogyEngine.calculateLinearRegression(state.points);
      if (!state.isCustomLine || !state.bestFitLine) {
        state.bestFitLine = reg;
      } else {
        // Keep user's custom dragged slope and intercept, update regression statistics
        state.bestFitLine.xMean = reg.xMean;
        state.bestFitLine.yMean = reg.yMean;
        state.bestFitLine.r2 = reg.r2;
      }
    } else if (!state.isCustomLine) {
      state.bestFitLine = null;
    }

    // 2. Calculate Axis Precisions
    const xPrec = PedagogyEngine.calculateAxisPrecision(state.xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(state.yScale);

    // 3. Update Precision Cards in Left Panel
    updatePrecisionCards(xPrec, yPrec);

    // 4. Update Solidus Previews & KaTeX
    updateSolidusPreviews();

    // 5. Update SLAP Evaluation
    const slap = PedagogyEngine.evaluateSLAP(state);

    // Criteria statuses (only active when user has started working):
    // Scale: Red if < 50% or awkward scale (only once >= 5 points plotted)
    // Line: Red if unbalanced (only once >= 5 points plotted)
    // Axis: Red if missing labels/units — only once user has typed anything (title, axis symbol, or any points)
    // Points: Red only once user begins entering points (1 to 4 present)
    const userHasStarted = Boolean(validCount > 0 || state.title || state.axisX.symbol || state.axisY.symbol);
    const scaleIsRed = (validCount >= 5) && !slap.scale.passed;
    const lineIsRed  = (validCount >= 5) && !slap.line.isBalanced;
    const axisIsRed  = userHasStarted && !slap.axis.passed;
    const pointsIsRed = (validCount > 0 && validCount < 5);

    // Either one of SLAP is red (only when user has started working, to avoid
    // turning the line red on a pristine blank sheet)
    const isSLAPFailedRed = Boolean(userHasStarted && (scaleIsRed || lineIsRed || axisIsRed || pointsIsRed));

    // All four criteria satisfied: S (Scale), L (Line), A (Axis), P (Points)
    const isSLAPSatisfied = Boolean(
      validCount >= 5 &&
      slap.scale.passed &&
      slap.line.isBalanced &&
      slap.axis.passed &&
      slap.points.passed
    );

    const wasSLAPSatisfied = state.isSLAPSatisfied;
    state.isSLAPSatisfied = isSLAPSatisfied;
    state.isSLAPFailedRed = isSLAPFailedRed;

    if (isSLAPSatisfied && !wasSLAPSatisfied) {
      triggerConfettiCelebration();
      showToast('🎉 Excellent! All 4 SLAP criteria satisfied! Best fit line is now green.');
    }

    updateSLAPBadges(slap, isSLAPSatisfied, { scaleIsRed, lineIsRed, axisIsRed, pointsIsRed });

    // 6. Update Gradient Calculations & Working
    updateGradientCalculations(xPrec, yPrec);

    // 7. Update Points Table
    renderPointsTable();

    // 8. Update Graph Engine
    graphEngine.setState(state);
    graphEngine.render();

    // 9. Re-render icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Update Precision Info Display (D/20 rules)
   */
  function updatePrecisionCards(xPrec, yPrec) {
    document.getElementById('calcXSmallSq').textContent = xPrec.smallSquareValue.toString();
    document.getElementById('calcXHalfSq').textContent = xPrec.halfSmallestValue.toString();
    document.getElementById('calcXDecPlaces').textContent = `${xPrec.decimalPlaces} d.p.`;

    document.getElementById('calcYSmallSq').textContent = yPrec.smallSquareValue.toString();
    document.getElementById('calcYHalfSq').textContent = yPrec.halfSmallestValue.toString();
    document.getElementById('calcYDecPlaces').textContent = `${yPrec.decimalPlaces} d.p.`;

    // Intercept Values
    const yIntVal = document.getElementById('yInterceptVal');
    const xIntVal = document.getElementById('xInterceptVal');
    if (yIntVal) {
      yIntVal.textContent = state.bestFitLine ? PedagogyEngine.formatToDecPlaces(state.bestFitLine.intercept, yPrec.decimalPlaces) : '—';
    }
    if (xIntVal) {
      if (state.bestFitLine && state.bestFitLine.slope !== 0) {
        const xInt = -state.bestFitLine.intercept / state.bestFitLine.slope;
        xIntVal.textContent = PedagogyEngine.formatToDecPlaces(xInt, xPrec.decimalPlaces);
      } else {
        xIntVal.textContent = '—';
      }
    }
  }

  /**
   * Update Solidus Notation Previews
   */
  function updateSolidusPreviews() {
    const prevY = document.getElementById('previewYSolidus');
    const prevX = document.getElementById('previewXSolidus');

    const yStr = state.axisY.symbol ? (state.axisY.unit ? `${state.axisY.symbol} / ${state.axisY.unit}` : state.axisY.symbol) : '—';
    const xStr = state.axisX.symbol ? (state.axisX.unit ? `${state.axisX.symbol} / ${state.axisX.unit}` : state.axisX.symbol) : '—';

    if (prevY) prevY.textContent = yStr;
    if (prevX) prevX.textContent = xStr;

    // Update table column headers
    const thX = document.getElementById('tableHeaderX');
    const thY = document.getElementById('tableHeaderY');
    if (thX) thX.textContent = `X (${state.axisX.symbol || 'x'})`;
    if (thY) thY.textContent = `Y (${state.axisY.symbol || 'y'})`;
  }

  /**
   * Update SLAP Criteria Checklist & Progress Bars
   */
  function updateSLAPBadges(slap, isSLAPSatisfied, criteriaIssues = {}) {
    const validCount = slap.points.count;
    const isRedIssues = Boolean(
      criteriaIssues.scaleIsRed ||
      criteriaIssues.lineIsRed ||
      criteriaIssues.axisIsRed ||
      criteriaIssues.pointsIsRed
    );

    // S - Scale
    const xCoverage = Math.min(100, Math.round(slap.scale.xCoverage));
    const yCoverage = Math.min(100, Math.round(slap.scale.yCoverage));
    const minCoverage = Math.min(xCoverage, yCoverage);

    const xCovPct = document.getElementById('xCoveragePct');
    const yCovPct = document.getElementById('yCoveragePct');
    const xBar = document.getElementById('xCoverageBar');
    const yBar = document.getElementById('yCoverageBar');

    if (xCovPct) xCovPct.textContent = `${xCoverage}%`;
    if (yCovPct) yCovPct.textContent = `${yCoverage}%`;
    if (xBar) xBar.style.width = `${xCoverage}%`;
    if (yBar) yBar.style.width = `${yCoverage}%`;

    const sBadge = document.getElementById('slapBadgeS');
    const sDesc = document.getElementById('slapDescS');
    const covBadge = document.getElementById('coverageSummaryBadge');

    // Scale highlighting:
    // yellow if it hits 50%-75% of the graph paper
    // green if it is more than 75% of the graph paper
    // red if < 50% or awkward scale
    if (validCount < 5) {
      if (sBadge) sBadge.className = 'bg-slate-800/80 rounded-lg p-1 border border-slate-700 text-slate-400';
      if (sDesc) sDesc.textContent = validCount === 0 ? 'Enter Points' : `${validCount}/5 Points`;
      if (covBadge) {
        covBadge.textContent = 'Awaiting ≥ 5 Points';
        covBadge.className = 'px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium text-[9px]';
      }
      if (xBar) xBar.className = 'h-full bg-cyan-500 rounded-full transition-all';
      if (yBar) yBar.className = 'h-full bg-cyan-500 rounded-full transition-all';
    } else if (minCoverage > 75 && slap.scale.isConvenientScaleX && slap.scale.isConvenientScaleY) {
      // Green if > 75%
      if (sBadge) sBadge.className = 'bg-emerald-950/60 rounded-lg p-1 border-2 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950/50';
      if (sDesc) sDesc.textContent = `> 75% (${minCoverage}%)`;
      if (covBadge) {
        covBadge.textContent = `Exemplary (${minCoverage}% > 75%)`;
        covBadge.className = 'px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold text-[9px]';
      }
      if (xBar) xBar.className = 'h-full bg-emerald-500 rounded-full transition-all';
      if (yBar) yBar.className = 'h-full bg-emerald-500 rounded-full transition-all';
    } else if (minCoverage >= 50 && slap.scale.isConvenientScaleX && slap.scale.isConvenientScaleY) {
      // Yellow if 50% - 75%
      if (sBadge) sBadge.className = 'bg-amber-950/60 rounded-lg p-1 border-2 border-amber-400 text-amber-300 shadow-sm shadow-amber-950/50';
      if (sDesc) sDesc.textContent = `50%-75% (${minCoverage}%)`;
      if (covBadge) {
        covBadge.textContent = `Acceptable (${minCoverage}% ≥ 50%)`;
        covBadge.className = 'px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-400 font-bold text-[9px]';
      }
      if (xBar) xBar.className = 'h-full bg-amber-400 rounded-full transition-all';
      if (yBar) yBar.className = 'h-full bg-amber-400 rounded-full transition-all';
    } else {
      // Red if < 50% or awkward scale
      if (sBadge) sBadge.className = 'bg-rose-950/60 rounded-lg p-1 border-2 border-rose-600 text-rose-300 shadow-sm shadow-rose-950/50';
      if (sDesc) sDesc.textContent = `< 50% (${minCoverage}%)`;
      if (covBadge) {
        covBadge.textContent = `Scale Too Small (${minCoverage}% < 50%)`;
        covBadge.className = 'px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold text-[9px]';
      }
      if (xBar) xBar.className = 'h-full bg-rose-500 rounded-full transition-all';
      if (yBar) yBar.className = 'h-full bg-rose-500 rounded-full transition-all';
    }

    // L - Line (Requires >= 5 points)
    const lBadge = document.getElementById('slapBadgeL');
    const lDesc = document.getElementById('slapDescL');
    const ptsAboveEl = document.getElementById('ptsAboveCount');
    const ptsBelowEl = document.getElementById('ptsBelowCount');
    const ptsOnEl = document.getElementById('ptsOnCount');
    if (ptsAboveEl) ptsAboveEl.textContent = slap.line.ptsAbove;
    if (ptsBelowEl) ptsBelowEl.textContent = slap.line.ptsBelow;
    if (ptsOnEl) ptsOnEl.textContent = slap.line.ptsOn;

    const balanceBadge = document.getElementById('balanceStatusBadge');
    if (validCount < 5) {
      if (lBadge) lBadge.className = 'bg-slate-800/80 rounded-lg p-1 border border-slate-700';
      if (lDesc) lDesc.textContent = validCount === 0 ? 'Enter Points' : `Need ≥ 5 Pts (${validCount}/5)`;
      if (balanceBadge) {
        balanceBadge.className = 'text-slate-400';
        balanceBadge.textContent = 'Need ≥ 5 Points';
      }
    } else if (slap.line.isBalanced) {
      if (lBadge) lBadge.className = 'bg-emerald-950/60 rounded-lg p-1 border-2 border-emerald-500 text-emerald-300';
      if (lDesc) lDesc.textContent = 'Balanced';
      if (balanceBadge) {
        balanceBadge.className = 'text-emerald-400';
        balanceBadge.textContent = 'Well Balanced';
      }
    } else {
      // Unbalanced is a line failure -> Red
      if (lBadge) lBadge.className = 'bg-rose-950/60 rounded-lg p-1 border-2 border-rose-600 text-rose-300 shadow-sm shadow-rose-950/50';
      if (lDesc) lDesc.textContent = 'Unbalanced';
      if (balanceBadge) {
        balanceBadge.className = 'text-rose-400 font-semibold';
        balanceBadge.textContent = 'Points Skewed (Unbalanced)';
      }
    }

    // A - Axis
    const aBadge = document.getElementById('slapBadgeA');
    if (aBadge) {
      if (slap.axis.passed) {
        aBadge.className = 'bg-emerald-950/60 rounded-lg p-1 border-2 border-emerald-500 text-emerald-300';
      } else if (validCount > 0 || state.title || state.axisX.symbol || state.axisY.symbol) {
        // Missing axis labels/units when user starts interacting -> Red
        aBadge.className = 'bg-rose-950/60 rounded-lg p-1 border-2 border-rose-600 text-rose-300 shadow-sm shadow-rose-950/50';
      } else {
        aBadge.className = 'bg-slate-800/80 rounded-lg p-1 border border-slate-700';
      }
    }

    // P - Points
    const pBadge = document.getElementById('slapBadgeP');
    const pDesc = document.getElementById('slapDescP');
    const countLabel = document.getElementById('pointsCountLabel');
    if (countLabel) countLabel.textContent = validCount;
    if (pBadge && pDesc) {
      if (slap.points.passed) {
        pBadge.className = 'bg-emerald-950/60 rounded-lg p-1 border-2 border-emerald-500 text-emerald-300';
        pDesc.textContent = `${validCount} Pts Sharp`;
      } else if (validCount === 0) {
        pBadge.className = 'bg-slate-800/80 rounded-lg p-1 border border-slate-700';
        pDesc.textContent = '0 / 5 Points';
      } else {
        // Fewer than 5 points when points are entered -> Red
        pBadge.className = 'bg-rose-950/60 rounded-lg p-1 border-2 border-rose-600 text-rose-300 shadow-sm shadow-rose-950/50';
        pDesc.textContent = `${validCount} / 5 Points`;
      }
    }

    // Master Score Badge & Celebration state
    const overallBadge = document.getElementById('overallScoreBadge');
    if (overallBadge) {
      let slapCriteriaMet = (slap.scale.passed ? 1 : 0) + (slap.line.passed ? 1 : 0) + (slap.axis.passed ? 1 : 0) + (slap.points.passed ? 1 : 0);
      if (validCount < 5 && validCount > 0) {
        overallBadge.textContent = `Need ≥ 5 Pts (${validCount}/5)`;
        overallBadge.className = 'px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold text-[10px] shadow-sm shadow-rose-950/50';
      } else if (validCount === 0) {
        overallBadge.textContent = 'Awaiting Data (0/5 pts)';
        overallBadge.className = 'px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono font-bold text-[10px]';
      } else if (isSLAPSatisfied) {
        overallBadge.textContent = '🎉 SLAP Mastered (4/4)';
        overallBadge.className = 'px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border-2 border-emerald-500 font-mono font-bold text-[10px] shadow-sm shadow-emerald-900/60';
      } else if (isRedIssues) {
        overallBadge.textContent = `SLAP: ${slapCriteriaMet}/4 (Review Red)`;
        overallBadge.className = 'px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border-2 border-rose-600 font-mono font-bold text-[10px] shadow-sm shadow-rose-950/60';
      } else {
        overallBadge.textContent = `SLAP: ${slapCriteriaMet}/4`;
        overallBadge.className = 'px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold text-[10px]';
      }
    }
  }

  /**
   * Update Gradient Calculations and Step-by-Step KaTeX Output
   */
  function updateGradientCalculations(xPrec, yPrec) {
    const validCount = PedagogyEngine.getValidPoints(state.points).length;
    const { p1, p2 } = state.gradientTriangle;

    if (validCount < 5 || !p1 || !p2 || p1.x === null || p2.x === null) {
      document.getElementById('inputX1').value = (p1 && p1.x !== null) ? PedagogyEngine.formatToDecPlaces(p1.x, xPrec.decimalPlaces) : '';
      document.getElementById('inputY1').value = (p1 && p1.y !== null) ? PedagogyEngine.formatToDecPlaces(p1.y, yPrec.decimalPlaces) : '';
      document.getElementById('inputX2').value = (p2 && p2.x !== null) ? PedagogyEngine.formatToDecPlaces(p2.x, xPrec.decimalPlaces) : '';
      document.getElementById('inputY2').value = (p2 && p2.y !== null) ? PedagogyEngine.formatToDecPlaces(p2.y, yPrec.decimalPlaces) : '';

      const mathContainer = document.getElementById('gradientWorkingMath');
      if (mathContainer && window.katex) {
        const hintMsg = validCount < 5 
          ? 'm = \\frac{\\Delta y}{\\Delta x} \\quad \\text{(Plot } \\ge 5 \\text{ points to activate best fit line & gradient)}'
          : 'm = \\frac{\\Delta y}{\\Delta x} \\quad \\text{(Enter coordinates to calculate)}';
        window.katex.render(hintMsg, mathContainer, { displayMode: true, throwOnError: false });
      }
      const finalValEl = document.getElementById('gradientFinalValue');
      const finalUnitEl = document.getElementById('gradientFinalUnit');
      const sfReasonEl = document.getElementById('gradientSFReason');
      const triAlert = document.getElementById('triangleSizeAlert');

      if (finalValEl) finalValEl.textContent = '—';
      if (finalUnitEl) finalUnitEl.textContent = '—';
      if (sfReasonEl) sfReasonEl.textContent = '—';
      if (triAlert) {
        triAlert.className = 'p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-[9.5px] flex items-center justify-between';
        triAlert.innerHTML = validCount < 5 
          ? `<span>Triangle Span: <b id="triangleSpanPct">0% of grid</b></span><span>Need ≥ 5 Points</span>`
          : `<span>Triangle Span: <b id="triangleSpanPct">0% of grid</b></span><span>Awaiting Coordinates</span>`;
      }
      return;
    }

    // Update input values
    document.getElementById('inputX1').value = PedagogyEngine.formatToDecPlaces(p1.x, xPrec.decimalPlaces);
    document.getElementById('inputY1').value = PedagogyEngine.formatToDecPlaces(p1.y, yPrec.decimalPlaces);
    document.getElementById('inputX2').value = PedagogyEngine.formatToDecPlaces(p2.x, xPrec.decimalPlaces);
    document.getElementById('inputY2').value = PedagogyEngine.formatToDecPlaces(p2.y, yPrec.decimalPlaces);

    // Build Math Explanation
    const mathResult = PedagogyEngine.generateGradientMathExplanation(
      p1, p2, xPrec, yPrec, state.axisY.unit, state.axisX.unit
    );

    const mathContainer = document.getElementById('gradientWorkingMath');
    if (mathContainer && window.katex) {
      window.katex.render(mathResult.latexFormula, mathContainer, { displayMode: true, throwOnError: false });
    }

    const finalValEl = document.getElementById('gradientFinalValue');
    const finalUnitEl = document.getElementById('gradientFinalUnit');
    const sfReasonEl = document.getElementById('gradientSFReason');
    if (finalValEl) finalValEl.textContent = mathResult.finalGradientStr;
    if (finalUnitEl) finalUnitEl.textContent = mathResult.gradientUnit || 'None (Ratio)';
    if (sfReasonEl) sfReasonEl.textContent = `${mathResult.chosenSF} s.f. (based on coordinates)`;

    // Triangle Span Alert
    const totalSpanX = state.numMajorX * state.xScale;
    const triSpan = Math.abs(p2.x - p1.x);
    const spanPct = Math.round((triSpan / totalSpanX) * 100);

    const triAlert = document.getElementById('triangleSizeAlert');
    if (triAlert) {
      if (spanPct >= 50) {
        triAlert.className = 'p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[9.5px] flex items-center justify-between';
        triAlert.innerHTML = `<span>Triangle Span: <b id="triangleSpanPct">${spanPct}% of grid</b></span><span class="font-bold">&check; ≥ 50% Rule Passed</span>`;
      } else {
        triAlert.className = 'p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[9.5px] flex items-center justify-between';
        triAlert.innerHTML = `<span>Triangle Span: <b id="triangleSpanPct">${spanPct}% of grid</b></span><span class="font-bold">&cross; Too Small (&lt; 50%)</span>`;
      }
    }
  }

  /**
   * Render Points Table (Fast in-place DOM sync to preserve typing focus!)
   */
  function renderPointsTable() {
    const tbody = document.getElementById('pointsTableBody');
    if (!tbody) return;

    const countLabel = document.getElementById('pointsCountLabel');
    const validCount = PedagogyEngine.getValidPoints(state.points).length;
    if (countLabel) countLabel.textContent = validCount.toString();

    // Fast in-place DOM update when row count matches, preserving active input focus
    const currentRows = tbody.querySelectorAll('tr');
    if (currentRows.length === state.points.length) {
      state.points.forEach((pt, index) => {
        const row = currentRows[index];
        const xInput = row.querySelector('input[data-axis="x"]');
        const yInput = row.querySelector('input[data-axis="y"]');
        const delBtn = row.querySelector('.deletePointBtn');

        const xVal = pt.x !== undefined && pt.x !== null ? pt.x.toString() : '';
        const yVal = pt.y !== undefined && pt.y !== null ? pt.y.toString() : '';

        if (xInput && document.activeElement !== xInput && xInput.value !== xVal) {
          xInput.value = xVal;
        }
        if (yInput && document.activeElement !== yInput && yInput.value !== yVal) {
          yInput.value = yVal;
        }
        if (delBtn) {
          delBtn.disabled = state.points.length <= 5;
        }
      });
      return;
    }

    // Otherwise (row added or removed): rebuild rows
    tbody.innerHTML = '';

    state.points.forEach((pt, index) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';

      const xVal = pt.x !== undefined && pt.x !== null ? pt.x : '';
      const yVal = pt.y !== undefined && pt.y !== null ? pt.y : '';

      tr.innerHTML = `
        <td class="py-1 px-1.5 text-center text-slate-500 font-mono text-[10px]">${index + 1}</td>
        <td class="py-1 px-1.5">
          <input type="number" step="any" placeholder="x" class="point-input font-mono" data-index="${index}" data-axis="x" value="${xVal}" />
        </td>
        <td class="py-1 px-1.5">
          <input type="number" step="any" placeholder="y" class="point-input font-mono" data-index="${index}" data-axis="y" value="${yVal}" />
        </td>
        <td class="py-1 px-1.5 text-center">
          <button class="deletePointBtn p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer" data-index="${index}" title="Remove Point" ${state.points.length <= 5 ? 'disabled' : ''}>
            <i data-lucide="trash-2" class="w-3 h-3"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();

    // Bind Point Table Inputs
    tbody.querySelectorAll('.point-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const axis = e.target.dataset.axis;
        const val = e.target.value.trim();
        state.points[idx][axis] = val === '' ? '' : parseFloat(val);
        updateAll();
      });
    });

    tbody.querySelectorAll('.deletePointBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (state.points.length > 5) {
          state.points.splice(idx, 1);
          updateAll();
        } else {
          state.points[idx] = { x: '', y: '' };
          updateAll();
        }
      });
    });
  }

  /**
   * Load Preset Dataset
   */
  function loadPreset(presetKey) {
    const preset = GraphPresets[presetKey];
    if (!preset) return;

    state.isCustomLine = false;
    state.title = preset.title;
    state.axisY = { ...preset.axisY };
    state.axisX = { ...preset.axisX };
    state.xOrigin = preset.xOrigin;
    state.yOrigin = preset.yOrigin;
    state.xScale = preset.xScalePerMajor;
    state.yScale = preset.yScalePerMajor;
    state.originCol = preset.originCol !== undefined ? preset.originCol : 1.5;
    state.originRow = preset.originRow !== undefined ? preset.originRow : 11.0;
    state.points = JSON.parse(JSON.stringify(preset.points));
    state.gradientTriangle = JSON.parse(JSON.stringify(preset.defaultGradientPoints));

    // Update Input UI Fields
    document.getElementById('inputGraphTitle').value = state.title;
    document.getElementById('inputYSymbol').value = state.axisY.symbol || '';
    document.getElementById('inputYUnit').value = state.axisY.unit || '';
    document.getElementById('inputXSymbol').value = state.axisX.symbol || '';
    document.getElementById('inputXUnit').value = state.axisX.unit || '';
    document.getElementById('inputXOrigin').value = state.xOrigin;
    document.getElementById('inputYOrigin').value = state.yOrigin;
    document.getElementById('selectXScalePerMajor').value = state.xScale.toString();
    document.getElementById('selectYScalePerMajor').value = state.yScale.toString();

    // Align ruler if best fit line exists
    state.bestFitLine = PedagogyEngine.calculateLinearRegression(state.points);
    if (state.bestFitLine) {
      rulerTool.alignToBestFitLine(state.bestFitLine, graphEngine);
    }

    updateAll();
    showToast(presetKey === 'custom' ? 'Blank graph sheet ready' : `Loaded Preset: ${preset.name}`);
  }

  /**
   * Auto-Optimize Gradient Triangle (Max Span &ge; 75%, avoiding raw data points)
   */
  function optimizeGradientTriangle() {
    const validCount = PedagogyEngine.getValidPoints(state.points).length;
    if (validCount < 5 || !state.bestFitLine) {
      showToast('Enter at least 5 data points first to plot best fit line and optimize triangle.');
      return;
    }
    const { slope, intercept } = state.bestFitLine;
    const xPrec = PedagogyEngine.calculateAxisPrecision(state.xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(state.yScale);

    const minX = state.xOrigin;
    const maxX = state.xOrigin + state.numMajorX * state.xScale;
    const span = maxX - minX;

    let p1X = minX + span * 0.08;
    let p2X = minX + span * 0.85;

    p1X = Math.round(p1X / xPrec.stepPrecision) * xPrec.stepPrecision;
    p2X = Math.round(p2X / xPrec.stepPrecision) * xPrec.stepPrecision;

    let p1Y = slope * p1X + intercept;
    let p2Y = slope * p2X + intercept;
    p1Y = Math.round(p1Y / yPrec.stepPrecision) * yPrec.stepPrecision;
    p2Y = Math.round(p2Y / yPrec.stepPrecision) * yPrec.stepPrecision;

    state.gradientTriangle = {
      p1: { x: p1X, y: p1Y },
      p2: { x: p2X, y: p2Y }
    };

    updateAll();
    showToast('Gradient Triangle optimized to ≥ 75% grid span!');
  }

  /**
   * Setup UI Event Listeners
   */
  function setupUIEventListeners() {
    // 1. Draggable Vertical Divider Resizer for Left Sidebar Width
    const panelResizer = document.getElementById('panelResizer');
    const leftSidebar = document.getElementById('leftSidebar');
    let isResizing = false;

    const onResizerStart = (clientX) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      panelResizer.classList.add('bg-cyan-500');
    };

    const onResizerMove = (clientX) => {
      if (!isResizing) return;
      const newWidth = Math.min(750, Math.max(260, clientX));
      leftSidebar.style.width = `${newWidth}px`;
      graphEngine.initCanvasSize();
    };

    const onResizerEnd = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        panelResizer.classList.remove('bg-cyan-500');
        graphEngine.initCanvasSize();
      }
    };

    panelResizer.addEventListener('mousedown', (e) => {
      onResizerStart(e.clientX);
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      onResizerMove(e.clientX);
    });

    window.addEventListener('mouseup', onResizerEnd);

    // Touch Support for Resizer
    panelResizer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onResizerStart(e.touches[0].clientX);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isResizing && e.touches.length > 0) {
        onResizerMove(e.touches[0].clientX);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchend', onResizerEnd);

    // 2. Quick Category Navigation Tabs
    document.querySelectorAll('.navTabBtn').forEach(tab => {
      tab.addEventListener('click', () => {
        const stepNum = parseInt(tab.dataset.step, 10) || 1;
        applyStepGlobal(stepNum - 1);
      });
    });

    // Preset Selector
    document.getElementById('presetSelect').addEventListener('change', (e) => {
      loadPreset(e.target.value);
    });

    // Title & Axis Inputs
    document.getElementById('inputGraphTitle').addEventListener('input', (e) => {
      state.title = e.target.value;
      updateAll();
    });
    document.getElementById('inputYSymbol').addEventListener('input', (e) => {
      state.axisY.symbol = e.target.value;
      updateAll();
    });
    document.getElementById('inputYUnit').addEventListener('input', (e) => {
      state.axisY.unit = e.target.value;
      updateAll();
    });
    document.getElementById('inputXSymbol').addEventListener('input', (e) => {
      state.axisX.symbol = e.target.value;
      updateAll();
    });
    document.getElementById('inputXUnit').addEventListener('input', (e) => {
      state.axisX.unit = e.target.value;
      updateAll();
    });

    // Scale Inputs
    document.getElementById('inputXOrigin').addEventListener('change', (e) => {
      state.xOrigin = parseFloat(e.target.value) || 0;
      updateAll();
    });
    document.getElementById('inputYOrigin').addEventListener('change', (e) => {
      state.yOrigin = parseFloat(e.target.value) || 0;
      updateAll();
    });
    document.getElementById('selectXScalePerMajor').addEventListener('change', (e) => {
      state.xScale = parseFloat(e.target.value);
      updateAll();
    });
    document.getElementById('selectYScalePerMajor').addEventListener('change', (e) => {
      state.yScale = parseFloat(e.target.value);
      updateAll();
    });

    // Checkboxes
    document.getElementById('showBestFitLineCheck').addEventListener('change', (e) => {
      state.showBestFitLine = e.target.checked;
      updateAll();
    });
    document.getElementById('showExtrapolationCheck').addEventListener('change', (e) => {
      state.showExtrapolation = e.target.checked;
      updateAll();
    });
    document.getElementById('showCentroidCheck').addEventListener('change', (e) => {
      state.showCentroid = e.target.checked;
      updateAll();
    });
    document.getElementById('showGradientTriangleCheck').addEventListener('change', (e) => {
      state.showGradientTriangle = e.target.checked;
      updateAll();
    });

    // Add Point
    document.getElementById('addPointBtn').addEventListener('click', () => {
      if (state.points.length >= 20) {
        showToast('Maximum of 20 points allowed.');
        return;
      }
      state.points.push({ x: '', y: '' });
      updateAll();
      showToast(`Added Row #${state.points.length}`);
    });

    // Add Realistic Scatter Noise
    document.getElementById('addScatterBtn').addEventListener('click', () => {
      const validCount = PedagogyEngine.getValidPoints(state.points).length;
      if (validCount < 5 || !state.bestFitLine) {
        showToast('Enter at least 5 data points first to calculate best fit line before adding scatter.');
        return;
      }
      const { slope, intercept } = state.bestFitLine;
      const yPrec = PedagogyEngine.calculateAxisPrecision(state.yScale);
      state.points.forEach((p) => {
        if (p.x !== '' && p.x !== null && !isNaN(Number(p.x))) {
          const noise = (Math.random() - 0.5) * yPrec.smallSquareValue * 1.5;
          p.y = parseFloat((slope * Number(p.x) + intercept + noise).toFixed(yPrec.decimalPlaces));
        }
      });
      updateAll();
      showToast('Applied experimental scatter to points!');
    });

    // Clear All Points
    const handleClearAllPoints = () => {
      state.points = [
        { x: '', y: '' },
        { x: '', y: '' },
        { x: '', y: '' },
        { x: '', y: '' },
        { x: '', y: '' }
      ];
      state.bestFitLine = null;
      state.gradientTriangle = {
        p1: { x: null, y: null },
        p2: { x: null, y: null }
      };
      updateAll();
      showToast('Cleared all plotted points!');
    };

    const clearBtn = document.getElementById('clearAllPointsBtn');
    if (clearBtn) clearBtn.addEventListener('click', handleClearAllPoints);

    const clearToolbarBtn = document.getElementById('clearPointsToolbarBtn');
    if (clearToolbarBtn) clearToolbarBtn.addEventListener('click', handleClearAllPoints);

    // Ruler Actions
    document.getElementById('toggleRulerBtn').addEventListener('click', () => {
      const isVisible = rulerTool.toggle();
      const txt = document.getElementById('rulerToggleText');
      if (txt) txt.textContent = `30 cm Ruler: ${isVisible ? 'ON' : 'OFF'}`;
    });

    // Animals Walking Behind Graph Paper Toggle Action
    const toggleAnimalsBtn = document.getElementById('toggleAnimalsBtn');
    if (toggleAnimalsBtn) {
      toggleAnimalsBtn.addEventListener('click', () => {
        const isEnabled = !graphEngine.showAnimals;
        graphEngine.setShowAnimals(isEnabled);
        const txt = document.getElementById('animalsToggleText');
        if (txt) txt.textContent = `Animals: ${isEnabled ? 'ON' : 'OFF'}`;
        toggleAnimalsBtn.className = isEnabled
          ? 'px-2.5 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm'
          : 'px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition';
        showToast(isEnabled ? '🐾 Animals ON (Cats, dogs, birds & rabbits walking behind paper)' : '🐾 Animals OFF');
      });
    }

    // Animal Drag End Feedback Hook
    graphEngine.onAnimalDragEndCallback = (animal) => {
      const inFrontStr = graphEngine.isAnimalInFront(animal) ? 'in front of the paper' : 'behind the paper';
      showToast(`🐾 Moved ${animal.name} (${animal.type})! Now walking ${inFrontStr}.`);
    };

    document.getElementById('snapRulerToBestFitBtn').addEventListener('click', () => {
      const validCount = PedagogyEngine.getValidPoints(state.points).length;
      if (validCount < 5) {
        showToast('Enter at least 5 data points first to calculate best fit line.');
        return;
      }
      state.isCustomLine = false;
      state.bestFitLine = PedagogyEngine.calculateLinearRegression(state.points);
      rulerTool.alignToBestFitLine(state.bestFitLine, graphEngine);
      updateAll();
      showToast('Reset & aligned 30 cm ruler to best fit line!');
    });

    document.getElementById('drawLineFromRulerBtn').addEventListener('click', () => {
      const rulerLine = rulerTool.getRulerLineData(graphEngine);
      state.isCustomLine = true;
      const xMean = (state.bestFitLine && state.bestFitLine.xMean !== undefined) ? state.bestFitLine.xMean : (state.xOrigin + 5 * state.xScale);
      state.bestFitLine = {
        slope: rulerLine.slope,
        intercept: rulerLine.intercept,
        r2: 1,
        xMean: xMean,
        yMean: rulerLine.slope * xMean + rulerLine.intercept
      };
      updateAll();
      showToast('Drawn Best Fit Line along 30 cm ruler edge! Drag line or handles to adjust.');
    });

    // Optimize Triangle
    document.getElementById('optimizeTriangleBtn').addEventListener('click', () => {
      optimizeGradientTriangle();
    });

    // Reset Triangle Points
    const clearTriBtn = document.getElementById('clearTriangleBtn');
    if (clearTriBtn) {
      clearTriBtn.addEventListener('click', () => {
        state.gradientTriangle = {
          p1: { x: null, y: null },
          p2: { x: null, y: null }
        };
        updateAll();
        showToast('Reset Gradient Points. Click any 2 points on the line to place DOTS!');
      });
    }

    // Gradient Coordinates Manual Change
    ['inputX1', 'inputY1', 'inputX2', 'inputY2'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        const x1Raw = document.getElementById('inputX1').value.trim();
        const y1Raw = document.getElementById('inputY1').value.trim();
        const x2Raw = document.getElementById('inputX2').value.trim();
        const y2Raw = document.getElementById('inputY2').value.trim();

        state.gradientTriangle = {
          p1: { x: x1Raw === '' ? null : parseFloat(x1Raw), y: y1Raw === '' ? null : parseFloat(y1Raw) },
          p2: { x: x2Raw === '' ? null : parseFloat(x2Raw), y: y2Raw === '' ? null : parseFloat(y2Raw) }
        };
        updateAll();
      });
    });

    // Canvas Toolbar Actions
    document.getElementById('zoomInBtn').addEventListener('click', () => {
      const rect = canvas.getBoundingClientRect();
      graphEngine.zoomAtPoint(rect.width / 2, rect.height / 2, 1.2);
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      const rect = canvas.getBoundingClientRect();
      graphEngine.zoomAtPoint(rect.width / 2, rect.height / 2, 0.8);
    });
    document.getElementById('centerGraphBtn').addEventListener('click', () => {
      graphEngine.centerView();
      showToast('Centered Graph on screen');
    });
    document.getElementById('togglePaperThemeBtn').addEventListener('click', () => {
      const theme = graphEngine.cycleTheme();
      const labelMap = {
        light_studio: 'Light Desk',
        light_blue: 'Blue Grid',
        exam_green: 'Green Paper',
        exam_cyan: 'Cyan Paper',
        exam_sepia: 'Sepia Paper'
      };
      const btnText = document.getElementById('themeBtnText');
      if (btnText) btnText.textContent = labelMap[theme] || 'Theme';
      showToast(`Switched Theme: ${labelMap[theme] || theme}`);
    });
    const lightToggleBtn = document.getElementById('toggleWorkbenchLightBtn');
    if (lightToggleBtn) {
      lightToggleBtn.addEventListener('click', () => {
        const isLight = graphEngine.currentTheme === 'light_studio' || graphEngine.currentTheme === 'light_blue';
        const targetTheme = isLight ? 'exam_green' : 'light_studio';
        graphEngine.setTheme(targetTheme);
        const lightText = document.getElementById('workbenchLightText');
        if (lightText) lightText.textContent = isLight ? 'Light Mode' : 'Dark Mode';
        const btnText = document.getElementById('themeBtnText');
        if (btnText) btnText.textContent = isLight ? 'Green Paper' : 'Light Desk';
        showToast(isLight ? 'Switched to Dark Workbench' : 'Switched to Clean Light Desk');
      });
    }
    document.getElementById('resetViewBtn').addEventListener('click', () => {
      graphEngine.setZoom(1.0);
      graphEngine.centerView();
      showToast('Reset View to 100%');
    });
    document.getElementById('exportGraphBtn').addEventListener('click', () => {
      graphEngine.exportImage();
      showToast('Exported Graph Image (PNG)');
    });
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    // Dedicated Visual Custom Scroll Slider
    setupCustomScrollSlider();

    // Guided Teaching Walkthrough Step Navigation (One-by-One Wizard)
    setupStepWorkflow();
  }

  /**
   * Dedicated Visual Custom Scroll Slider for Sidebar
   */
  function setupCustomScrollSlider() {
    const scrollContent = document.getElementById('sidebarScrollContent');
    const scrollSlider = document.getElementById('customScrollSlider');
    const scrollTrack = document.getElementById('customScrollTrack');
    const scrollThumb = document.getElementById('customScrollThumb');
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');

    if (!scrollContent || !scrollTrack || !scrollThumb) return;

    updateCustomScrollThumb = () => {
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const scrollTop = scrollContent.scrollTop;
      const trackHeight = scrollTrack.clientHeight;

      if (trackHeight <= 0) return;

      const maxScrollTop = scrollHeight - clientHeight;

      if (maxScrollTop <= 2) {
        // Content fits on screen: parked thumb indicator
        scrollThumb.style.height = '36px';
        scrollThumb.style.top = '0px';
        scrollThumb.style.opacity = '0.35';
        scrollThumb.style.cursor = 'default';
        return;
      }

      // Content overflows: active scrollbar thumb
      scrollThumb.style.opacity = '1';
      scrollThumb.style.cursor = 'grab';
      const thumbHeight = Math.max(36, Math.min(trackHeight * 0.75, (clientHeight / scrollHeight) * trackHeight));
      const maxThumbTop = trackHeight - thumbHeight;
      const thumbTop = maxThumbTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

      scrollThumb.style.height = `${thumbHeight}px`;
      scrollThumb.style.top = `${Math.max(0, Math.min(maxThumbTop, thumbTop))}px`;
    };

    scrollContent.addEventListener('scroll', updateCustomScrollThumb);
    window.addEventListener('resize', updateCustomScrollThumb);

    // Forward mouse wheel over the scroll slider track
    if (scrollSlider) {
      scrollSlider.addEventListener('wheel', (e) => {
        scrollContent.scrollTop += e.deltaY;
        e.preventDefault();
      }, { passive: false });
    }

    // Click arrows
    if (scrollUpBtn) {
      scrollUpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollContent.scrollBy({ top: -100, behavior: 'smooth' });
      });
    }
    if (scrollDownBtn) {
      scrollDownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollContent.scrollBy({ top: 100, behavior: 'smooth' });
      });
    }

    // Click on track to jump directly
    scrollTrack.addEventListener('pointerdown', (e) => {
      if (e.target === scrollThumb || scrollThumb.contains(e.target)) return;
      const rect = scrollTrack.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackHeight = rect.height;
      const thumbHeight = scrollThumb.offsetHeight || 36;
      const maxThumbTop = trackHeight - thumbHeight;
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;

      if (trackHeight > 0 && maxScrollTop > 0) {
        const targetThumbTop = Math.max(0, Math.min(maxThumbTop, clickY - thumbHeight / 2));
        const targetScroll = (targetThumbTop / maxThumbTop) * maxScrollTop;
        scrollContent.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    });

    // Drag thumb with Pointer Events & Pointer Capture
    let isDraggingThumb = false;
    let startY = 0;
    let startScrollTop = 0;

    scrollThumb.addEventListener('pointerdown', (e) => {
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      if (scrollHeight <= clientHeight + 2) return;

      isDraggingThumb = true;
      startY = e.clientY;
      startScrollTop = scrollContent.scrollTop;
      scrollThumb.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      if (scrollThumb.setPointerCapture) {
        try { scrollThumb.setPointerCapture(e.pointerId); } catch (_) {}
      }
      e.preventDefault();
      e.stopPropagation();
    });

    scrollThumb.addEventListener('pointermove', (e) => {
      if (!isDraggingThumb) return;
      const deltaY = e.clientY - startY;
      const trackHeight = scrollTrack.clientHeight;
      const thumbHeight = scrollThumb.offsetHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;

      if (maxThumbTop > 0 && maxScrollTop > 0) {
        const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
        scrollContent.scrollTop = startScrollTop + scrollDelta;
      }
    });

    const onPointerRelease = (e) => {
      if (isDraggingThumb) {
        isDraggingThumb = false;
        document.body.style.userSelect = '';
        scrollThumb.style.cursor = 'grab';
        if (scrollThumb.releasePointerCapture && e.pointerId) {
          try { scrollThumb.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      }
    };

    scrollThumb.addEventListener('pointerup', onPointerRelease);
    scrollThumb.addEventListener('pointercancel', onPointerRelease);

    // Window fallbacks for mouse dragging
    window.addEventListener('mousemove', (e) => {
      if (!isDraggingThumb) return;
      const deltaY = e.clientY - startY;
      const trackHeight = scrollTrack.clientHeight;
      const thumbHeight = scrollThumb.offsetHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;

      if (maxThumbTop > 0 && maxScrollTop > 0) {
        const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
        scrollContent.scrollTop = startScrollTop + scrollDelta;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingThumb) {
        isDraggingThumb = false;
        document.body.style.userSelect = '';
        scrollThumb.style.cursor = 'grab';
      }
    });

    setTimeout(updateCustomScrollThumb, 80);
  }

  /**
   * Step-by-Step Pedagogical Workflow Manager (6 Sequential Single Steps)
   */
  function setupStepWorkflow() {
    const steps = [
      {
        num: 1,
        title: "Title & Solidus Notation",
        pageId: "stepPage1",
        hint: "Step 1: Enter your graph title and state axes in Solidus notation: Quantity / Unit."
      },
      {
        num: 2,
        title: "Scale & D/20 Precision",
        pageId: "stepPage2",
        hint: "Step 2: Choose convenient scales (multiples of 1, 2, 5) ensuring points cover ≥ 75% of paper."
      },
      {
        num: 3,
        title: "Plot Data Points (5-20 pts)",
        pageId: "stepPage3",
        hint: "Step 3: Enter at least 5 experimental points in the table to plot sharp crosses (×)."
      },
      {
        num: 4,
        title: "30 cm Ruler & Best Fit Line",
        pageId: "stepPage4",
        hint: "Step 4: Use the 30 cm ruler to balance points evenly above and below the line of best fit."
      },
      {
        num: 5,
        title: "Gradient Triangle & Math",
        pageId: "stepPage5",
        hint: "Step 5: Draw a large dotted gradient triangle (≥ 50% grid span). Read points to 1/2 smallest division!"
      },
      {
        num: 6,
        title: "Review SLAP Scorecard",
        pageId: "stepPage6",
        hint: "Step 6: Review full SLAP criteria (Scale, Line, Axis, Points) and final experiment evaluation!"
      }
    ];

    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const nextBtnLabel = document.getElementById('nextBtnLabel');
    const footerPrevBtn = document.getElementById('footerPrevBtn');
    const footerNextBtn = document.getElementById('footerNextBtn');
    const footerNextLabel = document.getElementById('footerNextLabel');
    const badge = document.getElementById('currentStepBadge');
    const title = document.getElementById('currentStepTitle');
    const stepNum = document.getElementById('stepNumber');
    const banner = document.getElementById('teachingBannerText');
    const stepDots = document.querySelectorAll('.stepDotBtn');

    function applyStep(idx) {
      if (idx < 0) idx = 0;
      if (idx >= steps.length) idx = steps.length - 1;

      state.currentStep = idx + 1;
      const step = steps[idx];

      if (badge) badge.textContent = step.num;
      if (title) title.textContent = step.title;
      if (stepNum) stepNum.textContent = step.num;
      if (banner) banner.innerHTML = `<strong>Step ${step.num}:</strong> ${step.hint}`;

      const isFirst = idx === 0;
      const isLast = idx === steps.length - 1;

      if (prevBtn) prevBtn.disabled = isFirst;
      if (footerPrevBtn) footerPrevBtn.disabled = isFirst;

      if (nextBtn) nextBtn.disabled = isLast;
      if (footerNextBtn) footerNextBtn.disabled = isLast;

      if (nextBtnLabel) nextBtnLabel.textContent = isLast ? 'Completed' : 'Next Step';
      if (footerNextLabel) footerNextLabel.textContent = isLast ? 'Completed' : 'Next';

      // Update Top Nav Tabs
      document.querySelectorAll('.navTabBtn').forEach((tab, tIdx) => {
        if (tIdx === idx) {
          tab.className = 'navTabBtn px-2 py-1 rounded-md bg-cyan-600 text-white font-medium whitespace-nowrap flex items-center gap-1 transition shadow-sm';
        } else {
          tab.className = 'navTabBtn px-2 py-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-medium whitespace-nowrap flex items-center gap-1 transition';
        }
      });

      // Update Step Dots
      stepDots.forEach(dot => {
        const dotStep = parseInt(dot.dataset.step, 10);
        if (dotStep === state.currentStep) {
          dot.className = 'stepDotBtn w-5 h-5 rounded-full bg-cyan-500 text-white font-mono text-[10px] font-bold flex items-center justify-center transition ring-2 ring-cyan-400/60 shadow-sm';
        } else if (dotStep < state.currentStep) {
          dot.className = 'stepDotBtn w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center transition border border-cyan-800/60';
        } else {
          dot.className = 'stepDotBtn w-5 h-5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[10px] font-bold flex items-center justify-center transition';
        }
      });

      // Update Top Numbered Step Buttons [1] to [6]
      document.querySelectorAll('.topStepNumBtn').forEach(numBtn => {
        const btnStep = parseInt(numBtn.dataset.step, 10);
        if (btnStep === state.currentStep) {
          numBtn.className = 'topStepNumBtn w-6 h-6 rounded-md bg-cyan-600 text-white font-mono text-xs font-bold flex items-center justify-center transition shadow-sm ring-2 ring-cyan-400 scale-105 cursor-pointer';
        } else {
          numBtn.className = 'topStepNumBtn w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center transition hover:bg-slate-700 hover:text-white cursor-pointer border border-slate-700';
        }
      });

      // Show ONLY current step page (One-Step-At-A-Time Wizard Mode)
      document.querySelectorAll('.step-page').forEach(page => {
        if (page.id === step.pageId) {
          page.classList.remove('hidden');
        } else {
          page.classList.add('hidden');
        }
      });

      // Reset scroll position to top on step switch
      const scrollContent = document.getElementById('sidebarScrollContent');
      if (scrollContent) {
        scrollContent.scrollTop = 0;
      }
      setTimeout(updateCustomScrollThumb, 30);
      setTimeout(updateCustomScrollThumb, 120);
    }

    // Connect to global window hooks
    window._applyStepGlobal = (idx) => applyStep(idx);
    window._applyNextStepGlobal = () => {
      if (state.currentStep < steps.length) {
        applyStep(state.currentStep);
      }
    };
    window._applyPrevStepGlobal = () => {
      if (state.currentStep > 1) {
        applyStep(state.currentStep - 2);
      }
    };

    // Global Event Delegation for ALL Navigation Controls
    document.addEventListener('click', (e) => {
      // 1. Next Buttons
      const nextTarget = e.target.closest('#nextStepBtn') || e.target.closest('#footerNextBtn');
      if (nextTarget && !nextTarget.disabled) {
        window._applyNextStepGlobal();
        return;
      }

      // 2. Prev Buttons
      const prevTarget = e.target.closest('#prevStepBtn') || e.target.closest('#footerPrevBtn');
      if (prevTarget && !prevTarget.disabled) {
        window._applyPrevStepGlobal();
        return;
      }

      // 3. Top Numbered Step Buttons [1] to [6]
      const numTarget = e.target.closest('.topStepNumBtn');
      if (numTarget) {
        const stepNum = parseInt(numTarget.dataset.step, 10);
        if (!isNaN(stepNum)) {
          applyStep(stepNum - 1);
        }
        return;
      }

      // 4. Category Nav Tabs
      const tabTarget = e.target.closest('.navTabBtn');
      if (tabTarget) {
        const stepNum = parseInt(tabTarget.dataset.step, 10);
        if (!isNaN(stepNum)) {
          applyStep(stepNum - 1);
        }
        return;
      }

      // 5. In-section Proceed Buttons
      const proceedTarget = e.target.closest('.stepProceedBtn');
      if (proceedTarget) {
        const nextStepNum = parseInt(proceedTarget.dataset.next, 10);
        if (!isNaN(nextStepNum)) {
          applyStep(nextStepNum - 1);
        }
        return;
      }

      // 6. Step Dots
      const dotTarget = e.target.closest('.stepDotBtn');
      if (dotTarget) {
        const dotStep = parseInt(dotTarget.dataset.step, 10);
        if (!isNaN(dotStep)) {
          applyStep(dotStep - 1);
        }
        return;
      }
    });

    // Mode Buttons
    document.getElementById('modeWalkthroughBtn').addEventListener('click', () => {
      state.mode = 'walkthrough';
      document.getElementById('modeWalkthroughBtn').className = 'px-2.5 py-1 rounded-md bg-cyan-600 text-white shadow-sm flex items-center gap-1.5 transition';
      document.getElementById('modeSandboxBtn').className = 'px-2.5 py-1 rounded-md text-slate-300 hover:text-white transition flex items-center gap-1.5';
      document.getElementById('stepProgressBar').style.display = 'flex';
      document.getElementById('stepFooterNav').style.display = 'flex';
      document.getElementById('teachingBanner').style.display = 'flex';
      applyStep(0);
      showToast('Switched to Step-by-Step Teaching Guide');
    });

    document.getElementById('modeSandboxBtn').addEventListener('click', () => {
      state.mode = 'sandbox';
      document.getElementById('modeSandboxBtn').className = 'px-2.5 py-1 rounded-md bg-cyan-600 text-white shadow-sm flex items-center gap-1.5 transition';
      document.getElementById('modeWalkthroughBtn').className = 'px-2.5 py-1 rounded-md text-slate-300 hover:text-white transition flex items-center gap-1.5';
      document.getElementById('stepProgressBar').style.display = 'none';
      document.getElementById('stepFooterNav').style.display = 'none';
      document.getElementById('teachingBanner').style.display = 'none';
      document.querySelectorAll('.step-page').forEach(page => {
        page.classList.remove('hidden');
      });
      setTimeout(updateCustomScrollThumb, 50);
      showToast('Entered Free Sandbox Mode (All Steps Visible)');
    });

    applyStep(0);
  }

  /**
   * Helper: Show Toast notification
   */
  function showToast(message) {
    let toast = document.getElementById('toastNotification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastNotification';
      toast.className = 'fixed bottom-6 right-6 z-50 bg-slate-950/90 backdrop-blur-md border border-cyan-500/50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-4';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i data-lucide="info" class="w-4 h-4 text-cyan-400"></i> <span>${message}</span>`;
    if (window.lucide) window.lucide.createIcons();

    toast.classList.remove('opacity-0', 'translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-4');
    }, 2800);
  }

  /**
   * Confetti Celebration for full SLAP mastery
   */
  function triggerConfettiCelebration() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        window.confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        window.confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    } else {
      launchFallbackConfetti();
    }
  }

  function launchFallbackConfetti() {
    const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.style.position = 'absolute';
      piece.style.width = `${Math.random() * 8 + 6}px`;
      piece.style.height = `${Math.random() * 8 + 6}px`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.top = '-20px';
      piece.style.opacity = '0.9';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.transition = `transform ${Math.random() * 2 + 1.5}s ease-out, opacity 2s ease-out`;

      container.appendChild(piece);

      setTimeout(() => {
        piece.style.transform = `translate(${Math.random() * 100 - 50}px, ${window.innerHeight + 50}px) rotate(${Math.random() * 720}deg)`;
        piece.style.opacity = '0';
      }, 20);
    }

    setTimeout(() => {
      container.remove();
    }, 3500);
  }
});
