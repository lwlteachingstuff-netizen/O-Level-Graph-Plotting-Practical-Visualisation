# Best Fit Line Master: Science Practical Graph Skills Simulator

An interactive web simulator and pedagogical tool for teaching and mastering **Line of Best Fit** graphing according to **Singapore (GCE O-Level / A-Level)** and **Cambridge International** science practical examination standards.

---

## 🌟 Key Features

### 1. **SLAP Framework & Master Criteria**
- **[S]cale**: Ensures scale uses standard multiples ($1, 2, 5, 10 \times 10^k$). Enforces the **$\ge 50\%$ (ideally $\ge 75\%$)** graph paper area occupancy rule in both $x$ and $y$ dimensions with live progress bars.
- **[L]ine**: Evaluates balance of experimental data points (equal points above and below the line) and provides centroid $(\bar{x}, \bar{y})$ visualization.
- **[A]xis**: Formats headings and units using standard **Solidus Notation** ($T^2\ /\ 10^{-2}\text{ s}^2$, $\lg(h/\text{m})$, $V\ /\ \text{V}$) with live KaTeX preview.
- **[P]oints**: Supports plotting **5 to 20 experimental points** using sharp examination symbols ($\times$, $+$, $\odot$) constrained strictly within 1 small square.

### 2. **Half Smallest Division Precision Engine ($D/20$ Rule)**
Calculates required decimal places independently for the $x$-axis and $y$-axis:
1. Determine interval for 1 big square, $D$.
2. Find half the smallest division: $x = \frac{D}{20}$ (since 1 big square = 10 small divisions).
3. Round $x$ to 1 significant figure.
4. Derive required decimal places from the rounded value.
   - Example: $D_x = 1.00 \rightarrow \frac{1}{2}\text{ div} = 0.05 \rightarrow \mathbf{2\text{ d.p.}}$ (`1.00`, `2.00`...)
   - Example: $D_y = 0.020 \rightarrow \frac{1}{2}\text{ div} = 0.001 \rightarrow \mathbf{3\text{ d.p.}}$ (`0.020`, `0.040`...)

### 3. **Virtual 30 cm Acrylic Ruler Tool**
- Realistic translucent 30 cm ruler with millimeter ($1\text{ mm}$), half-centimeter ($5\text{ mm}$), and labeled centimeter ($0\text{ to }30\text{ cm}$) gradations.
- Center drag handle for repositioning across the paper.
- Dual rotation handles at the $0\text{ cm}$ and $30\text{ cm}$ ends with real-time angle display.
- **Auto-align** ruler to best fit line.
- **Draw Line Along Ruler** button to transfer ruler alignment directly to the graph's best fit line.

### 4. **Large Gradient Triangle ($\ge 50\% / 75\%$ Rule) & Math Working**
- Generates large dotted gradient triangles that cover $\ge 50\%$ (recommended $\ge 75\%$) of the grid.
- Enforces exam rule: **gradient points are read from the drawn line**, not raw data points.
- Annotates vertices $(x_1, y_1)$ and $(x_2, y_2)$ on the graph paper using half-division precision.
- Displays full step-by-step KaTeX mathematical working:
  $$m = \frac{y_2 - y_1}{x_2 - x_1} = \frac{\Delta y}{\Delta x}$$
- Calculates gradient value and rounds to correct **significant figures (s.f.)**.
- Highlights $y$-intercept $(0, c)$ and $x$-intercept with dotted extrapolation.

### 5. **Interactive Graph Paper Viewport**
- Smooth **Pan** (drag canvas) and **Zoom** (mouse wheel / zoom controls / touch).
- 3 Grid Themes: Exam Green, Classic Cyan, Warm Sepia.
- High-Resolution PNG Image Export.
- Step-by-Step Guided Teaching Mode & Free Sandbox Mode.

---

## 🚀 How to Run
Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
No build step or server required!
