/**
 * graph-engine.js
 * High-DPI Authentic Science Graph Paper Renderer with Hand-Drawn / Pencil Styling
 */

class GraphEngine {
  constructor(canvasElement, containerElement) {
    this.canvas = canvasElement;
    this.container = containerElement;
    this.ctx = canvasElement.getContext('2d');

    // Graph Paper Grid Configuration
    // Standard exam paper: 20mm major squares with 10x10 (2mm) minor subdivisions
    this.basePixelsPerMajor = 50; // Sized so 10x13 grid fits standard viewports perfectly at 100%
    this.minorDivisions = 10;     // 10 small squares per big square (2mm each)

    // Paper Dimensions (Full Grid Page: 10 x 13 major grid boxes)
    this.gridMajorCols = 10;
    this.gridMajorRows = 13;

    // Viewport transform (Pan & Zoom)
    this.zoom = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 3.0;
    this.panX = 40;
    this.panY = 25;

    // Theme: 'light_studio', 'exam_green', 'light_blue', 'exam_cyan', 'exam_sepia'
    this.currentTheme = 'exam_green';
    this.themes = {
      exam_green: {
        name: 'Exam Green (Dark)',
        bg: '#090d16',            // Dark workbench background
        paperBg: '#ffffff',       // Authentic crisp paper
        paperBorder: '#cbd5e1',
        majorGrid: 'rgba(16, 185, 129, 0.60)', // Exam green bold 2cm grid
        minorGrid: 'rgba(16, 185, 129, 0.22)', // Exam green fine 2mm grid
        pencilColor: '#0f172a',   // 2B/HB graphite pencil
        pencilFaint: '#64748b',   // Faint pencil construction
        bluePenColor: '#1d4ed8',  // Blue exam pen
        gradientTriangle: '#2563eb', // Blue pencil / ink for triangle
        gradientText: '#1e3a8a',
        rulerEdge: '#0f172a'
      },
      light_studio: {
        name: 'Clean Light Desk',
        bg: '#f1f5f9',            // Crisp light desk workbench (slate-100)
        paperBg: '#ffffff',       // Authentic crisp paper
        paperBorder: '#94a3b8',   // Distinct paper border
        majorGrid: 'rgba(5, 150, 105, 0.65)',  // Standard exam green grid
        minorGrid: 'rgba(5, 150, 105, 0.22)',
        pencilColor: '#0f172a',   // Graphite pencil
        pencilFaint: '#64748b',
        bluePenColor: '#1d4ed8',  // Blue ink
        gradientTriangle: '#2563eb',
        gradientText: '#1e3a8a',
        rulerEdge: '#0f172a'
      },
      light_blue: {
        name: 'Blue Grid (Light)',
        bg: '#f8fafc',            // Soft silver workbench
        paperBg: '#ffffff',
        paperBorder: '#cbd5e1',
        majorGrid: 'rgba(37, 99, 235, 0.60)',  // Blue millimeter grid
        minorGrid: 'rgba(37, 99, 235, 0.20)',
        pencilColor: '#0f172a',
        pencilFaint: '#64748b',
        bluePenColor: '#1e40af',
        gradientTriangle: '#d97706',
        gradientText: '#92400e',
        rulerEdge: '#0f172a'
      },
      exam_cyan: {
        name: 'Cyan Blueprint (Dark)',
        bg: '#082f49',
        paperBg: '#ffffff',
        paperBorder: '#cbd5e1',
        majorGrid: 'rgba(6, 182, 212, 0.60)',  // Cyan bold 2cm grid
        minorGrid: 'rgba(6, 182, 212, 0.22)',  // Cyan fine 2mm grid
        pencilColor: '#0f172a',
        pencilFaint: '#64748b',
        bluePenColor: '#0369a1',
        gradientTriangle: '#d97706',
        gradientText: '#92400e',
        rulerEdge: '#0f172a'
      },
      exam_sepia: {
        name: 'Vintage Sepia',
        bg: '#292524',
        paperBg: '#fffdf5',
        paperBorder: '#e7e5e4',
        majorGrid: 'rgba(234, 88, 12, 0.60)', // Orange/sepia 2cm grid
        minorGrid: 'rgba(234, 88, 12, 0.22)', // Orange/sepia 2mm grid
        pencilColor: '#292524',
        pencilFaint: '#78716c',
        bluePenColor: '#1e40af',
        gradientTriangle: '#0284c7',
        gradientText: '#075985',
        rulerEdge: '#292524'
      }
    };

    // Handwriting Fonts configuration
    this.handwritingFont = "'Caveat', 'Kalam', 'Patrick Hand', 'Comic Sans MS', cursive";

    // Interaction State
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.cursorDataCoords = { x: 0, y: 0 };
    this.showExamAnnotations = false;
    this.isHoveringPaper = false;

    // Axis Dragging State (Step 2 / Sandbox)
    this.hoveredAxis = null; // 'x-axis', 'y-axis', 'origin', or null
    this.draggingAxis = null;
    this.onAxisDragCallback = null;
    this.onAxisDragEndCallback = null;

    // Best Fit Line Dragging State (Step 4 / Sandbox)
    this.hoveredLinePart = null; // 'body', 'start', 'end', or null
    this.draggingLinePart = null;
    this.lineDragStart = null;
    this.onLineDragCallback = null;

    // Gradient Triangle Points State (Step 5 / Sandbox)
    this.hoveredTrianglePoint = null; // 'p1', 'p2', or null
    this.draggingTrianglePoint = null;
    this.onTrianglePointDragCallback = null;
    this.onTrianglePointDragEndCallback = null;

    this.onHoverCallback = null;
    this.onZoomCallback = null;
    this.onCanvasClickCallback = null;

    // Animals feature (Cats, Dogs, Birds, Rabbits)
    this.showAnimals = true;
    this.animalAnimId = null;
    this.hoveredAnimal = null;
    this.draggingAnimal = null;
    this.dragAnimalOffsetX = 0;
    this.dragAnimalOffsetY = 0;
    this.onAnimalDragEndCallback = null;
    this.initAnimals();

    this.initCanvasSize();
    this.setupEventListeners();
    this.startAnimalLoop();
  }

  initCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    this.ctx.scale(dpr, dpr);

