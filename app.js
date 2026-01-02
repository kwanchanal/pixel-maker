const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext("2d");
const layerCanvas = document.getElementById("layer-canvas");
const layerCtx = layerCanvas.getContext("2d");
const preview = document.getElementById("mini-preview");
const previewCtx = preview.getContext("2d");

const colorPicker = document.getElementById("color-picker");
const palette = document.getElementById("palette");
const toolButtons = document.getElementById("tool-buttons");
const brushSizeInput = document.getElementById("brush-size");
const brushSizeLabel = document.getElementById("brush-size-label");
const gridSizeSelect = document.getElementById("grid-size");
const newGridButton = document.getElementById("new-grid");
const gridToggle = document.getElementById("grid-toggle");
const zoomInput = document.getElementById("zoom");
const zoomLabel = document.getElementById("zoom-label");
const clearButton = document.getElementById("clear");
const fillButton = document.getElementById("fill");
const layerImageInput = document.getElementById("layer-image");
const layerToggleButton = document.getElementById("layer-toggle");
const layerClearButton = document.getElementById("layer-clear");
const layerOpacityInput = document.getElementById("layer-opacity");
const layerOpacityLabel = document.getElementById("layer-opacity-label");
const layerZoomInput = document.getElementById("layer-zoom");
const layerZoomLabel = document.getElementById("layer-zoom-label");
const layerRotateInput = document.getElementById("layer-rotate");
const layerRotateLabel = document.getElementById("layer-rotate-label");
const savePngButton = document.getElementById("save-png");
const saveJsonButton = document.getElementById("save-json");
const loadJsonInput = document.getElementById("load-json");
const coordsLabel = document.getElementById("coords");

const paletteColors = [
  "#ff4d6d",
  "#f97316",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#38bdf8",
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#f8fafc",
  "#0f172a",
  "#1f2937",
  "#334155",
  "#475569",
  "#94a3b8",
];

let gridSize = Number(gridSizeSelect.value);
let cellSize = Number(zoomInput.value);
let brushSize = Number(brushSizeInput.value);
let showGrid = gridToggle.checked;
let currentColor = colorPicker.value;
let currentTool = "brush";
let isDrawing = false;
let pixels = createGrid(gridSize);
const undoStack = [];
const maxUndoSteps = 50;
let overlayImage = null;
let overlayVisible = true;
let overlayOpacity = Number(layerOpacityInput.value) / 100;
let overlayScale = Number(layerZoomInput.value) / 100;
let overlayRotation = Number(layerRotateInput.value);

function createGrid(size) {
  return new Array(size * size).fill(null);
}

