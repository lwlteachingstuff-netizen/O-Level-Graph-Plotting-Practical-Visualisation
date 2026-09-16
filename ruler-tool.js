/**
 * ruler-tool.js
 * Virtual 30 cm Acrylic Ruler Tool with Dragging, Dual-End Rotation, and Alignment Actions
 */

class RulerTool {
  constructor(rulerElement, ticksContainerElement, graphEngine) {
    this.element = rulerElement;
    this.ticksContainer = ticksContainerElement;
    this.graphEngine = graphEngine;

    // Ruler State
    this.x = 280;      // Center X position in container
    this.y = 360;      // Center Y position in container
    this.angle = -32.5; // Angle in degrees
    this.lengthCm = 30; // 30 cm ruler
    this.pxPerCm = 24;  // Scale factor (30cm * 24px = 720px width)
    this.width = this.lengthCm * this.pxPerCm;
    this.height = 80;   // Height of ruler in pixels
    this.isVisible = true;

    // Drag / Rotate state
    this.isDragging = false;
    this.isRotating = false;
    this.rotatePivot = 'center'; // 'center', 'left', 'right'
    this.dragStart = { x: 0, y: 0 };
    this.initialAngle = 0;

    this.onTransformChange = null;

    this.buildRulerSVG();
    this.setupInteractions();
    this.updateTransform();
  }

  /**
   * Build realistic SVG scale with 300 millimeter tick marks and 30 numbered centimeter marks
   */
  buildRulerSVG() {
    const totalMm = this.lengthCm * 10;
    const pxPerMm = this.pxPerCm / 10;
    const w = this.width;
    const h = this.height;

    let svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;

    // Millimeter & Centimeter Ticks along top edge (Drawing edge)
    for (let mm = 0; mm <= totalMm; mm++) {
      const x = mm * pxPerMm;
      let tickHeight = 7;
      let strokeWidth = 0.75;
      let strokeColor = 'rgba(15, 23, 42, 0.6)';

      if (mm % 10 === 0) {
        // Centimeter mark
        tickHeight = 22;
        strokeWidth = 1.6;
        strokeColor = 'rgba(15, 23, 42, 0.95)';
        const cm = mm / 10;
        svg += `<text x="${x}" y="${tickHeight + 12}" font-family="Fira Code, monospace" font-size="10" font-weight="700" fill="#0f172a" text-anchor="middle">${cm}</text>`;
      } else if (mm % 5 === 0) {
        // 5mm mark
        tickHeight = 14;
        strokeWidth = 1.1;
        strokeColor = 'rgba(15, 23, 42, 0.8)';
      }

      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${tickHeight}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
    }

    // Ruler Branding / Label in center
    svg += `<text x="${w / 2}" y="${h - 18}" font-family="Inter, sans-serif" font-size="10" font-weight="800" fill="rgba(30, 41, 59, 0.7)" text-anchor="middle" letter-spacing="1">30 cm SCIENCE PRECISION RULER</text>`;
    svg += `<text x="${w / 2}" y="${h - 6}" font-family="Inter, sans-serif" font-size="8" font-weight="500" fill="rgba(71, 85, 105, 0.6)" text-anchor="middle">1 division = 1 mm</text>`;

    svg += `</svg>`;
    this.ticksContainer.innerHTML = svg;
  }