    // Fit cleanly on load
    this.centerView();
    this.render();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.initCanvasSize());

    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let isMouseDown = false;

    function distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    // Panning / Dragging / Click start
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('#virtualRuler')) return;

      isMouseDown = true;
      downX = e.clientX;
      downY = e.clientY;
      downTime = Date.now();
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // 0. Check if clicking on an animal to drag it
      if (this.hoveredAnimal) {
        this.draggingAnimal = this.hoveredAnimal;
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        this.dragAnimalOffsetX = canvasX - this.hoveredAnimal.x;
        this.dragAnimalOffsetY = canvasY - this.hoveredAnimal.y;
        this.container.style.cursor = 'grabbing';
        this.isDragging = false;
        return;
      }

      // 1. Check if clicking on an axis (in Step 2 or sandbox)
      if (this.hoveredAxis) {
        this.draggingAxis = this.hoveredAxis;
        this.isDragging = false;
        return;
      }

      // 2. Check if clicking on the best fit line (in Step 4 or Sandbox)
      if (this.hoveredLinePart && this.state.bestFitLine && this.state.currentStep !== 5) {
        this.draggingLinePart = this.hoveredLinePart;
        this.lineDragStart = {
          slope: this.state.bestFitLine.slope,
          intercept: this.state.bestFitLine.intercept,
          clientX: e.clientX,
          clientY: e.clientY
        };
        this.isDragging = false;
        return;
      }

      // 3. Check if clicking on a gradient triangle vertex dot (in Step 5 or Sandbox)
      if (this.hoveredTrianglePoint && this.state.gradientTriangle && this.state.bestFitLine) {
        this.draggingTrianglePoint = this.hoveredTrianglePoint;
        this.isDragging = false;
        return;
      }

      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      this.cursorDataCoords = this.screenToData(canvasX, canvasY);

      if (this.onHoverCallback) {
        this.onHoverCallback(this.cursorDataCoords);
      }

      // 0. Handle Animal Dragging
      if (this.draggingAnimal) {
        this.draggingAnimal.x = canvasX - this.dragAnimalOffsetX;
        this.draggingAnimal.y = canvasY - this.dragAnimalOffsetY;
        this.container.style.cursor = 'grabbing';
        this.render();
        return;
      }

      const majorPix = this.basePixelsPerMajor * this.zoom;
      const paperW = this.gridMajorCols * majorPix;
      const paperH = this.gridMajorRows * majorPix;
      const isInside = canvasX >= this.panX && canvasX <= this.panX + paperW &&
                       canvasY >= this.panY && canvasY <= this.panY + paperH;
      const isRuler = e.target && typeof e.target.closest === 'function' && e.target.closest('#virtualRuler');

      // 1. Handle Axis Dragging (Step 2 / Sandbox)
      if (this.draggingAxis) {
        const paperX = canvasX - this.panX;
        const paperY = canvasY - this.panY;

        if (this.draggingAxis === 'y-axis' || this.draggingAxis === 'origin') {
          const rawCol = paperX / majorPix;
          const snappedCol = Math.round(rawCol * 2) / 2;
          this.state.originCol = Math.max(1.0, Math.min(this.gridMajorCols - 2.0, snappedCol));
        }

        if (this.draggingAxis === 'x-axis' || this.draggingAxis === 'origin') {
          const rawRow = paperY / majorPix;
          const snappedRow = Math.round(rawRow * 2) / 2;
          this.state.originRow = Math.max(2.0, Math.min(this.gridMajorRows - 1.5, snappedRow));
        }

        this.render();
        if (this.onAxisDragCallback) {
          this.onAxisDragCallback(this.state.originCol, this.state.originRow);
        }
        return;
      }

      // 2. Handle Best Fit Line Dragging
      if (this.draggingLinePart && this.state.bestFitLine) {
        if (this.draggingLinePart === 'body') {
          const dy = e.clientY - this.lineDragStart.clientY;
          const deltaY_data = (-dy / majorPix) * this.state.yScale;
          this.state.bestFitLine.intercept = this.lineDragStart.intercept + deltaY_data;
          this.container.style.cursor = 'grabbing';
        } else if (this.draggingLinePart === 'start' || this.draggingLinePart === 'end') {
          const cursorData = this.screenToData(canvasX, canvasY);
          const minX = this.state.xOrigin;
          const maxX = this.state.xOrigin + (this.state.numMajorX || 10) * this.state.xScale;
          const xMean = (this.state.bestFitLine.xMean !== undefined && !isNaN(this.state.bestFitLine.xMean))
            ? this.state.bestFitLine.xMean
            : (minX + maxX) / 2;
          const yMean = (this.state.bestFitLine.yMean !== undefined && !isNaN(this.state.bestFitLine.yMean))
            ? this.state.bestFitLine.yMean
            : (this.lineDragStart.slope * xMean + this.lineDragStart.intercept);

          if (Math.abs(cursorData.x - xMean) > 0.001) {
            const newSlope = (cursorData.y - yMean) / (cursorData.x - xMean);
            this.state.bestFitLine.slope = newSlope;
            this.state.bestFitLine.intercept = yMean - newSlope * xMean;
          }
          this.container.style.cursor = 'crosshair';
        }

        this.render();
        if (this.onLineDragCallback) {
          this.onLineDragCallback(this.state.bestFitLine);
        }
        return;
      }

      // 3. Handle Gradient Triangle Dot Dragging (Step 5 / Sandbox)
      if (this.draggingTrianglePoint && this.state.bestFitLine && this.state.gradientTriangle) {
        const cursorData = this.screenToData(canvasX, canvasY);
        const { slope, intercept } = this.state.bestFitLine;
        const xPrec = PedagogyEngine.calculateAxisPrecision(this.state.xScale);
        const yPrec = PedagogyEngine.calculateAxisPrecision(this.state.yScale);

        let snappedX = Math.round(cursorData.x / xPrec.stepPrecision) * xPrec.stepPrecision;
        const minX = this.state.xOrigin;
        const maxX = this.state.xOrigin + (this.state.numMajorX || 10) * this.state.xScale;
        snappedX = Math.max(minX, Math.min(maxX, snappedX));

        const lineY = slope * snappedX + intercept;
        const snappedY = Math.round(lineY / yPrec.stepPrecision) * yPrec.stepPrecision;

        this.state.gradientTriangle[this.draggingTrianglePoint] = {
          x: parseFloat(PedagogyEngine.formatToDecPlaces(snappedX, xPrec.decimalPlaces)),
          y: parseFloat(PedagogyEngine.formatToDecPlaces(snappedY, yPrec.decimalPlaces))
        };
        this.render();
        if (this.onTrianglePointDragCallback) {
          this.onTrianglePointDragCallback(this.state.gradientTriangle);
        }
        return;
      }

      // 4. Handle Paper Dragging / Panning
      if (isMouseDown && !this.isDragging) {
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist >= 5) {
          this.isDragging = true;
          this.container.style.cursor = 'grabbing';
        }
      }

      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.panX += dx;
        this.panY += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.clampPan();
        this.render();
        return;
      }

      // 5. Cursor Hover Hit-Testing when not dragging
      const wasInside = this.isHoveringPaper;
      const prevHoveredAxis = this.hoveredAxis;
      const prevHoveredLinePart = this.hoveredLinePart;
      const prevHoveredTrianglePoint = this.hoveredTrianglePoint;

      this.hoveredAxis = null;
      this.hoveredLinePart = null;
      this.hoveredTrianglePoint = null;

      const isAxisDraggable = (this.state.currentStep <= 2 || this.state.mode === 'sandbox');
      const isStep5 = (this.state.currentStep === 5 || this.state.mode === 'sandbox');
      const originScreen = this.dataToScreen(this.state.xOrigin, this.state.yOrigin);

      // Hit-test axes in Step 1, Step 2 / Sandbox
      if (isAxisDraggable && !isRuler) {
        const distOrigin = Math.hypot(canvasX - originScreen.x, canvasY - originScreen.y);
        const axisTop = this.panY + 35 * this.zoom;
        const axisBottom = this.panY + (this.gridMajorRows - 0.5) * majorPix;
        const axisLeft = this.panX + 0.5 * majorPix;
        const axisRight = this.panX + (this.gridMajorCols - 0.5) * majorPix;

        // X-axis pill badge bounds (rendered at xBadgeX, xBadgeY)
        const xBadgeW = 110 * this.zoom;
        const xBadgeX = axisRight - xBadgeW - 20 * this.zoom;
        const xBadgeY = Math.max(this.panY + 45 * this.zoom, originScreen.y - 28 * this.zoom);
        const isOverXBadge = (canvasX >= xBadgeX && canvasX <= xBadgeX + xBadgeW + 24 &&
                              canvasY >= xBadgeY - 4 && canvasY <= xBadgeY + 28);

        // Y-axis pill badge bounds
        const yBadgeW = 110 * this.zoom;
        const yBadgeX = originScreen.x + 8 * this.zoom;
        const yBadgeY = axisTop + 14 * this.zoom;
        const isOverYBadge = (canvasX >= yBadgeX && canvasX <= yBadgeX + yBadgeW + 24 &&
                              canvasY >= yBadgeY - 4 && canvasY <= yBadgeY + 28);

        if (distOrigin <= 18 * this.zoom) {
          this.hoveredAxis = 'origin';
          this.container.style.cursor = 'move';
        } else if (isOverYBadge || (Math.abs(canvasX - originScreen.x) <= 18 * this.zoom && canvasY >= axisTop - 10 && canvasY <= axisBottom + 10)) {
          this.hoveredAxis = 'y-axis';
          this.container.style.cursor = 'ew-resize';
        } else if (isOverXBadge || (Math.abs(canvasY - originScreen.y) <= 18 * this.zoom && canvasX >= axisLeft - 10 && canvasX <= axisRight + 10)) {
          this.hoveredAxis = 'x-axis';
          this.container.style.cursor = 'ns-resize';
        }
      }

      // Hit-test Gradient Triangle Dots in Step 5 / Sandbox
      if (isStep5 && this.state.gradientTriangle && this.state.bestFitLine && !isRuler && !this.hoveredAxis) {
        const { p1, p2 } = this.state.gradientTriangle;
        if (p1 && p1.x !== null && !isNaN(p1.x)) {
          const s1 = this.dataToScreen(p1.x, p1.y);
          if (Math.hypot(canvasX - s1.x, canvasY - s1.y) <= 18 * this.zoom) {
            this.hoveredTrianglePoint = 'p1';
            this.container.style.cursor = 'ew-resize';
          }
        }
        if (!this.hoveredTrianglePoint && p2 && p2.x !== null && !isNaN(p2.x)) {
          const s2 = this.dataToScreen(p2.x, p2.y);
          if (Math.hypot(canvasX - s2.x, canvasY - s2.y) <= 18 * this.zoom) {
            this.hoveredTrianglePoint = 'p2';
            this.container.style.cursor = 'ew-resize';
          }
        }
      }

      // Hit-test Best Fit Line if line exists
      if (!this.hoveredAxis && !this.hoveredTrianglePoint && this.state.bestFitLine && !isRuler) {
        const { slope, intercept } = this.state.bestFitLine;
        const minX = this.state.xOrigin;
        const maxX = this.state.xOrigin + (this.state.numMajorX || 10) * this.state.xScale;
        const pStart = this.dataToScreen(minX, slope * minX + intercept);
        const pEnd = this.dataToScreen(maxX, slope * maxX + intercept);

        const distStart = Math.hypot(canvasX - pStart.x, canvasY - pStart.y);
        const distEnd = Math.hypot(canvasX - pEnd.x, canvasY - pEnd.y);
        const distLine = distToSegment(canvasX, canvasY, pStart.x, pStart.y, pEnd.x, pEnd.y);

        // Center drag badge hit test
        const midX = (pStart.x + pEnd.x) / 2;
        const midY = (pStart.y + pEnd.y) / 2;
        const isOverMidBadge = (Math.abs(canvasX - midX) <= 100 * this.zoom && Math.abs(canvasY - (midY - 16 * this.zoom)) <= 16 * this.zoom);

        if (this.state.currentStep === 5) {
          // In Step 5: hovering line shows pointer for dropping measurement dots
          if (distLine <= 16 * this.zoom) {
            this.container.style.cursor = 'pointer';
          }
        } else {
          // In other steps (e.g. Step 4 / Sandbox): allow line dragging
          if (distStart <= 22 * this.zoom) {
            this.hoveredLinePart = 'start';
            this.container.style.cursor = 'crosshair';
          } else if (distEnd <= 22 * this.zoom) {
            this.hoveredLinePart = 'end';
            this.container.style.cursor = 'crosshair';
          } else if (distLine <= 20 * this.zoom || isOverMidBadge) {
            this.hoveredLinePart = 'body';
            this.container.style.cursor = 'grab';
          }
        }
      }

      // Check for animal hovering (draggable pets)
      const prevHoveredAnimal = this.hoveredAnimal;
      this.hoveredAnimal = null;
      if (this.showAnimals && this.animals && !isRuler && !this.hoveredAxis && !this.hoveredLinePart && !this.hoveredTrianglePoint) {
        for (let i = this.animals.length - 1; i >= 0; i--) {
          const a = this.animals[i];
          const dist = Math.hypot(canvasX - a.x, canvasY - a.y);
          if (dist <= 30 * this.zoom) {
            const inFront = this.isAnimalInFront(a, this.panY, paperH);
            if (inFront || !isInside) {
              this.hoveredAnimal = a;
              this.container.style.cursor = 'grab';
              break;
            }
          }
        }
      }

      this.isHoveringPaper = isInside && !this.isDragging && !isRuler && !this.hoveredAxis && !this.hoveredLinePart && !this.hoveredTrianglePoint && !this.hoveredAnimal;

      if (!this.hoveredAxis && !this.hoveredLinePart && !this.hoveredTrianglePoint && !this.hoveredAnimal) {
        if (this.isHoveringPaper && (this.state.currentStep >= 3 || this.state.mode === 'sandbox')) {
          this.container.style.cursor = 'crosshair';
        } else if (!this.isDragging) {
          this.container.style.cursor = 'grab';
        }
      }

      if (this.isHoveringPaper || wasInside || this.hoveredAxis !== prevHoveredAxis || this.hoveredLinePart !== prevHoveredLinePart || this.hoveredTrianglePoint !== prevHoveredTrianglePoint || this.hoveredAnimal !== prevHoveredAnimal) {
        this.render();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const elapsed = Date.now() - downTime;
      const isRuler = e.target && typeof e.target.closest === 'function' && e.target.closest('#virtualRuler');

      // 0. Finished dragging animal
      if (this.draggingAnimal) {
        const animal = this.draggingAnimal;
        this.draggingAnimal = null;
        if (this.onAnimalDragEndCallback) {
          this.onAnimalDragEndCallback(animal);
        }
        this.render();
        return;
      }

      // 1. Finished dragging axis
      if (this.draggingAxis) {
        const dragged = this.draggingAxis;
        this.draggingAxis = null;
        if (this.onAxisDragEndCallback) {
          this.onAxisDragEndCallback(dragged, this.state.originCol, this.state.originRow);
        }
        this.render();
        return;
      }

      // 2. Finished dragging best fit line
      if (this.draggingLinePart) {
        this.draggingLinePart = null;
        if (this.onLineDragCallback) {
          this.onLineDragCallback(this.state.bestFitLine);
        }
        this.render();
        return;
      }

      // 3. Finished dragging gradient triangle dot
      if (this.draggingTrianglePoint) {
        this.draggingTrianglePoint = null;
        const { p1, p2 } = this.state.gradientTriangle;
        if (p1 && p2 && p1.x !== null && p2.x !== null && p1.x > p2.x) {
          this.state.gradientTriangle.p1 = p2;
          this.state.gradientTriangle.p2 = p1;
        }
        if (this.onTrianglePointDragEndCallback) {
          this.onTrianglePointDragEndCallback(this.state.gradientTriangle);
        }
        this.render();
        return;
      }

      if (this.isDragging) {
        this.isDragging = false;
        if (!this.isHoveringPaper) {
          this.container.style.cursor = 'grab';
        }
      } else if (dist < 6 && elapsed < 500 && !isRuler) {
        // Detect click on graph paper
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const majorPix = this.basePixelsPerMajor * this.zoom;
        const paperW = this.gridMajorCols * majorPix;
        const paperH = this.gridMajorRows * majorPix;

        // Check if click was on graph paper
        if (canvasX >= this.panX && canvasX <= this.panX + paperW &&
            canvasY >= this.panY && canvasY <= this.panY + paperH) {
          const dataCoords = this.screenToData(canvasX, canvasY);
          if (this.onCanvasClickCallback) {
            this.onCanvasClickCallback(dataCoords, { screenX: canvasX, screenY: canvasY, event: e });
          }
        }
      }
    });

    this.container.addEventListener('mouseleave', () => {
      this.isHoveringPaper = false;
      this.container.style.cursor = 'grab';
      this.render();
    });

    // Zooming (Mouse Wheel)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.10 : 0.90;
      this.zoomAtPoint(mouseX, mouseY, zoomFactor);
    }, { passive: false });
  }

  /**
   * Constrain panning strictly: Graph paper CANNOT move down off-screen, and top title is always reachable
   */
  clampPan() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const paperW = this.gridMajorCols * majorPix;
    const paperH = this.gridMajorRows * majorPix;

    const topPad = 25;
    const bottomPad = 25;
    const sidePad = 25;

    // Vertical clamping: Never allow top of paper to move below topPad into the screen, never allow bottom above viewport bottom
    if (paperH + topPad + bottomPad <= rect.height) {
      // Entire paper fits comfortably: lock to center
      this.panY = (rect.height - paperH) / 2;
    } else {
      // Paper is taller than canvas: scroll between top (maxY = 25) and bottom (minY)
      const minY = rect.height - paperH - bottomPad;
      const maxY = topPad; // Top of paper locked at y=25px, CANNOT move down into middle/bottom of screen!
      this.panY = Math.min(maxY, Math.max(minY, this.panY));
    }

    // Horizontal clamping:
    if (paperW + sidePad * 2 <= rect.width) {
      this.panX = (rect.width - paperW) / 2;
    } else {
      const minX = rect.width - paperW - sidePad;
      const maxX = sidePad;
      this.panX = Math.min(maxX, Math.max(minX, this.panX));
    }
  }

  zoomAtPoint(screenX, screenY, factor) {
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    if (newZoom === this.zoom) return;

    this.panX = screenX - (screenX - this.panX) * (newZoom / this.zoom);
    this.panY = screenY - (screenY - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.clampPan();

    if (this.onZoomCallback) {
      this.onZoomCallback(this.zoom);
    }
    this.render();
  }

  setZoom(zoomVal) {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    this.zoomAtPoint(centerX, centerY, zoomVal / this.zoom);
  }

  centerView() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const targetW = rect.width - 60;
    const targetH = rect.height - 60;

    const baseW = this.gridMajorCols * this.basePixelsPerMajor;
    const baseH = this.gridMajorRows * this.basePixelsPerMajor;

    const fitZoom = Math.min(1.15, Math.min(targetW / baseW, targetH / baseH));
    this.zoom = Math.max(0.6, fitZoom);

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const paperW = this.gridMajorCols * majorPix;
    const paperH = this.gridMajorRows * majorPix;

    this.panX = Math.max(20, (rect.width - paperW) / 2);
    this.panY = Math.max(25, (rect.height - paperH) / 2);
    this.clampPan();

    if (this.onZoomCallback) {
      this.onZoomCallback(this.zoom);
    }
    this.render();
  }

  cycleTheme() {
    const themeNames = Object.keys(this.themes);
    const currentIndex = themeNames.indexOf(this.currentTheme);
    this.currentTheme = themeNames[(currentIndex + 1) % themeNames.length];
    const theme = this.themes[this.currentTheme];
    if (this.container) {
      this.container.style.backgroundColor = theme.bg;
    }
    this.render();
    return this.currentTheme;
  }

  setTheme(themeKey) {
    if (!this.themes[themeKey]) return this.currentTheme;
    this.currentTheme = themeKey;
    const theme = this.themes[this.currentTheme];
    if (this.container) {
      this.container.style.backgroundColor = theme.bg;
    }
    this.render();
    return this.currentTheme;
  }

  setState(state) {
    this.state = state;
    this.render();
  }

  getOriginCol() {
    const maxCol = this.gridMajorCols - 2.0;
    if (this.state && this.state.originCol !== undefined && !isNaN(this.state.originCol)) {
      return Math.min(maxCol, Math.max(1.0, this.state.originCol));
    }
    return 1.5;
  }

  getOriginRow() {
    const maxRow = this.gridMajorRows - 1.5;
    if (this.state && this.state.originRow !== undefined && !isNaN(this.state.originRow)) {
      return Math.min(maxRow, Math.max(2.0, this.state.originRow));
    }
    return Math.min(maxRow, 11.0);
  }

  /**
   * Data coordinates (x, y) to Screen pixels (X, Y)
   */
  dataToScreen(x, y) {
    if (!this.state) return { x: 0, y: 0 };
    const { xOrigin, yOrigin, xScale, yScale } = this.state;
    const majorPix = this.basePixelsPerMajor * this.zoom;

    // Origin position inside the full graph paper
    const paperOriginX = this.panX + this.getOriginCol() * majorPix;
    const paperOriginY = this.panY + this.getOriginRow() * majorPix;

    // Major boxes offset from origin
    const majorX = (x - xOrigin) / xScale;
    const majorY = (y - yOrigin) / yScale;

    const screenX = paperOriginX + majorX * majorPix;
    const screenY = paperOriginY - majorY * majorPix;

    return { x: screenX, y: screenY };
  }

  /**
   * Screen pixels (X, Y) to Data coordinates (x, y)
   */
  screenToData(screenX, screenY) {
    if (!this.state) return { x: 0, y: 0 };
    const { xOrigin, yOrigin, xScale, yScale } = this.state;
    const majorPix = this.basePixelsPerMajor * this.zoom;

    const paperOriginX = this.panX + this.getOriginCol() * majorPix;
    const paperOriginY = this.panY + this.getOriginRow() * majorPix;

    const majorX = (screenX - paperOriginX) / majorPix;
    const majorY = (paperOriginY - screenY) / majorPix;

    const dataX = xOrigin + majorX * xScale;
    const dataY = yOrigin + majorY * yScale;

    return { x: dataX, y: dataY };
  }

  /**
   * Main Render Loop - The Entire Paper is Authentic Millimeter Graph Paper
   */
  render() {
    if (!this.state) return;

    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const theme = this.themes[this.currentTheme];

    // Clear workbench background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const minorPix = majorPix / this.minorDivisions;

    // Full Paper Sheet Dimensions
    const paperW = this.gridMajorCols * majorPix;
    const paperH = this.gridMajorRows * majorPix;
    const paperLeft = this.panX;
    const paperTop = this.panY;

    // Pass 1: Render Animals walking BEHIND the graph paper on the workbench
    if (this.showAnimals) {
      this.renderAnimals(ctx, width, height, theme, false, paperTop, paperH);
    }

    // 1. Draw Physical Paper Sheet with realistic drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24 * this.zoom;
    ctx.shadowOffsetX = 4 * this.zoom;
    ctx.shadowOffsetY = 10 * this.zoom;
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(paperLeft, paperTop, paperW, paperH);
    ctx.restore();

    // Clip rendering strictly inside the graph paper boundary
    ctx.save();
    ctx.beginPath();
    ctx.rect(paperLeft, paperTop, paperW, paperH);
    ctx.clip();

    // 2. Render Minor Grid Lines (2mm squares across the ENTIRE page)
    ctx.strokeStyle = theme.minorGrid;
    ctx.lineWidth = 0.55;
    ctx.beginPath();

    const totalMinorCols = this.gridMajorCols * this.minorDivisions;
    const totalMinorRows = this.gridMajorRows * this.minorDivisions;

    for (let i = 0; i <= totalMinorCols; i++) {
      const x = paperLeft + i * minorPix;
      ctx.moveTo(x, paperTop);
      ctx.lineTo(x, paperTop + paperH);
    }
    for (let j = 0; j <= totalMinorRows; j++) {
      const y = paperTop + j * minorPix;
      ctx.moveTo(paperLeft, y);
      ctx.lineTo(paperLeft + paperW, y);
    }
    ctx.stroke();

    // 3. Render Major Grid Lines (20mm squares across the ENTIRE page)
    ctx.strokeStyle = theme.majorGrid;
    ctx.lineWidth = 1.3;
    ctx.beginPath();

    for (let i = 0; i <= this.gridMajorCols; i++) {
      const x = paperLeft + i * majorPix;
      ctx.moveTo(x, paperTop);
      ctx.lineTo(x, paperTop + paperH);
    }
    for (let j = 0; j <= this.gridMajorRows; j++) {
      const y = paperTop + j * majorPix;
      ctx.moveTo(paperLeft, y);
      ctx.lineTo(paperLeft + paperW, y);
    }
    ctx.stroke();

    // Outer Paper Border
    ctx.strokeStyle = theme.majorGrid;
    ctx.lineWidth = 2.0;
    ctx.strokeRect(paperLeft, paperTop, paperW, paperH);

    // Restore clip so that title, axes, Best Fit Line and Extrapolation can span beyond the graph paper boundary!
    ctx.restore();

    // 4. Render Handwritten Graph Title at Top of Page
    if (this.state.title) {
      this.renderHandwrittenTitle(ctx, theme, paperLeft + paperW / 2, paperTop + 30 * this.zoom);
    }

    // 5. Draw Axes (X and Y Axes) with Pencil / Pen Handwriting
    this.renderAxes(ctx, theme, majorPix, paperLeft, paperTop, paperW, paperH);

    // 6. Draw Best Fit Line & Extrapolation (spanning beyond graph paper)
    if (this.state.showBestFitLine && this.state.bestFitLine) {
      this.renderBestFitLine(ctx, theme, paperLeft, paperTop, paperW, paperH);
    }

    // 7. Draw Large Gradient Triangle (Only when >= 5 points are plotted)
    if (this.state.showGradientTriangle && this.state.gradientTriangle && this.state.bestFitLine) {
      this.renderGradientTriangle(ctx, theme);
    }

    // 8. Draw Plotted Points (Sharp Pencil Crosses 'x', '+', '⊙' - 2 small squares wide and long)
    this.renderPoints(ctx, theme);

    // 9. Draw Centroid Point (x̄, ȳ) if enabled (Only when >= 5 points are plotted)
    if (this.state.showCentroid && this.state.bestFitLine) {
      this.renderCentroid(ctx, theme);
    }

    // 10. Draw Hover Cursor Preview Cross for Physical Point Plotting
    this.renderHoverPreview(ctx, theme);

    // 11. Pass 2: Render Cats and Dogs walking IN FRONT of the graph paper (+/-10% top/bottom with 50% allowance)
    if (this.showAnimals) {
      this.renderAnimals(ctx, width, height, theme, true, paperTop, paperH);
    }
  }

  /**
   * Render Graph Title in authentic graphite pencil handwriting
   */
  renderHandwrittenTitle(ctx, theme, centerX, topY) {
    ctx.save();
    ctx.fillStyle = theme.pencilColor;
    ctx.font = `700 ${Math.max(16, 20 * this.zoom)}px ${this.handwritingFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Graphite pencil stroke feel with subtle highlight backing for clean legibility over grid
    const titleMetrics = ctx.measureText(this.state.title);
    const bgPad = 6 * this.zoom;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(
      centerX - titleMetrics.width / 2 - bgPad,
      topY - 14 * this.zoom,
      titleMetrics.width + bgPad * 2,
      28 * this.zoom
    );

    // Pencil handwriting text
    ctx.fillStyle = theme.pencilColor;
    ctx.fillText(this.state.title, centerX, topY);

    // Pencil underline
    ctx.strokeStyle = theme.pencilColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(centerX - titleMetrics.width / 2 - 4, topY + 12 * this.zoom);
    ctx.lineTo(centerX + titleMetrics.width / 2 + 4, topY + 12 * this.zoom);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render X & Y Axes with arrows, solidus headings, and handwritten tick labels
   */
  renderAxes(ctx, theme, majorPix, paperLeft, paperTop, paperW, paperH) {
    const { xOrigin, yOrigin, xScale, yScale, axisX, axisY } = this.state;
    const originScreen = this.dataToScreen(xOrigin, yOrigin);

    const xPrec = PedagogyEngine.calculateAxisPrecision(xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(yScale);

    ctx.save();
    ctx.strokeStyle = theme.pencilColor;
    ctx.fillStyle = theme.pencilColor;
    ctx.lineWidth = 2.0;

    const axisTop = paperTop + 35 * this.zoom;
    const axisBottom = paperTop + (this.gridMajorRows - 0.5) * majorPix;
    const axisLeft = paperLeft + 0.5 * majorPix;
    const axisRight = paperLeft + (this.gridMajorCols - 0.5) * majorPix;

    const isAxisDraggable = (this.state.currentStep <= 2 || this.state.mode === 'sandbox');

    // Aura Highlight when hovered or dragged (Step 1 & 2 / Sandbox)
    if (isAxisDraggable) {
      if (this.hoveredAxis === 'y-axis' || this.draggingAxis === 'y-axis') {
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.lineWidth = 10 * this.zoom;
        ctx.beginPath();
        ctx.moveTo(originScreen.x, axisTop);
        ctx.lineTo(originScreen.x, axisBottom);
        ctx.stroke();
        ctx.restore();
      }

      if (this.hoveredAxis === 'x-axis' || this.draggingAxis === 'x-axis') {
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.lineWidth = 10 * this.zoom;
        ctx.beginPath();
        ctx.moveTo(axisLeft, originScreen.y);
        ctx.lineTo(axisRight, originScreen.y);
        ctx.stroke();
        ctx.restore();
      }

      if (this.hoveredAxis === 'origin' || this.draggingAxis === 'origin') {
        ctx.save();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5 * this.zoom;
        ctx.beginPath();
        ctx.arc(originScreen.x, originScreen.y, 14 * this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Y-Axis full-grid line
    ctx.beginPath();
    ctx.moveTo(originScreen.x, axisBottom);
    ctx.lineTo(originScreen.x, axisTop);
    ctx.stroke();

    // Y-Axis Arrowhead
    this.drawArrowhead(ctx, originScreen.x, axisTop, -Math.PI / 2, 9 * this.zoom);

    // X-Axis full-grid line
    ctx.beginPath();
    ctx.moveTo(axisLeft, originScreen.y);
    ctx.lineTo(axisRight, originScreen.y);
    ctx.stroke();

    // X-Axis Arrowhead
    this.drawArrowhead(ctx, axisRight, originScreen.y, 0, 9 * this.zoom);

    // Handwritten Axis Number Labels font
    ctx.font = `600 ${Math.max(12, 14 * this.zoom)}px ${this.handwritingFont}`;

    // Dynamic X-Axis Major Ticks & Handwritten Labels
    const originCol = this.getOriginCol();
    const minK = -Math.floor(originCol - 0.5);
    const maxK = Math.floor(this.gridMajorCols - 0.5 - originCol);
    for (let k = minK; k <= maxK; k++) {
      const val = xOrigin + k * xScale;
      const screenPos = this.dataToScreen(val, yOrigin);

      // Tick mark
      ctx.beginPath();
      ctx.moveTo(screenPos.x, screenPos.y - 5 * this.zoom);
      ctx.lineTo(screenPos.x, screenPos.y + 5 * this.zoom);
      ctx.stroke();

      // Number Label with exact decimal places from D/20 rule
      const labelText = PedagogyEngine.formatToDecPlaces(val, xPrec.decimalPlaces);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labelText, screenPos.x, screenPos.y + 7 * this.zoom);
    }

    // Dynamic Y-Axis Major Ticks & Handwritten Labels
    const originRow = this.getOriginRow();
    const minM = -Math.floor(this.gridMajorRows - 0.5 - originRow);
    const maxM = Math.floor(originRow - 1.5);
    for (let m = minM; m <= maxM; m++) {
      const val = yOrigin + m * yScale;
      const screenPos = this.dataToScreen(xOrigin, val);

      // Tick mark
      ctx.beginPath();
      ctx.moveTo(screenPos.x - 5 * this.zoom, screenPos.y);
      ctx.lineTo(screenPos.x + 5 * this.zoom, screenPos.y);
      ctx.stroke();

      // Number Label
      const labelText = PedagogyEngine.formatToDecPlaces(val, yPrec.decimalPlaces);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, screenPos.x - 8 * this.zoom, screenPos.y);
    }

    // Solidus Notation Labels in Blue Pen / Dark Graphite Handwriting
    ctx.fillStyle = theme.bluePenColor;
    ctx.font = `700 ${Math.max(14, 17 * this.zoom)}px ${this.handwritingFont}`;

    // Y-Axis Solidus Heading (Top of Y-Axis)
    const yLabel = axisY.unit ? `${axisY.symbol} / ${axisY.unit}` : axisY.symbol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(yLabel, originScreen.x, axisTop - 12 * this.zoom);

    // X-Axis Solidus Heading (Right of X-Axis)
    const xLabel = axisX.unit ? `${axisX.symbol} / ${axisX.unit}` : axisX.symbol;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const labelY = Math.min(paperTop + paperH - 12 * this.zoom, originScreen.y + 24 * this.zoom);
    ctx.fillText(xLabel, axisRight, labelY);

    // Interactive Drag Badges in Step 1 & 2 / Sandbox Mode
    if (isAxisDraggable) {
      ctx.save();
      ctx.font = '600 11px Inter, sans-serif';

      // Y-axis pill near top
      const yBadgeText = '↔ Drag Y-Axis';
      const yTextW = ctx.measureText(yBadgeText).width;
      const yBadgeX = originScreen.x + 8 * this.zoom;
      const yBadgeY = axisTop + 14 * this.zoom;
      ctx.fillStyle = this.hoveredAxis === 'y-axis' || this.draggingAxis === 'y-axis' ? '#0891b2' : 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(yBadgeX, yBadgeY, yTextW + 12, 20, 4);
      else ctx.rect(yBadgeX, yBadgeY, yTextW + 12, 20);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(yBadgeText, yBadgeX + 6, yBadgeY + 10);

      // X-axis pill near right
      const xBadgeText = '↕ Drag X-Axis';
      const xTextW = ctx.measureText(xBadgeText).width;
      const xBadgeX = axisRight - xTextW - 20 * this.zoom;
      const xBadgeY = Math.max(paperTop + 45 * this.zoom, originScreen.y - 28 * this.zoom);
      ctx.fillStyle = this.hoveredAxis === 'x-axis' || this.draggingAxis === 'x-axis' ? '#0891b2' : 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(xBadgeX, xBadgeY, xTextW + 12, 20, 4);
      else ctx.rect(xBadgeX, xBadgeY, xTextW + 12, 20);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(xBadgeText, xBadgeX + 6, xBadgeY + 10);

      // Origin Target Ring
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, 5.5 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draw Arrowhead helper
   */
  drawArrowhead(ctx, x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render Plotted Data Points strictly as sharp pencil crosses (×)
   * Sized clearly and precisely: exactly 2 small squares in width and length
   */
  renderPoints(ctx, theme) {
    const validPoints = PedagogyEngine.getValidPoints(this.state.points);
    if (validPoints.length === 0) return;

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const minorPix = majorPix / this.minorDivisions; // 1 small square (2mm)
    // Sized exactly 2 small squares in width and length: halfSize = minorPix
    const crossHalfSize = minorPix;

    ctx.save();
    ctx.strokeStyle = theme.pencilColor;
    ctx.lineWidth = Math.max(1.8, 2.0 * Math.min(1.4, this.zoom));

    validPoints.forEach((p) => {
      const screenPos = this.dataToScreen(p.x, p.y);

      // Sharp pencil cross '×' spanning exactly 2 small squares in width and length
      ctx.beginPath();
      ctx.moveTo(screenPos.x - crossHalfSize, screenPos.y - crossHalfSize);
      ctx.lineTo(screenPos.x + crossHalfSize, screenPos.y + crossHalfSize);
      ctx.moveTo(screenPos.x + crossHalfSize, screenPos.y - crossHalfSize);
      ctx.lineTo(screenPos.x - crossHalfSize, screenPos.y + crossHalfSize);
      ctx.stroke();
    });

    ctx.restore();
  }

  /**
   * Render Hover Preview Cross showing exact snapped coordinate when hovering graph paper
   */
  renderHoverPreview(ctx, theme) {
    // Only show hover preview if in Step 3 or later, or in sandbox mode!
    if (this.state.mode === 'walkthrough' && this.state.currentStep < 3) return;
    if (!this.isHoveringPaper || this.isDragging || this.draggingAxis || this.draggingLinePart || this.draggingTrianglePoint || !this.cursorDataCoords || !this.state) return;

    const { xScale, yScale } = this.state;
    const xPrec = PedagogyEngine.calculateAxisPrecision(xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(yScale);

    // In Step 5: Render a preview DOT snapped directly to the Best Fit Line
    if (this.state.currentStep === 5) {
      if (!this.state.bestFitLine) return;

      const { slope, intercept } = this.state.bestFitLine;
      const snappedX = Math.round(this.cursorDataCoords.x / xPrec.stepPrecision) * xPrec.stepPrecision;
      const lineY = slope * snappedX + intercept;
      const snappedY = Math.round(lineY / yPrec.stepPrecision) * yPrec.stepPrecision;
      const screenPos = this.dataToScreen(snappedX, snappedY);

      const majorPix = this.basePixelsPerMajor * this.zoom;

      ctx.save();
      // Outer glowing ring for preview dot
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8 * this.zoom;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 8 * this.zoom, 0, Math.PI * 2);
      ctx.stroke();

      // Solid preview DOT
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 4.5 * this.zoom, 0, Math.PI * 2);
      ctx.fill();

      // Small coordinate pill tag
      const xStr = PedagogyEngine.formatToDecPlaces(snappedX, xPrec.decimalPlaces);
      const yStr = PedagogyEngine.formatToDecPlaces(snappedY, yPrec.decimalPlaces);
      const label = `● Gradient Dot: (${xStr}, ${yStr}) · Click on line`;

      ctx.font = '600 10.5px Inter, sans-serif';
      const textW = ctx.measureText(label).width;
      const pillH = 18;
      const pillW = textW + 10;
      const pillX = Math.min(this.panX + this.gridMajorCols * majorPix - pillW - 6, screenPos.x + 10);
      const pillY = Math.max(this.panY + 6, screenPos.y - 24);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pillX + 5, pillY + pillH / 2);
      ctx.restore();
      return;
    }

    // Step 3 / 4 / Sandbox: Render Sharp Graphite Preview Cross (×)
    const snappedX = Math.round(this.cursorDataCoords.x / xPrec.stepPrecision) * xPrec.stepPrecision;
    const snappedY = Math.round(this.cursorDataCoords.y / yPrec.stepPrecision) * yPrec.stepPrecision;
    const screenPos = this.dataToScreen(snappedX, snappedY);

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const minorPix = majorPix / this.minorDivisions;
    const crossHalfSize = minorPix;

    ctx.save();
    // Faint cyan graphite preview cross
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
    ctx.lineWidth = Math.max(1.5, 1.8 * Math.min(1.4, this.zoom));
    ctx.beginPath();
    ctx.moveTo(screenPos.x - crossHalfSize, screenPos.y - crossHalfSize);
    ctx.lineTo(screenPos.x + crossHalfSize, screenPos.y + crossHalfSize);
    ctx.moveTo(screenPos.x + crossHalfSize, screenPos.y - crossHalfSize);
    ctx.lineTo(screenPos.x - crossHalfSize, screenPos.y + crossHalfSize);
    ctx.stroke();

    // Small coordinate pill tag
    const xStr = PedagogyEngine.formatToDecPlaces(snappedX, xPrec.decimalPlaces);
    const yStr = PedagogyEngine.formatToDecPlaces(snappedY, yPrec.decimalPlaces);
    const label = `(${xStr}, ${yStr}) · Click to plot`;

    ctx.font = '600 10.5px Inter, sans-serif';
    const textW = ctx.measureText(label).width;
    const pillH = 18;
    const pillW = textW + 10;
    const pillX = Math.min(this.panX + this.gridMajorCols * majorPix - pillW - 6, screenPos.x + 8);
    const pillY = Math.max(this.panY + 6, screenPos.y - 24);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + 5, pillY + pillH / 2);
    ctx.restore();
  }

  /**
   * Render Best Fit Line & Dotted Extrapolation fully to the left of the y-axis,
   * bottom of the x-axis, and beyond the graph paper boundary.
   */
  renderBestFitLine(ctx, theme, paperLeft, paperTop, paperW, paperH) {
    if (!this.state.bestFitLine) return;

    const { slope, intercept } = this.state.bestFitLine;
    const { xOrigin, xScale, numMajorX, yScale } = this.state;
    const majorPix = this.basePixelsPerMajor * this.zoom;

    // Normal grid / data range
    const minX = xOrigin;
    const maxX = xOrigin + (numMajorX || 10) * xScale;
    const pStart = this.dataToScreen(minX, slope * minX + intercept);
    const pEnd = this.dataToScreen(maxX, slope * maxX + intercept);

    // Screen boundaries extending 260px beyond the graph paper on all sides
    const extPad = 260 * this.zoom;
    const pLeft = (paperLeft !== undefined ? paperLeft : this.panX);
    const pTop = (paperTop !== undefined ? paperTop : this.panY);
    const pW = (paperW !== undefined ? paperW : this.gridMajorCols * majorPix);
    const pH = (paperH !== undefined ? paperH : this.gridMajorRows * majorPix);

    const boundLeft = pLeft - extPad;
    const boundRight = pLeft + pW + extPad;
    const boundTop = pTop - extPad;
    const boundBottom = pTop + pH + extPad;

    // Extrapolate in data coordinates
    const dataX_left = this.screenToData(boundLeft, 0).x;
    const dataX_right = this.screenToData(boundRight, 0).x;
    const dataY_bottom = this.screenToData(0, boundBottom).y;
    const dataY_top = this.screenToData(0, boundTop).y;

    let xExtrapLeft = Math.min(minX - 3.0 * xScale, dataX_left);
    let xExtrapRight = Math.max(maxX + 3.0 * xScale, dataX_right);

    if (Math.abs(slope) > 0.0001) {
      const xAtBottom = (dataY_bottom - intercept) / slope;
      const xAtTop = (dataY_top - intercept) / slope;
      if (slope > 0) {
        xExtrapLeft = Math.min(xExtrapLeft, xAtBottom);
        xExtrapRight = Math.max(xExtrapRight, xAtTop);
      } else {
        xExtrapLeft = Math.min(xExtrapLeft, xAtTop);
        xExtrapRight = Math.max(xExtrapRight, xAtBottom);
      }
    }

    const pExtrapStart = this.dataToScreen(xExtrapLeft, slope * xExtrapLeft + intercept);
    const pExtrapEnd = this.dataToScreen(xExtrapRight, slope * xExtrapRight + intercept);

    ctx.save();

    // 1. Highlight aura and handles if hovered, dragged, or in Step 4 / Sandbox
    const isStep4OrSandbox = (this.state.currentStep === 4 || this.state.mode === 'sandbox');
    const isHoveredOrDragged = (this.hoveredLinePart || this.draggingLinePart);

    if (isHoveredOrDragged || isStep4OrSandbox) {
      // Glowing aura when actively hovered or dragged
      if (isHoveredOrDragged) {
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 12 * this.zoom;
        ctx.beginPath();
        ctx.moveTo(pExtrapStart.x, pExtrapStart.y);
        ctx.lineTo(pExtrapEnd.x, pExtrapEnd.y);
        ctx.stroke();
        ctx.restore();
      }

      // Visible draggable pivot handles at pStart and pEnd
      ctx.save();
      ctx.fillStyle = isHoveredOrDragged ? '#f59e0b' : 'rgba(245, 158, 11, 0.90)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * this.zoom;
      ctx.beginPath();
      ctx.arc(pStart.x, pStart.y, 6.5 * this.zoom, 0, Math.PI * 2);
      ctx.arc(pEnd.x, pEnd.y, 6.5 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Centroid pivot handle if exists
      if (this.state.bestFitLine.xMean !== undefined && this.state.bestFitLine.yMean !== undefined) {
        const cPos = this.dataToScreen(this.state.bestFitLine.xMean, this.state.bestFitLine.yMean);
        ctx.fillStyle = '#9333ea';
        ctx.beginPath();
        ctx.arc(cPos.x, cPos.y, 5 * this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Interactive Drag Badge on the line
      const midX = (pStart.x + pEnd.x) / 2;
      const midY = (pStart.y + pEnd.y) / 2;
      ctx.font = '600 11px Inter, sans-serif';
      const badgeText = (this.hoveredLinePart === 'start' || this.hoveredLinePart === 'end')
        ? '⤾ Pivot Slope'
        : (isHoveredOrDragged ? '↕ Drag Line to Shift Intercept' : '↕ Drag Line · ⤾ Drag Handles');
      const bW = ctx.measureText(badgeText).width + 16;
      const bH = 20 * this.zoom;
      ctx.fillStyle = isHoveredOrDragged ? '#d97706' : 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(midX - bW / 2, midY - 26 * this.zoom, bW, bH, 4);
      else ctx.rect(midX - bW / 2, midY - 26 * this.zoom, bW, bH);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, midX, midY - 16 * this.zoom);
      ctx.restore();
    }

    // 2. Solid Best Fit Line drawn inside grid bounds:
    // Green when all 4 SLAP satisfied; Red if either one of SLAP is red; Pencil otherwise
    const isSLAP = Boolean(this.state && this.state.isSLAPSatisfied);
    const isRed = Boolean(this.state && this.state.isSLAPFailedRed);

    let lineColor = theme.pencilColor;
    let extrapColor = theme.pencilFaint;
    let lineWidth = 2.2;
    let extrapWidth = 1.8;

    if (isSLAP) {
      lineColor = '#10b981'; // Green (Mastered)
      extrapColor = 'rgba(16, 185, 129, 0.75)';
      lineWidth = 2.6;
      extrapWidth = 2.0;
    } else if (isRed) {
      lineColor = '#ef4444'; // Red (SLAP criteria issue)
      extrapColor = 'rgba(239, 68, 68, 0.75)';
      lineWidth = 2.6;
      extrapWidth = 2.0;
    }

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.stroke();
    ctx.restore();

    // 3. Full Extrapolation (Dashed Line spanning beyond graph paper)
    if (this.state.showExtrapolation) {
      ctx.save();
      ctx.setLineDash([6 * this.zoom, 4 * this.zoom]);
      ctx.strokeStyle = extrapColor;
      ctx.lineWidth = extrapWidth;

      // Backward extrapolation: past Y-axis, below X-axis, beyond paper
      ctx.beginPath();
      ctx.moveTo(pExtrapStart.x, pExtrapStart.y);
      ctx.lineTo(pStart.x, pStart.y);
      ctx.stroke();

      // Forward extrapolation: past grid right/top, beyond paper
      ctx.beginPath();
      ctx.moveTo(pEnd.x, pEnd.y);
      ctx.lineTo(pExtrapEnd.x, pExtrapEnd.y);
      ctx.stroke();
      ctx.restore();

      // 4. Intercept Markers and Handwritten Annotations
      const yPrec = PedagogyEngine.calculateAxisPrecision(this.state.yScale);
      const xPrec = PedagogyEngine.calculateAxisPrecision(this.state.xScale);

      // Y-intercept marker (at x = 0)
      const yIntPos = this.dataToScreen(0, intercept);
      ctx.save();
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(yIntPos.x, yIntPos.y, 4 * this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const yIntStr = PedagogyEngine.formatToDecPlaces(intercept, yPrec.decimalPlaces);
      const yLabel = `y-int = ${yIntStr}`;
      ctx.font = `700 ${Math.max(12, 13 * this.zoom)}px ${this.handwritingFont}`;
      const yTextW = ctx.measureText(yLabel).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(yIntPos.x - yTextW - 14 * this.zoom, yIntPos.y - 10 * this.zoom, yTextW + 8 * this.zoom, 20 * this.zoom);
      ctx.fillStyle = '#b91c1c';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(yLabel, yIntPos.x - 10 * this.zoom, yIntPos.y);
      ctx.restore();

      // X-intercept marker (at y = 0, where x = -intercept / slope)
      if (Math.abs(slope) > 0.0001) {
        const xInt = -intercept / slope;
        const xIntPos = this.dataToScreen(xInt, 0);
        ctx.save();
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(xIntPos.x, xIntPos.y, 4 * this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const xIntStr = PedagogyEngine.formatToDecPlaces(xInt, xPrec.decimalPlaces);
        const xLabel = `x-int = ${xIntStr}`;
        ctx.font = `700 ${Math.max(12, 13 * this.zoom)}px ${this.handwritingFont}`;
        const xTextW = ctx.measureText(xLabel).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillRect(xIntPos.x - xTextW / 2 - 4 * this.zoom, xIntPos.y + 7 * this.zoom, xTextW + 8 * this.zoom, 18 * this.zoom);
        ctx.fillStyle = '#b91c1c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(xLabel, xIntPos.x, xIntPos.y + 8 * this.zoom);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /**
   * Render Large Gradient Triangle with handwritten coordinates
   * Only renders when 5 or more points are plotted
   */
  renderGradientTriangle(ctx, theme) {
    const validPoints = PedagogyEngine.getValidPoints(this.state.points);
    if (validPoints.length < 5 || !this.state.bestFitLine) return;
    if (!this.state.gradientTriangle) return;

    const { p1, p2 } = this.state.gradientTriangle;
    const hasP1 = p1 && p1.x !== null && !isNaN(p1.x);
    const hasP2 = p2 && p2.x !== null && !isNaN(p2.x);
    if (!hasP1 && !hasP2) return;

    const xPrec = PedagogyEngine.calculateAxisPrecision(this.state.xScale);
    const yPrec = PedagogyEngine.calculateAxisPrecision(this.state.yScale);
    const isStep5 = (this.state.currentStep === 5 || this.state.mode === 'sandbox');

    ctx.save();

    // If both points are set, draw the right-angled triangle legs and corner
    if (hasP1 && hasP2) {
      const s1 = this.dataToScreen(p1.x, p1.y);
      const s2 = this.dataToScreen(p2.x, p2.y);
      const corner = this.dataToScreen(p2.x, p1.y);

      ctx.strokeStyle = theme.gradientTriangle;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6 * this.zoom, 4 * this.zoom]);

      // Right-Angled Triangle Legs
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(corner.x, corner.y); // Δx horizontal
      ctx.lineTo(s2.x, s2.y);         // Δy vertical
      ctx.stroke();

      // Right angle symbol
      ctx.setLineDash([]);
      const cornerSize = 9 * this.zoom;
      ctx.beginPath();
      ctx.moveTo(corner.x - cornerSize, corner.y);
      ctx.lineTo(corner.x - cornerSize, corner.y - cornerSize);
      ctx.lineTo(corner.x, corner.y - cornerSize);
      ctx.stroke();
    }

    // Helper to draw a prominent gradient measurement DOT
    const drawGradientDot = (pt, label, isTop, pointKey) => {
      const screenPt = this.dataToScreen(pt.x, pt.y);
      const isHoveredOrDragged = (this.hoveredTrianglePoint === pointKey || this.draggingTrianglePoint === pointKey);

      // Interactive ring / glowing aura in Step 5 or when hovered/dragged
      if (isStep5 || isHoveredOrDragged) {
        ctx.save();
        ctx.fillStyle = isHoveredOrDragged ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.18)';
        ctx.beginPath();
        ctx.arc(screenPt.x, screenPt.y, 11 * this.zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isHoveredOrDragged ? '#0891b2' : '#06b6d4';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3 * this.zoom, 3 * this.zoom]);
        ctx.beginPath();
        ctx.arc(screenPt.x, screenPt.y, 11 * this.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Crisp white backing ring for contrast against paper grid
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenPt.x, screenPt.y, 6.5 * this.zoom, 0, Math.PI * 2);
      ctx.fill();

      // Sharp solid DOT
      ctx.fillStyle = theme.gradientTriangle || '#0284c7';
      ctx.beginPath();
      ctx.arc(screenPt.x, screenPt.y, 4.5 * this.zoom, 0, Math.PI * 2);
      ctx.fill();

      // Handwritten coordinate label
      ctx.font = `700 ${Math.max(13, 14 * this.zoom)}px ${this.handwritingFont}`;
      ctx.fillStyle = theme.gradientText;
      if (isTop) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        this.drawHandwrittenNote(ctx, label, screenPt.x + 8 * this.zoom, screenPt.y - 6 * this.zoom, true);
      } else {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        this.drawHandwrittenNote(ctx, label, screenPt.x - 8 * this.zoom, screenPt.y - 6 * this.zoom, false);
      }
    };

    if (hasP1) {
      const p1Label = `● P₁ (${PedagogyEngine.formatToDecPlaces(p1.x, xPrec.decimalPlaces)}, ${PedagogyEngine.formatToDecPlaces(p1.y, yPrec.decimalPlaces)})`;
      drawGradientDot(p1, p1Label, false, 'p1');
    }

    if (hasP2) {
      const p2Label = `● P₂ (${PedagogyEngine.formatToDecPlaces(p2.x, xPrec.decimalPlaces)}, ${PedagogyEngine.formatToDecPlaces(p2.y, yPrec.decimalPlaces)})`;
      drawGradientDot(p2, p2Label, true, 'p2');
    }

    ctx.restore();
  }

  /**
   * Draw handwritten coordinate note with clean white badge
   */
  drawHandwrittenNote(ctx, text, x, y, isTop) {
    const metrics = ctx.measureText(text);
    const padX = 6 * this.zoom;
    const padY = 3 * this.zoom;
    const w = metrics.width + padX * 2;
    const h = 20 * this.zoom;
    const isRightAlign = (ctx.textAlign === 'right');

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const boxX = isRightAlign ? x - w : x;
    const boxY = isTop ? y - h : y - h / 2;
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, w, h, 4);
    else ctx.rect(boxX, boxY, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(text, boxX + padX, boxY + h / 2);
    ctx.restore();
  }

  /**
   * Render Centroid (Mean Point)
   */
  renderCentroid(ctx, theme) {
    const { xMean, yMean } = this.state.bestFitLine;
    const screenPos = this.dataToScreen(xMean, yMean);

    ctx.save();
    ctx.fillStyle = '#9333ea';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 5 * this.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 ${Math.max(12, 13 * this.zoom)}px ${this.handwritingFont}`;
    ctx.fillStyle = '#6b21a8';
    ctx.textAlign = 'left';
    ctx.fillText(`Centroid (x̄, ȳ)`, screenPos.x + 8 * this.zoom, screenPos.y);
    ctx.restore();
  }

  /**
   * Export high-resolution PNG image of the graph sheet
   */
  exportImage() {
    const exportCanvas = document.createElement('canvas');
    const scale = 2;
    const rect = this.canvas.getBoundingClientRect();
    exportCanvas.width = rect.width * scale;
    exportCanvas.height = rect.height * scale;
    const expCtx = exportCanvas.getContext('2d');
    expCtx.scale(scale, scale);

    const origCtx = this.ctx;
    this.ctx = expCtx;
    this.render();
    this.ctx = origCtx;

    const link = document.createElement('a');
    link.download = `best_fit_graph_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  /**
   * =========================================================================
   * ANIMALS WALKING BEHIND GRAPH PAPER (Humor Feature: Cats, Dogs, Birds, Rabbits)
   * =========================================================================
   */
  setShowAnimals(enabled) {
    this.showAnimals = Boolean(enabled);
    if (this.showAnimals) {
      this.startAnimalLoop();
    } else {
      this.stopAnimalLoop();
    }
  }

  get paperHeightPx() {
    return this.gridMajorRows * (this.basePixelsPerMajor * this.zoom);
  }

  get paperWidthPx() {
    return this.gridMajorCols * (this.basePixelsPerMajor * this.zoom);
  }

  isAnimalInFront(animal, paperTop = null, paperH = null) {
    if (!this.showAnimals) return false;
    if (!animal || (animal.type !== 'cat' && animal.type !== 'dog')) return false;

    const actualPaperH = (paperH !== null && paperH > 0) ? paperH : this.paperHeightPx;
    const actualPaperTop = (paperTop !== null) ? paperTop : this.panY;
    if (actualPaperH <= 0) return false;

    // Check if vertical position is within +/-10% of the top or bottom edge of the graph paper
    const band = 0.10 * actualPaperH;
    const paperBottom = actualPaperTop + actualPaperH;
    const isAtTop = (animal.y >= actualPaperTop - band && animal.y <= actualPaperTop + band);
    const isAtBottom = (animal.y >= paperBottom - band && animal.y <= paperBottom + band);

    if (!isAtTop && !isAtBottom) return false;

    // 50% allowed to be in front
    if (animal.inFrontAllowed === undefined) {
      animal.inFrontAllowed = (Math.random() < 0.5);
    }
    return Boolean(animal.inFrontAllowed);
  }

  initAnimals() {
    const rect = this.container ? this.container.getBoundingClientRect() : null;
    const w = (rect && rect.width > 0) ? rect.width : 1000;
    const h = (rect && rect.height > 0) ? rect.height : 800;

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const paperH = this.gridMajorRows * majorPix;
    const paperTop = this.panY || 30;
    const paperBottom = paperTop + paperH;
    const band = 0.10 * paperH;

    this.animals = [
      {
        id: 'cat_orange',
        type: 'cat',
        breed: 'orange',
        x: 80,
        y: paperTop + band * 0.35, // within +10% top band
        speed: 1.1,
        dir: 1,
        scale: 0.9,
        phase: 0,
        state: 'walk',
        stateTimer: 7.0,
        inFrontAllowed: true, // 50% allowed: In Front!
        name: 'Ginger'
      },
      {
        id: 'cat_tuxedo',
        type: 'cat',
        breed: 'tuxedo',
        x: 480,
        y: paperTop - band * 0.4, // within -10% top band
        speed: 0.95,
        dir: 1,
        scale: 0.82,
        phase: 2.5,
        state: 'walk',
        stateTimer: 5.5,
        inFrontAllowed: false, // 50% not allowed: Behind!
        name: 'Oreo'
      },
      {
        id: 'dog_golden',
        type: 'dog',
        breed: 'golden',
        x: Math.max(800, w - 100),
        y: paperBottom - band * 0.35, // within -10% bottom band
        speed: 1.4,
        dir: -1,
        scale: 0.95,
        phase: 0,
        inFrontAllowed: true, // 50% allowed: In Front!
        name: 'Buddy'
      },
      {
        id: 'dog_corgi',
        type: 'dog',
        breed: 'corgi',
        x: Math.max(700, w - 240),
        y: paperBottom + band * 0.35, // within +10% bottom band
        speed: 1.2,
        dir: -1,
        scale: 0.82,
        phase: 1.2,
        inFrontAllowed: false, // 50% not allowed: Behind!
        name: 'Waffles'
      },
      {
        id: 'bird_blue',
        type: 'bird',
        breed: 'bluebird',
        x: 150,
        y: Math.max(35, paperTop - 45),
        baseY: Math.max(35, paperTop - 45),
        speed: 2.2,
        dir: 1,
        scale: 0.8,
        phase: 0,
        name: 'Pip'
      },
      {
        id: 'rabbit_white',
        type: 'rabbit',
        breed: 'white',
        x: Math.max(760, w - 140),
        y: Math.min(h - 45, paperBottom + 35),
        speed: 1.3,
        dir: -1,
        scale: 0.85,
        phase: 0,
        name: 'Snowball'
      }
    ];
  }

  startAnimalLoop() {
    if (this.animalAnimId) return;
    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (!this.showAnimals) {
        this.animalAnimId = null;
        return;
      }
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      this.updateAnimals(dt);
      this.render();

      this.animalAnimId = requestAnimationFrame(loop);
    };

    this.animalAnimId = requestAnimationFrame(loop);
  }

  stopAnimalLoop() {
    if (this.animalAnimId) {
      cancelAnimationFrame(this.animalAnimId);
      this.animalAnimId = null;
    }
    this.render();
  }

  updateAnimals(dt) {
    if (!this.animals) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 1000;
    const height = rect.height || 800;

    const majorPix = this.basePixelsPerMajor * this.zoom;
    const paperH = this.gridMajorRows * majorPix;
    const paperTop = this.panY || 30;
    const paperBottom = paperTop + paperH;
    const band = 0.10 * paperH;

    for (const animal of this.animals) {
      // Pause autonomous movement while actively dragging this animal
      if (this.draggingAnimal === animal) continue;

      if (animal.type === 'cat') {
        animal.stateTimer -= dt;
        if (animal.stateTimer <= 0) {
          if (animal.state === 'walk') {
            animal.state = 'sit';
            animal.stateTimer = 1.8;
          } else {
            animal.state = 'walk';
            animal.stateTimer = 6.0 + Math.random() * 4.0;
          }
        }
      }

      if (animal.state !== 'sit') {
        animal.x += animal.dir * animal.speed * 60 * dt;
        animal.phase += dt * (animal.type === 'bird' ? 4.0 : 4.5);
      } else {
        animal.phase += dt * 1.5;
      }

      // Flying bird wave
      if (animal.type === 'bird') {
        animal.y = animal.baseY + Math.sin(animal.x * 0.018) * 18;
      }

      // Wrapping boundaries
      if (animal.dir === 1 && animal.x > width + 90) {
        animal.x = -90;
        if (animal.type === 'cat' || animal.type === 'dog') {
          animal.inFrontAllowed = (Math.random() < 0.5); // 50% allowed in front
          const track = Math.random();
          if (track < 0.40) {
            animal.y = paperTop + (Math.random() * 2 - 1) * band;
          } else if (track < 0.80) {
            animal.y = paperBottom + (Math.random() * 2 - 1) * band;
          } else {
            animal.y = paperTop + paperH * (0.25 + Math.random() * 0.5);
          }
        } else if (animal.type === 'bird') {
          animal.baseY = Math.max(35, paperTop - 30 - Math.random() * 30);
        } else if (animal.type === 'rabbit') {
          animal.y = Math.min(height - 45, paperBottom + 10 + Math.random() * 40);
        }
      } else if (animal.dir === -1 && animal.x < -90) {
        animal.x = width + 90;
        if (animal.type === 'cat' || animal.type === 'dog') {
          animal.inFrontAllowed = (Math.random() < 0.5); // 50% allowed in front
          const track = Math.random();
          if (track < 0.40) {
            animal.y = paperTop + (Math.random() * 2 - 1) * band;
          } else if (track < 0.80) {
            animal.y = paperBottom + (Math.random() * 2 - 1) * band;
          } else {
            animal.y = paperTop + paperH * (0.25 + Math.random() * 0.5);
          }
        } else if (animal.type === 'bird') {
          animal.baseY = Math.max(35, paperTop - 30 - Math.random() * 30);
        } else if (animal.type === 'rabbit') {
          animal.y = Math.min(height - 45, paperBottom + 10 + Math.random() * 40);
        }
      }
    }
  }

  renderAnimals(ctx, width, height, theme, inFrontMode = false, paperTop = 0, paperH = 0) {
    if (!this.animals) return;
    for (const animal of this.animals) {
      const isInFront = this.isAnimalInFront(animal, paperTop, paperH);
      if (inFrontMode !== isInFront) continue;

      ctx.save();
      if (isInFront) {
        // Soft realistic shadow cast directly on the graph paper
        ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
        ctx.shadowBlur = 6 * this.zoom;
        ctx.shadowOffsetY = 3 * this.zoom;
      }

      switch (animal.type) {
        case 'cat':
          this.drawCat(ctx, animal, theme);
          break;
        case 'dog':
          this.drawDog(ctx, animal, theme);
          break;
        case 'bird':
          this.drawBird(ctx, animal, theme);
          break;
        case 'rabbit':
          this.drawRabbit(ctx, animal, theme);
          break;
      }

      // Interactive Drag & Hover Badge Indicator
      if (this.hoveredAnimal === animal || this.draggingAnimal === animal) {
        ctx.save();
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(animal.x, animal.y - 10, 28 * this.zoom, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '600 10.5px Inter, sans-serif';
        const isDragging = this.draggingAnimal === animal;
        const statusText = isDragging 
          ? `🐾 Dragging ${animal.name} (${isInFront ? 'In Front' : 'Behind'})`
          : `🐾 ${animal.name} (${isInFront ? 'In Front' : 'Behind'}) · Drag Me`;
        const textW = ctx.measureText(statusText).width;
        const pillW = textW + 14;
        const pillH = 19;
        const pillX = animal.x - pillW / 2;
        const pillY = animal.y - 48 * this.zoom;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 4);
        else ctx.rect(pillX, pillY, pillW, pillH);
        ctx.fill();

        ctx.strokeStyle = isInFront ? '#10b981' : '#ec4899';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(statusText, animal.x, pillY + pillH / 2);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  drawCat(ctx, animal, theme) {
    ctx.save();
    ctx.translate(animal.x, animal.y);
    ctx.scale(animal.dir * animal.scale, animal.scale);

    const isOrange = animal.breed === 'orange';
    const mainColor = isOrange ? '#f97316' : '#1e293b';
    const accentColor = isOrange ? '#ea580c' : '#0f172a';
    const bellyColor = isOrange ? '#ffedd5' : '#f8fafc';
    const eyeColor = isOrange ? '#10b981' : '#facc15';

    // Tail (sways gracefully)
    const tailAngle = Math.sin(animal.phase * 0.8) * 0.35;
    ctx.save();
    ctx.translate(-22, -10);
    ctx.rotate(tailAngle);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-18, -12, -22, -28);
    ctx.stroke();
    if (!isOrange) {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-18, -20);
      ctx.lineTo(-22, -28);
      ctx.stroke();
    }
    ctx.restore();

    // Leg swings
    const legPhase = animal.state === 'walk' ? animal.phase : 0;
    const leg1 = Math.sin(legPhase) * 12;
    const leg2 = Math.sin(legPhase + Math.PI) * 12;
    const leg3 = Math.sin(legPhase + Math.PI * 0.5) * 12;
    const leg4 = Math.sin(legPhase + Math.PI * 1.5) * 12;

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    // Back leg far
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-14 + leg3 * 0.7, 10);
    ctx.stroke();

    // Front leg far
    ctx.beginPath();
    ctx.moveTo(14, -4);
    ctx.lineTo(14 + leg1 * 0.7, 10);
    ctx.stroke();

    // Body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, -8, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly patch
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(4, -4, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tabby stripes if orange
    if (isOrange) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -18); ctx.lineTo(-4, -10);
      ctx.moveTo(2, -19); ctx.lineTo(3, -11);
      ctx.moveTo(10, -18); ctx.lineTo(9, -10);
      ctx.stroke();
    }

    // Near legs
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4.5;
    // Back leg near
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-10 + leg4 * 0.8, 11);
    ctx.stroke();
    // Front leg near
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(18 + leg2 * 0.8, 11);
    ctx.stroke();

    // White paws
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-10 + leg4 * 0.8, 11, 2.5, 0, Math.PI * 2);
    ctx.arc(18 + leg2 * 0.8, 11, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(22, -18, 11, 0, Math.PI * 2);
    ctx.fill();

    // Pointy Ears
    ctx.beginPath();
    ctx.moveTo(16, -26); ctx.lineTo(19, -36); ctx.lineTo(24, -28);
    ctx.moveTo(23, -28); ctx.lineTo(28, -36); ctx.lineTo(31, -25);
    ctx.fill();

    // Pink inner ears
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(18, -26); ctx.lineTo(20, -33); ctx.lineTo(23, -28);
    ctx.moveTo(25, -28); ctx.lineTo(27, -33); ctx.lineTo(29, -26);
    ctx.fill();

    // Eyes
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(26, -19, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(26, -19, 1.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute pink nose
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(31, -16, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(29, -15); ctx.lineTo(38, -17);
    ctx.moveTo(29, -14); ctx.lineTo(39, -13);
    ctx.moveTo(29, -13); ctx.lineTo(37, -9);
    ctx.stroke();

    ctx.restore();
  }

  drawDog(ctx, animal, theme) {
    ctx.save();
    ctx.translate(animal.x, animal.y);
    ctx.scale(animal.dir * animal.scale, animal.scale);

    const mainColor = '#f59e0b';
    const darkColor = '#d97706';
    const bellyColor = '#fef3c7';

    // Tail (wagging enthusiastically)
    const tailWag = Math.sin(animal.phase * 3.5) * 0.45;
    ctx.save();
    ctx.translate(-24, -14);
    ctx.rotate(tailWag);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -16, -12, -26);
    ctx.stroke();
    ctx.restore();

    // Trotting legs
    const legPhase = animal.phase;
    const l1 = Math.sin(legPhase) * 14;
    const l2 = Math.sin(legPhase + Math.PI) * 14;
    const l3 = Math.sin(legPhase + Math.PI * 0.5) * 14;
    const l4 = Math.sin(legPhase + Math.PI * 1.5) * 14;

    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-16, -4); ctx.lineTo(-16 + l3 * 0.7, 12); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, -4); ctx.lineTo(16 + l1 * 0.7, 12); ctx.stroke();

    // Body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, -9, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly patch
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(2, -4, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Near legs
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.lineTo(-10 + l4 * 0.8, 13); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, -4); ctx.lineTo(20 + l2 * 0.8, 13); ctx.stroke();

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(26, -20, 13, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.beginPath();
    ctx.ellipse(36, -16, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black Nose
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(42, -18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(29, -23, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(30, -24, 1, 0, Math.PI * 2);
    ctx.fill();

    // Floppy Ear
    const earBob = Math.sin(animal.phase * 1.5) * 0.2;
    ctx.save();
    ctx.translate(20, -26);
    ctx.rotate(earBob);
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(0, 8, 5, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Collar with tag
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, -12); ctx.lineTo(25, -9);
    ctx.stroke();
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(23, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pink tongue
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(38, -12, 2.5, 0, Math.PI);
    ctx.fill();

    ctx.restore();
  }

  drawBird(ctx, animal, theme) {
    ctx.save();
    ctx.translate(animal.x, animal.y);
    ctx.scale(animal.dir * animal.scale, animal.scale);

    const flap = Math.sin(animal.phase * 2.8);

    // Body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath();
    ctx.ellipse(2, 3, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail feathers
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.lineTo(-24, -7);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-25, 4);
    ctx.lineTo(-13, 3);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(14, -6, 7, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(20, -7);
    ctx.lineTo(28, -5);
    ctx.lineTo(20, -3);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(16, -8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16.6, -8.6, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.save();
    ctx.translate(-2, -3);
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (flap > 0) {
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-4, -18 * flap, 6, -22 * flap);
      ctx.quadraticCurveTo(8, -10 * flap, 6, 0);
    } else {
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-4, -12 * flap, 8, -18 * flap);
      ctx.quadraticCurveTo(8, -6 * flap, 6, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  drawRabbit(ctx, animal, theme) {
    ctx.save();
    const hopVal = Math.sin(animal.phase * 2.0);
    const hopOffset = hopVal > 0 ? -hopVal * 16 : 0;
    const isAirborne = hopOffset < -2;

    ctx.translate(animal.x, animal.y + hopOffset);
    const squishY = isAirborne ? 1.08 : 0.92;
    const squishX = isAirborne ? 0.94 : 1.06;
    ctx.scale(animal.dir * animal.scale * squishX, animal.scale * squishY);

    const furColor = '#ffffff';
    const earInner = '#fbcfe8';

    // Tail
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(-20, -8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Back leg
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.ellipse(-10, -4, 11, 7, isAirborne ? 0.4 : 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(0, -9, 20, 14, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Front paw
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(14, -2, 5, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(16, -18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    const earTilt = isAirborne ? -0.3 : 0.05;
    ctx.save();
    ctx.translate(12, -26);
    ctx.rotate(earTilt);
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(-3, -12, 4.5, 14, -0.15, 0, Math.PI * 2);
    ctx.ellipse(4, -13, 4.5, 14, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = earInner;
    ctx.beginPath();
    ctx.ellipse(-3, -12, 2.5, 10, -0.15, 0, Math.PI * 2);
    ctx.ellipse(4, -13, 2.5, 10, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#be185d';
    ctx.beginPath();
    ctx.arc(20, -19, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(20.7, -19.7, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(24, -15, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(23, -14); ctx.lineTo(31, -16);
    ctx.moveTo(23, -13); ctx.lineTo(32, -12);
    ctx.stroke();

    ctx.restore();
  }
}