function getIndex(x, y) {
  return y * gridSize + x;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = gridSize * cellSize * dpr;
  canvas.height = gridSize * cellSize * dpr;
  canvas.style.width = `${gridSize * cellSize}px`;
  canvas.style.height = `${gridSize * cellSize}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layerCanvas.width = gridSize * cellSize * dpr;
  layerCanvas.height = gridSize * cellSize * dpr;
  layerCanvas.style.width = `${gridSize * cellSize}px`;
  layerCanvas.style.height = `${gridSize * cellSize}px`;
  layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i += 1) {
    const pos = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, gridSize * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(gridSize * cellSize, pos);
    ctx.stroke();
  }
}

function draw() {
  ctx.fillStyle = "#0a0c10";
  ctx.fillRect(0, 0, gridSize * cellSize, gridSize * cellSize);

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const color = pixels[getIndex(x, y)];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  if (showGrid) {
    drawGrid();
  }

  drawPreview();
  drawOverlay();
}

function drawPreview() {
  const scale = preview.width / gridSize;
  previewCtx.clearRect(0, 0, preview.width, preview.height);
  previewCtx.fillStyle = "#0a0c10";
  previewCtx.fillRect(0, 0, preview.width, preview.height);

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const color = pixels[getIndex(x, y)];
      if (color) {
        previewCtx.fillStyle = color;
        previewCtx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
}

function drawOverlay() {
  layerCtx.clearRect(0, 0, gridSize * cellSize, gridSize * cellSize);
  if (!overlayVisible || !overlayImage) {
    return;
  }
  const canvasSize = gridSize * cellSize;
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const baseScale = Math.min(
    canvasSize / overlayImage.width,
    canvasSize / overlayImage.height
  );
  const drawWidth = overlayImage.width * baseScale * overlayScale;
  const drawHeight = overlayImage.height * baseScale * overlayScale;
  const radians = (overlayRotation * Math.PI) / 180;

  layerCtx.save();
  layerCtx.globalAlpha = overlayOpacity;
  layerCtx.translate(centerX, centerY);
  layerCtx.rotate(radians);
  layerCtx.drawImage(
    overlayImage,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  layerCtx.restore();
}

function setTool(tool) {
  currentTool = tool;
  [...toolButtons.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
}

function updateBrushSize(value) {
  brushSize = Number(value);
  brushSizeLabel.textContent = brushSize;
}

function setCell(x, y, color) {
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
    return;
  }
  pixels[getIndex(x, y)] = color;
}

function pushUndo() {
  undoStack.push({
    gridSize,
    pixels: pixels.slice(),
  });
  if (undoStack.length > maxUndoSteps) {
    undoStack.shift();
  }
}

function restoreState(state) {
  gridSize = Number(state.gridSize);
  gridSizeSelect.value = String(gridSize);
  const totalCells = gridSize * gridSize;
  pixels = state.pixels.slice(0, totalCells);
  if (pixels.length < totalCells) {
    pixels = pixels.concat(new Array(totalCells - pixels.length).fill(null));
  }
  resizeCanvas();
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) {
    return;
  }
  restoreState(previous);
}

function paintAt(x, y) {
  const half = Math.floor(brushSize / 2);
  for (let dy = -half; dy < -half + brushSize; dy += 1) {
    for (let dx = -half; dx < -half + brushSize; dx += 1) {
      const color = currentTool === "eraser" ? null : currentColor;
      setCell(x + dx, y + dy, color);
    }
  }
  draw();
}

function updateCoords(x, y) {
  coordsLabel.textContent = `x: ${x} y: ${y}`;
}

function getCellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / cellSize);
  const y = Math.floor((event.clientY - rect.top) / cellSize);
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
    return null;
  }
  return { x, y };
}

canvas.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    canvas.focus?.();
    canvas.style.touchAction = "none";
  const cell = getCellFromEvent(event);
  if (!cell) {
    return;
  }
  canvas.setPointerCapture(event.pointerId);
  isDrawing = true;
  pushUndo();
  paintAt(cell.x, cell.y);
  },
  { passive: false }
);

canvas.addEventListener(
  "pointermove",
  (event) => {
    if (isDrawing) {
      event.preventDefault();
    }
  const cell = getCellFromEvent(event);
  if (!cell) {
    return;
  }
  updateCoords(cell.x, cell.y);
  if (isDrawing) {
    paintAt(cell.x, cell.y);
  }
  },
  { passive: false }
);

canvas.addEventListener("pointerup", (event) => {
  canvas.releasePointerCapture(event.pointerId);
  isDrawing = false;
});

canvas.addEventListener("pointerleave", () => {
  isDrawing = false;
});

colorPicker.addEventListener("input", (event) => {
  currentColor = event.target.value;
  palette.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.color === currentColor);
  });
});

paletteColors.forEach((color) => {
  const button = document.createElement("button");
  button.style.background = color;
  button.dataset.color = color;
  button.setAttribute("type", "button");
  if (color === currentColor) {
    button.classList.add("active");
  }
  button.addEventListener("click", () => {
    currentColor = color;
    colorPicker.value = color;
    palette.querySelectorAll("button").forEach((node) => {
      node.classList.toggle("active", node === button);
    });
  });
  palette.appendChild(button);
});

toolButtons.addEventListener("click", (event) => {
  if (event.target.matches("button[data-tool]")) {
    setTool(event.target.dataset.tool);
  }
});

brushSizeInput.addEventListener("input", (event) => {
  updateBrushSize(event.target.value);
});

gridSizeSelect.addEventListener("change", () => {
  gridSize = Number(gridSizeSelect.value);
});

newGridButton.addEventListener("click", () => {
  pushUndo();
  pixels = createGrid(gridSize);
  resizeCanvas();
});

gridToggle.addEventListener("change", (event) => {
  showGrid = event.target.checked;
  draw();
});

zoomInput.addEventListener("input", (event) => {
  cellSize = Number(event.target.value);
  zoomLabel.textContent = cellSize;
  resizeCanvas();
});

clearButton.addEventListener("click", () => {
  pushUndo();
  pixels = createGrid(gridSize);
  draw();
});

fillButton.addEventListener("click", () => {
  pushUndo();
  pixels = pixels.map(() => currentColor);
  draw();
});

layerImageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    overlayImage = image;
    overlayVisible = true;
    layerToggleButton.textContent = "Hide";
    drawOverlay();
    URL.revokeObjectURL(url);
  };
  image.src = url;
});

layerToggleButton.addEventListener("click", () => {
  overlayVisible = !overlayVisible;
  layerToggleButton.textContent = overlayVisible ? "Hide" : "Show";
  drawOverlay();
});

layerClearButton.addEventListener("click", () => {
  overlayImage = null;
  overlayVisible = true;
  layerToggleButton.textContent = "Hide";
  layerImageInput.value = "";
  drawOverlay();
});

layerOpacityInput.addEventListener("input", (event) => {
  overlayOpacity = Number(event.target.value) / 100;
  layerOpacityLabel.textContent = event.target.value;
  drawOverlay();
});

layerZoomInput.addEventListener("input", (event) => {
  overlayScale = Number(event.target.value) / 100;
  layerZoomLabel.textContent = event.target.value;
  drawOverlay();
});

layerRotateInput.addEventListener("input", (event) => {
  overlayRotation = Number(event.target.value);
  layerRotateLabel.textContent = event.target.value;
  drawOverlay();
});

savePngButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `pixel-${gridSize}x${gridSize}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

saveJsonButton.addEventListener("click", () => {
  const payload = {
    gridSize,
    pixels,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.download = `pixel-${gridSize}x${gridSize}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

loadJsonInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.pixels) || !data.gridSize) {
        throw new Error("Invalid file");
      }
      pushUndo();
      gridSize = Number(data.gridSize);
      const totalCells = gridSize * gridSize;
      pixels = data.pixels.slice(0, totalCells);
      if (pixels.length < totalCells) {
        pixels = pixels.concat(new Array(totalCells - pixels.length).fill(null));
      }
      gridSizeSelect.value = String(gridSize);
      resizeCanvas();
    } catch (error) {
      alert("JSON file is not valid for this editor.");
    }
  };
  reader.readAsText(file);
});

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) {
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
    return;
  }
  if (event.key.toLowerCase() === "b") {
    setTool("brush");
  }
  if (event.key.toLowerCase() === "e") {
    setTool("eraser");
  }
  if (event.key === "[") {
    updateBrushSize(Math.max(1, brushSize - 1));
    brushSizeInput.value = brushSize;
  }
  if (event.key === "]") {
    updateBrushSize(Math.min(5, brushSize + 1));
    brushSizeInput.value = brushSize;
  }
});

updateBrushSize(brushSize);
zoomLabel.textContent = cellSize;
layerOpacityLabel.textContent = layerOpacityInput.value;
layerZoomLabel.textContent = layerZoomInput.value;
layerRotateLabel.textContent = layerRotateInput.value;
resizeCanvas();