  setupInteractions() {
    const handleL = document.getElementById('rulerRotHandleL');
    const handleR = document.getElementById('rulerRotHandleR');

    // Drag Ruler Body (Center move)
    this.element.addEventListener('mousedown', (e) => {
      if (e.target.closest('#rulerRotHandleL') || e.target.closest('#rulerRotHandleR')) return;
      this.isDragging = true;
      this.dragStart = {
        x: e.clientX - this.x,
        y: e.clientY - this.y
      };
      e.stopPropagation();
    });

    // Rotate from Left handle (0cm)
    handleL.addEventListener('mousedown', (e) => {
      this.startRotate(e, 'left');
      e.stopPropagation();
    });

    // Rotate from Right handle (30cm)
    handleR.addEventListener('mousedown', (e) => {
      this.startRotate(e, 'right');
      e.stopPropagation();
    });

    // Global Mouse Move
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.x = e.clientX - this.dragStart.x;
        this.y = e.clientY - this.dragStart.y;
        this.updateTransform();
      } else if (this.isRotating) {
        const rect = this.element.getBoundingClientRect();
        const pivotX = this.rotatePivot === 'left' ? rect.left : (this.rotatePivot === 'right' ? rect.right : this.x);
        const pivotY = this.rotatePivot === 'left' ? rect.top : (this.rotatePivot === 'right' ? rect.bottom : this.y);

        const rad = Math.atan2(e.clientY - pivotY, e.clientX - pivotX);
        let deg = rad * (180 / Math.PI);
        this.angle = deg;
        this.updateTransform();
      }
    });

    // Global Mouse Up
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isRotating = false;
    });
  }

  startRotate(e, pivot) {
    this.isRotating = true;
    this.rotatePivot = pivot;
    this.initialAngle = this.angle;
  }

  updateTransform() {
    this.element.style.transform = `translate(${this.x - this.width / 2}px, ${this.y - this.height / 2}px) rotate(${this.angle}deg)`;
    if (this.onTransformChange) {
      this.onTransformChange(this.angle, this.x, this.y);
    }
  }

  /**
   * Automatically align ruler along the computed Best Fit Line
   */
  alignToBestFitLine(bestFitLine, graphEngine) {
    if (!bestFitLine) return;
    const { slope, intercept, xMean, yMean } = bestFitLine;

    // Convert centroid to screen coordinates
    const centroidScreen = graphEngine.dataToScreen(xMean, yMean);

    // Calculate angle in screen coordinates
    const p1Screen = graphEngine.dataToScreen(xMean - 1, (xMean - 1) * slope + intercept);
    const p2Screen = graphEngine.dataToScreen(xMean + 1, (xMean + 1) * slope + intercept);

    const deltaScreenX = p2Screen.x - p1Screen.x;
    const deltaScreenY = p2Screen.y - p1Screen.y;

    const angleDeg = Math.atan2(deltaScreenY, deltaScreenX) * (180 / Math.PI);

    // Set position and angle
    this.x = centroidScreen.x;
    this.y = centroidScreen.y + 40; // Offset slightly so top edge lines up with best-fit line
    this.angle = angleDeg;
    this.updateTransform();
  }

  /**
   * Convert Ruler's Top Drawing Edge to a linear equation in Graph Data Space
   */
  getRulerLineData(graphEngine) {
    // Top edge left point (0cm) and right point (30cm) in screen space
    const rad = this.angle * (Math.PI / 180);
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Top left of ruler: (-halfW, -halfH) rotated
    const screenX1 = this.x - halfW * Math.cos(rad) - (-halfH) * Math.sin(rad);
    const screenY1 = this.y - halfW * Math.sin(rad) + (-halfH) * Math.cos(rad);

    // Top right of ruler: (+halfW, -halfH) rotated
    const screenX2 = this.x + halfW * Math.cos(rad) - (-halfH) * Math.sin(rad);
    const screenY2 = this.y + halfW * Math.sin(rad) + (-halfH) * Math.cos(rad);

    // Convert screen points to data coordinates
    const dataP1 = graphEngine.screenToData(screenX1, screenY1);
    const dataP2 = graphEngine.screenToData(screenX2, screenY2);

    const deltaX = dataP2.x - dataP1.x;
    const deltaY = dataP2.y - dataP1.y;

    const slope = deltaX !== 0 ? deltaY / deltaX : 0;
    const intercept = dataP1.y - slope * dataP1.x;

    return { slope, intercept, p1: dataP1, p2: dataP2 };
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.element.style.display = this.isVisible ? 'block' : 'none';
    return this.isVisible;
  }
}
