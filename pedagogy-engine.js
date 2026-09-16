/**
 * pedagogy-engine.js
 * Implements Singapore Practical GCE O & A Level Graphing Standards:
 * 1. SLAP Framework (Scale, Line, Axis, Points)
 * 2. Half Smallest Division Precision Rule (D/20)
 * 3. Gradient Triangle Validation (>= 50% / 75% rule)
 * 4. Coordinate Read-off Validation & Significant Figures Propagation
 */

const PedagogyEngine = (function () {
  'use strict';

  /**
   * Determine decimal places and precision from major interval D
   * 1 big square = D
   * 1 small square = d = D / 10
   * 1/2 smallest division = x = D / 20
   */
  function calculateAxisPrecision(D) {
    if (!D || isNaN(D) || D <= 0) D = 1.0;
    const d = D / 10;
    const halfSmallest = D / 20;

    let halfSmallest1sf = roundTo1SigFig(halfSmallest);
    let decPlaces = getDecimalPlaces(halfSmallest1sf);

    return {
      majorInterval: D,
      smallSquareValue: d,
      halfSmallestValue: halfSmallest,
      halfSmallest1sf: halfSmallest1sf,
      decimalPlaces: decPlaces,
      stepPrecision: halfSmallest
    };
  }

  /**
   * Round number to 1 significant figure
   */
  function roundTo1SigFig(num) {
    if (num === 0) return 0;
    const d = Math.ceil(Math.log10(num < 0 ? -num : num));
    const power = 1 - d;
    const magnitude = Math.pow(10, power);
    const shifted = Math.round(num * magnitude);
    return shifted / magnitude;
  }

  /**
   * Count decimal places of a number
   */
  function getDecimalPlaces(num) {
    if (Number.isInteger(num)) return 0;
    const str = num.toString();
    if (str.includes('e-')) {
      const parts = str.split('e-');
      return parseInt(parts[1], 10);
    }
    const dotIdx = str.indexOf('.');
    return dotIdx === -1 ? 0 : str.length - dotIdx - 1;
  }

  /**
   * Format number to specified decimal places with correct padding
   */
  function formatToDecPlaces(val, decPlaces) {
    if (val === null || val === undefined || isNaN(val)) return '';
    if (decPlaces <= 0) {
      return Math.round(val).toString();
    }
    return Number(val).toFixed(decPlaces);
  }

  /**
   * Count significant figures of a number string (e.g., "0.0307" -> 3, "5.00" -> 3, "0.108" -> 3)
   */
  function countSigFigs(str) {
    let s = str.toString().trim().replace(/^-/, '');
    if (s.includes('e') || s.includes('E')) {
      s = s.split(/[eE]/)[0];
    }
    s = s.replace(/^0+(\.0*)?/, '');
    if (!s) return 1;
    s = s.replace('.', '');
    return s.length;
  }

  /**
   * Format number to N significant figures
   */
  function formatToSigFigs(num, sf) {
    if (num === 0) return (0).toFixed(Math.max(0, sf - 1));
    return Number(num).toPrecision(sf);
  }

  /**
   * Extract only valid numerical points from points array
   */
  function getValidPoints(points) {
    if (!Array.isArray(points)) return [];
    return points
      .filter(p => p && p.x !== '' && p.y !== '' && p.x !== null && p.y !== null && !isNaN(Number(p.x)) && !isNaN(Number(p.y)))
      .map(p => ({ x: Number(p.x), y: Number(p.y) }));
  }

  /**
   * Evaluate SLAP metrics based on current graph state
   */
  function evaluateSLAP(state) {
    const {
      points,
      xScale,
      yScale,
      numMajorX,
      numMajorY,
      bestFitLine,
      gradientTriangle,
      axisX,
      axisY
    } = state;

    const validPoints = getValidPoints(points);

    // 1. [S] Scale Evaluation
    let xCoverage = 0;
    let yCoverage = 0;
    const totalSpanX = (numMajorX || 10) * xScale;
    const totalSpanY = (numMajorY || 14) * yScale;

    if (validPoints.length >= 2) {
      const xVals = validPoints.map(p => p.x);
      const yVals = validPoints.map(p => p.y);
      const minX = Math.min(...xVals);
      const maxX = Math.max(...xVals);
      const minY = Math.min(...yVals);
      const maxY = Math.max(...yVals);
      const dataSpanX = maxX - minX;
      const dataSpanY = maxY - minY;

      xCoverage = totalSpanX > 0 ? (dataSpanX / totalSpanX) * 100 : 0;
      yCoverage = totalSpanY > 0 ? (dataSpanY / totalSpanY) * 100 : 0;
    }

    const isConvenientScaleX = isStandardMultiple(xScale);
    const isConvenientScaleY = isStandardMultiple(yScale);

    const scalePassed = validPoints.length >= 5 && xCoverage >= 50 && yCoverage >= 50 && isConvenientScaleX && isConvenientScaleY;
    const scaleExemplary = validPoints.length >= 5 && xCoverage >= 75 && yCoverage >= 75 && scalePassed;

    // 2. [L] Line Evaluation
    let ptsAbove = 0;
    let ptsBelow = 0;
    let ptsOn = 0;
    let isBalanced = false;

    if (bestFitLine && validPoints.length >= 5) {
      const yPrec = calculateAxisPrecision(yScale);
      const tolerance = yPrec.smallSquareValue * 0.6;

      validPoints.forEach(pt => {
        const lineY = bestFitLine.slope * pt.x + bestFitLine.intercept;
        const diff = pt.y - lineY;
        if (Math.abs(diff) <= tolerance) {
          ptsOn++;
        } else if (diff > 0) {
          ptsAbove++;
        } else {
          ptsBelow++;
        }
      });
      isBalanced = Math.abs(ptsAbove - ptsBelow) <= Math.max(1, Math.floor(validPoints.length * 0.25));
    }

    // 3. [A] Axis Evaluation
    const hasSolidusX = axisX && axisX.symbol ? true : false;
    const hasSolidusY = axisY && axisY.unit || axisY && axisY.symbol ? true : false;
    const axisPassed = hasSolidusX && hasSolidusY;

    // 4. [P] Points Evaluation
    const pointsCountValid = validPoints.length >= 5 && validPoints.length <= 20;

    // 5. [G] Gradient Triangle Evaluation
    let triangleSpanPct = 0;
    let trianglePassed = false;
    let pointsOnLineNotData = true;

    if (gradientTriangle && gradientTriangle.p1 && gradientTriangle.p2 && gradientTriangle.p1.x !== null && gradientTriangle.p2.x !== null) {
      const p1 = gradientTriangle.p1;
      const p2 = gradientTriangle.p2;
      const triSpanX = Math.abs(p2.x - p1.x);
      triangleSpanPct = totalSpanX > 0 ? (triSpanX / totalSpanX) * 100 : 0;
      trianglePassed = triangleSpanPct >= 50;

      const isTooCloseToData = validPoints.some(pt => {
        const d1 = Math.hypot(pt.x - p1.x, pt.y - p1.y);
        const d2 = Math.hypot(pt.x - p2.x, pt.y - p2.y);
        return d1 < 0.0001 || d2 < 0.0001;
      });
      pointsOnLineNotData = !isTooCloseToData;
    }

    return {
      scale: {
        xCoverage,
        yCoverage,
        isConvenientScaleX,
        isConvenientScaleY,
        passed: scalePassed,
        exemplary: scaleExemplary
      },
      line: {
        ptsAbove,
        ptsBelow,
        ptsOn,
        isBalanced,
        passed: isBalanced
      },
      axis: {
        hasSolidusX,
        hasSolidusY,
        passed: axisPassed
      },
      points: {
        count: validPoints.length,
        passed: pointsCountValid
      },
      gradient: {
        triangleSpanPct,
        trianglePassed,
        pointsOnLineNotData,
        passed: trianglePassed && pointsOnLineNotData
      }
    };
  }

  /**
   * Check if value is standard 1, 2, 5 * 10^k scale
   */
  function isStandardMultiple(val) {
    if (val <= 0) return false;
    const logVal = Math.log10(val);
    const base = Math.pow(10, logVal - Math.floor(logVal));
    const roundedBase = Math.round(base * 100) / 100;
    return (
      Math.abs(roundedBase - 1.0) < 0.01 ||
      Math.abs(roundedBase - 2.0) < 0.01 ||
      Math.abs(roundedBase - 5.0) < 0.01 ||
      Math.abs(roundedBase - 10.0) < 0.01
    );
  }

  /**
   * Calculate Best Fit Line via Linear Regression
   */
  function calculateLinearRegression(points) {
    const validPoints = getValidPoints(points);
    const n = validPoints.length;
    if (n < 5) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      const x = validPoints[i].x;
      const y = validPoints[i].y;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const xMean = sumX / n;
    const yMean = sumY / n;

    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-12) {
      return { slope: 0, intercept: yMean, r2: 0, xMean, yMean };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const totalSS = sumY2 - (sumY * sumY) / n;
    const residualSS = validPoints.reduce((acc, p) => acc + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
    const r2 = totalSS > 0 ? 1 - residualSS / totalSS : 1;

    return { slope, intercept, r2, xMean, yMean };
  }

  /**
   * Full Step-by-Step Gradient Working Formula Builder with LaTeX output
   */
  function generateGradientMathExplanation(p1, p2, xPrec, yPrec, unitY, unitX) {
    if (!p1 || !p2 || p1.x === null || p2.x === null || isNaN(p1.x) || isNaN(p2.x)) {
      return {
        x1Str: '', y1Str: '', x2Str: '', y2Str: '',
        deltaY: 0, deltaX: 0,
        deltaYStr: '', deltaXStr: '',
        rawGradient: 0,
        chosenSF: 3,
        finalGradientStr: '—',
        gradientUnit: '',
        latexFormula: 'm = \\frac{\\Delta y}{\\Delta x} \\quad \\text{(Enter coordinates to calculate)}'
      };
    }

    const x1Str = formatToDecPlaces(p1.x, xPrec.decimalPlaces);
    const y1Str = formatToDecPlaces(p1.y, yPrec.decimalPlaces);
    const x2Str = formatToDecPlaces(p2.x, xPrec.decimalPlaces);
    const y2Str = formatToDecPlaces(p2.y, yPrec.decimalPlaces);

    const deltaY = p2.y - p1.y;
    const deltaX = p2.x - p1.x;

    const deltaYStr = formatToDecPlaces(deltaY, yPrec.decimalPlaces);
    const deltaXStr = formatToDecPlaces(deltaX, xPrec.decimalPlaces);

    const rawGradient = deltaX !== 0 ? deltaY / deltaX : 0;

    const sfDeltaY = countSigFigs(deltaYStr);
    const sfDeltaX = countSigFigs(deltaXStr);
    const chosenSF = Math.min(Math.max(sfDeltaY, sfDeltaX), 3);
    const finalGradientStr = formatToSigFigs(rawGradient, chosenSF);

    let gradientUnit = '';
    if (unitY && unitX) {
      gradientUnit = `${unitY} / (${unitX})`;
    } else if (unitY) {
      gradientUnit = unitY;
    } else if (unitX) {
      gradientUnit = `(${unitX})^{-1}`;
    }

    const latexFormula = `\\begin{aligned}
m &= \\frac{y_2 - y_1}{x_2 - x_1} \\\\[6pt]
&= \\frac{${y2Str} - (${y1Str})}{${x2Str} - ${x1Str}} \\\\[6pt]
&= \\frac{${deltaYStr}}{${deltaXStr}} \\\\[6pt]
&= ${finalGradientStr}
\\end{aligned}`;

    return {
      x1Str, y1Str, x2Str, y2Str,
      deltaY, deltaX,
      deltaYStr, deltaXStr,
      rawGradient,
      chosenSF,
      finalGradientStr,
      gradientUnit,
      latexFormula
    };
  }

  return {
    calculateAxisPrecision,
    formatToDecPlaces,
    countSigFigs,
    formatToSigFigs,
    getValidPoints,
    evaluateSLAP,
    calculateLinearRegression,
    generateGradientMathExplanation,
    isStandardMultiple
  };
})();
