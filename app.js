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
const undoButton = document.getElementById("undo");
const clearButton = document.getElementById("clear");
const fillButton = document.getElementById("fill");
const copySelectionButton = document.getElementById("copy-selection");
const pasteSelectionButton = document.getElementById("paste-selection");
const scaleUpSelectionButton = document.getElementById("scale-up-selection");
const scaleDownSelectionButton = document.getElementById("scale-down-selection");
const rotateLeftSelectionButton = document.getElementById("rotate-left-selection");
const rotateRightSelectionButton = document.getElementById("rotate-right-selection");
const flipHSelectionButton = document.getElementById("flip-h-selection");
const flipVSelectionButton = document.getElementById("flip-v-selection");
const layerImageInput = document.getElementById("layer-image");
const layerAdjustButton = document.getElementById("layer-adjust");
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
const canvasStack = document.querySelector(".canvas-stack");

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
let overlayOffsetX = 0;
let overlayOffsetY = 0;
let isAdjustingLayer = false;
let layerDragState = null;
let selection = null;
let clipboardSelection = null;
let selectionDragStart = null;
let selectionMoveState = null;

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

function draw(showSelection = true) {
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

  if (showSelection) {
    drawSelection();
  }

  drawPreview();
  drawOverlay();
}

function drawSelection() {
  if (!selection) {
    return;
  }
  const x = selection.x * cellSize;
  const y = selection.y * cellSize;
  const width = selection.width * cellSize;
  const height = selection.height * cellSize;

  ctx.save();
  ctx.fillStyle = "rgba(125, 211, 252, 0.12)";
  ctx.strokeStyle = "rgba(125, 211, 252, 0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, height - 2));
  ctx.setLineDash([]);
  ctx.fillStyle = "#7dd3fc";
  ctx.fillRect(x + width - 6, y + height - 6, 6, 6);
  ctx.restore();
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
  const metrics = getOverlayMetrics();

  layerCtx.save();
  layerCtx.globalAlpha = overlayOpacity;
  layerCtx.translate(metrics.centerX, metrics.centerY);
  layerCtx.rotate(metrics.radians);
  layerCtx.drawImage(
    overlayImage,
    -metrics.drawWidth / 2,
    -metrics.drawHeight / 2,
    metrics.drawWidth,
    metrics.drawHeight
  );
  layerCtx.restore();

  if (isAdjustingLayer) {
    drawOverlayControls(metrics);
  }
}

function getOverlayMetrics(scale = overlayScale) {
  const canvasSize = gridSize * cellSize;
  const centerX = canvasSize / 2 + overlayOffsetX;
  const centerY = canvasSize / 2 + overlayOffsetY;
  const baseScale = Math.min(
    canvasSize / overlayImage.width,
    canvasSize / overlayImage.height
  );
  return {
    centerX,
    centerY,
    drawWidth: overlayImage.width * baseScale * scale,
    drawHeight: overlayImage.height * baseScale * scale,
    radians: (overlayRotation * Math.PI) / 180,
  };
}

function getRotatedPoint(x, y, metrics) {
  const cos = Math.cos(metrics.radians);
  const sin = Math.sin(metrics.radians);
  return {
    x: metrics.centerX + x * cos - y * sin,
    y: metrics.centerY + x * sin + y * cos,
  };
}

function getOverlayCorners(metrics = getOverlayMetrics()) {
  const halfWidth = metrics.drawWidth / 2;
  const halfHeight = metrics.drawHeight / 2;
  return [
    getRotatedPoint(-halfWidth, -halfHeight, metrics),
    getRotatedPoint(halfWidth, -halfHeight, metrics),
    getRotatedPoint(halfWidth, halfHeight, metrics),
    getRotatedPoint(-halfWidth, halfHeight, metrics),
  ];
}

function drawOverlayControls(metrics) {
  const corners = getOverlayCorners(metrics);
  layerCtx.save();
  layerCtx.strokeStyle = "rgba(125, 211, 252, 0.95)";
  layerCtx.lineWidth = 2;
  layerCtx.setLineDash([6, 5]);
  layerCtx.beginPath();
  layerCtx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((corner) => layerCtx.lineTo(corner.x, corner.y));
  layerCtx.closePath();
  layerCtx.stroke();
  layerCtx.setLineDash([]);
  layerCtx.fillStyle = "#7dd3fc";
  corners.forEach((corner) => {
    layerCtx.fillRect(corner.x - 5, corner.y - 5, 10, 10);
  });
  layerCtx.restore();
}

function getCanvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getLayerHit(point) {
  if (!overlayImage) {
    return { type: "none" };
  }
  const metrics = getOverlayMetrics();
  const corners = getOverlayCorners(metrics);
  const resizeCorner = corners.find(
    (corner) => Math.hypot(point.x - corner.x, point.y - corner.y) <= 14
  );
  if (resizeCorner) {
    return { type: "resize" };
  }

  const dx = point.x - metrics.centerX;
  const dy = point.y - metrics.centerY;
  const cos = Math.cos(-metrics.radians);
  const sin = Math.sin(-metrics.radians);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  if (
    Math.abs(localX) <= metrics.drawWidth / 2 &&
    Math.abs(localY) <= metrics.drawHeight / 2
  ) {
    return { type: "move" };
  }
  return { type: "none" };
}

function setOverlayScale(scale) {
  overlayScale = Math.min(3, Math.max(0.25, scale));
  layerZoomInput.value = Math.round(overlayScale * 100);
  layerZoomLabel.textContent = layerZoomInput.value;
}

function setLayerAdjusting(enabled) {
  isAdjustingLayer = enabled && Boolean(overlayImage);
  layerAdjustButton.disabled = !overlayImage;
  layerAdjustButton.classList.toggle("active", isAdjustingLayer);
  layerAdjustButton.setAttribute("aria-pressed", String(isAdjustingLayer));
  canvasStack.classList.toggle("is-adjusting-layer", isAdjustingLayer);
  updateCanvasModeClass();
  drawOverlay();
}

function setTool(tool) {
  currentTool = tool;
  if (tool === "select") {
    setLayerAdjusting(false);
  }
  [...toolButtons.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  updateCanvasModeClass();
}

function updateCanvasModeClass() {
  canvasStack.classList.toggle(
    "is-selecting-pixels",
    currentTool === "select" && !isAdjustingLayer
  );
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
  updateUndoButton();
}

function restoreState(state) {
  gridSize = Number(state.gridSize);
  gridSizeSelect.value = String(gridSize);
  loadPixelData(state, { preserveUndo: true });
  updateUndoButton();
}

function loadPixelData(data, options = {}) {
  if (!data || !Array.isArray(data.pixels) || !data.gridSize) {
    throw new Error("Invalid pixel data");
  }
  if (!options.preserveUndo) {
    pushUndo();
  }
  gridSize = Number(data.gridSize);
  gridSizeSelect.value = String(gridSize);
  const totalCells = gridSize * gridSize;
  pixels = data.pixels.slice(0, totalCells);
  if (pixels.length < totalCells) {
    pixels = pixels.concat(new Array(totalCells - pixels.length).fill(null));
  }
  selection = null;
  selectionDragStart = null;
  selectionMoveState = null;
  resizeCanvas();
  updateSelectionButtons();
}

function updateUndoButton() {
  undoButton.disabled = undoStack.length === 0;
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

function clampSelectionBounds(bounds) {
  const x1 = Math.max(0, Math.min(gridSize - 1, bounds.x1));
  const y1 = Math.max(0, Math.min(gridSize - 1, bounds.y1));
  const x2 = Math.max(0, Math.min(gridSize - 1, bounds.x2));
  const y2 = Math.max(0, Math.min(gridSize - 1, bounds.y2));
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1) + 1,
    height: Math.abs(y2 - y1) + 1,
  };
}

function getSelectionPixels(source = selection) {
  if (!source) {
    return null;
  }
  const data = [];
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const gridX = source.x + x;
      const gridY = source.y + y;
      data.push(
        gridX >= 0 && gridY >= 0 && gridX < gridSize && gridY < gridSize
          ? pixels[getIndex(gridX, gridY)]
          : null
      );
    }
  }
  return {
    width: source.width,
    height: source.height,
    pixels: data,
  };
}

function applySelectionPixels(target, source) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const gridX = target.x + x;
      const gridY = target.y + y;
      if (gridX >= 0 && gridY >= 0 && gridX < gridSize && gridY < gridSize) {
        pixels[getIndex(gridX, gridY)] = source.pixels[y * source.width + x];
      }
    }
  }
}

function clearSelectionPixels(target = selection) {
  if (!target) {
    return;
  }
  for (let y = 0; y < target.height; y += 1) {
    for (let x = 0; x < target.width; x += 1) {
      const gridX = target.x + x;
      const gridY = target.y + y;
      if (gridX >= 0 && gridY >= 0 && gridX < gridSize && gridY < gridSize) {
        pixels[getIndex(gridX, gridY)] = null;
      }
    }
  }
}

function copySelection() {
  const copied = getSelectionPixels();
  if (!copied) {
    return;
  }
  clipboardSelection = copied;
  updateSelectionButtons();
}

function pasteSelection() {
  if (!clipboardSelection) {
    return;
  }
  const target = selection
    ? { x: selection.x, y: selection.y }
    : { x: 0, y: 0 };
  pushUndo();
  applySelectionPixels(target, clipboardSelection);
  selection = {
    x: target.x,
    y: target.y,
    width: Math.min(clipboardSelection.width, gridSize - target.x),
    height: Math.min(clipboardSelection.height, gridSize - target.y),
  };
  draw();
  updateSelectionButtons();
}

function flipSelection(horizontal) {
  const source = getSelectionPixels();
  if (!source) {
    return;
  }
  const transformed = source.pixels.map((_, index) => {
    const x = index % source.width;
    const y = Math.floor(index / source.width);
    const sourceX = horizontal ? source.width - 1 - x : x;
    const sourceY = horizontal ? y : source.height - 1 - y;
    return source.pixels[sourceY * source.width + sourceX];
  });
  pushUndo();
  clearSelectionPixels();
  applySelectionPixels(selection, {
    width: source.width,
    height: source.height,
    pixels: transformed,
  });
  draw();
}

function rotateSelection(clockwise) {
  const source = getSelectionPixels();
  if (!source) {
    return;
  }
  const width = source.height;
  const height = source.width;
  const transformed = new Array(width * height).fill(null);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const targetX = clockwise ? source.height - 1 - y : y;
      const targetY = clockwise ? x : source.width - 1 - x;
      transformed[targetY * width + targetX] =
        source.pixels[y * source.width + x];
    }
  }
  pushUndo();
  clearSelectionPixels();
  applySelectionPixels(selection, {
    width,
    height,
    pixels: transformed,
  });
  selection = {
    x: selection.x,
    y: selection.y,
    width: Math.min(width, gridSize - selection.x),
    height: Math.min(height, gridSize - selection.y),
  };
  draw();
  updateSelectionButtons();
}

function scaleSelection(factor) {
  const source = getSelectionPixels();
  if (!source) {
    return;
  }
  const width = Math.max(1, Math.round(source.width * factor));
  const height = Math.max(1, Math.round(source.height * factor));
  const transformed = new Array(width * height).fill(null);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x / factor));
      const sourceY = Math.min(source.height - 1, Math.floor(y / factor));
      transformed[y * width + x] =
        source.pixels[sourceY * source.width + sourceX];
    }
  }
  pushUndo();
  clearSelectionPixels();
  applySelectionPixels(selection, {
    width,
    height,
    pixels: transformed,
  });
  selection = {
    x: selection.x,
    y: selection.y,
    width: Math.min(width, gridSize - selection.x),
    height: Math.min(height, gridSize - selection.y),
  };
  draw();
  updateSelectionButtons();
}

function updateSelectionButtons() {
  const hasSelection = Boolean(selection);
  const hasClipboard = Boolean(clipboardSelection);
  copySelectionButton.disabled = !hasSelection;
  scaleUpSelectionButton.disabled = !hasSelection;
  scaleDownSelectionButton.disabled = !hasSelection;
  rotateLeftSelectionButton.disabled = !hasSelection;
  rotateRightSelectionButton.disabled = !hasSelection;
  flipHSelectionButton.disabled = !hasSelection;
  flipVSelectionButton.disabled = !hasSelection;
  pasteSelectionButton.disabled = !hasClipboard;
}

function isCellInSelection(cell) {
  return (
    selection &&
    cell.x >= selection.x &&
    cell.y >= selection.y &&
    cell.x < selection.x + selection.width &&
    cell.y < selection.y + selection.height
  );
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

function getClampedCellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(gridSize - 1, Math.floor((event.clientX - rect.left) / cellSize))
    ),
    y: Math.max(
      0,
      Math.min(gridSize - 1, Math.floor((event.clientY - rect.top) / cellSize))
    ),
  };
}

canvas.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();
    canvas.focus?.();
    canvas.style.touchAction = "none";
    if (isAdjustingLayer && overlayImage && overlayVisible) {
      const point = getCanvasPointFromEvent(event);
      const hit = getLayerHit(point);
      if (hit.type !== "none") {
        const metrics = getOverlayMetrics();
        canvas.setPointerCapture(event.pointerId);
        layerDragState = {
          type: hit.type,
          startX: point.x,
          startY: point.y,
          startOffsetX: overlayOffsetX,
          startOffsetY: overlayOffsetY,
          startScale: overlayScale,
          startDistance: Math.max(
            1,
            Math.hypot(point.x - metrics.centerX, point.y - metrics.centerY)
          ),
        };
        return;
      }
      return;
    }

    if (currentTool === "select") {
      const cell = getClampedCellFromEvent(event);
      canvas.setPointerCapture(event.pointerId);
      if (isCellInSelection(cell)) {
        const source = getSelectionPixels();
        selectionMoveState = {
          startCell: cell,
          startSelection: { ...selection },
          basePixels: pixels.slice(),
          moved: false,
          source,
        };
        return;
      }
      selectionDragStart = cell;
      selection = {
        x: cell.x,
        y: cell.y,
        width: 1,
        height: 1,
      };
      draw();
      updateSelectionButtons();
      return;
    }

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
    if (isDrawing || layerDragState || selectionDragStart || selectionMoveState) {
      event.preventDefault();
    }
    if (selectionMoveState) {
      const cell = getClampedCellFromEvent(event);
      if (!selectionMoveState.moved) {
        pushUndo();
        selectionMoveState.moved = true;
      }
      const nextX =
        selectionMoveState.startSelection.x +
        cell.x -
        selectionMoveState.startCell.x;
      const nextY =
        selectionMoveState.startSelection.y +
        cell.y -
        selectionMoveState.startCell.y;
      const x = Math.max(0, Math.min(gridSize - 1, nextX));
      const y = Math.max(0, Math.min(gridSize - 1, nextY));
      selection = {
        x,
        y,
        width: Math.min(selectionMoveState.source.width, gridSize - x),
        height: Math.min(selectionMoveState.source.height, gridSize - y),
      };
      pixels = selectionMoveState.basePixels.slice();
      clearSelectionPixels(selectionMoveState.startSelection);
      applySelectionPixels(selection, selectionMoveState.source);
      draw();
      updateSelectionButtons();
      return;
    }

    if (selectionDragStart) {
      const cell = getClampedCellFromEvent(event);
      selection = clampSelectionBounds({
        x1: selectionDragStart.x,
        y1: selectionDragStart.y,
        x2: cell.x,
        y2: cell.y,
      });
      draw();
      updateSelectionButtons();
      return;
    }

    if (layerDragState) {
      const point = getCanvasPointFromEvent(event);
      if (layerDragState.type === "move") {
        overlayOffsetX =
          layerDragState.startOffsetX + point.x - layerDragState.startX;
        overlayOffsetY =
          layerDragState.startOffsetY + point.y - layerDragState.startY;
      } else {
        const metrics = getOverlayMetrics(layerDragState.startScale);
        const distance = Math.max(
          1,
          Math.hypot(point.x - metrics.centerX, point.y - metrics.centerY)
        );
        setOverlayScale(
          layerDragState.startScale * (distance / layerDragState.startDistance)
        );
      }
      drawOverlay();
      return;
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
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  isDrawing = false;
  layerDragState = null;
  selectionDragStart = null;
  selectionMoveState = null;
});

canvas.addEventListener("pointerleave", () => {
  isDrawing = false;
});

canvas.addEventListener("pointercancel", () => {
  isDrawing = false;
  layerDragState = null;
  selectionDragStart = null;
  selectionMoveState = null;
});

canvas.addEventListener(
  "wheel",
  (event) => {
    if (!isAdjustingLayer || !overlayImage || !overlayVisible) {
      return;
    }
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.06 : 0.94;
    setOverlayScale(overlayScale * zoomFactor);
    drawOverlay();
  },
  { passive: false }
);

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

newGridButton.addEventListener("click", () => {
  pushUndo();
  gridSize = Number(gridSizeSelect.value);
  pixels = createGrid(gridSize);
  selection = null;
  selectionDragStart = null;
  resizeCanvas();
  updateSelectionButtons();
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

undoButton.addEventListener("click", () => {
  undo();
});

fillButton.addEventListener("click", () => {
  pushUndo();
  pixels = pixels.map(() => currentColor);
  draw();
});

copySelectionButton.addEventListener("click", () => {
  copySelection();
});

pasteSelectionButton.addEventListener("click", () => {
  pasteSelection();
});

scaleUpSelectionButton.addEventListener("click", () => {
  scaleSelection(2);
});

scaleDownSelectionButton.addEventListener("click", () => {
  scaleSelection(0.5);
});

rotateLeftSelectionButton.addEventListener("click", () => {
  rotateSelection(false);
});

rotateRightSelectionButton.addEventListener("click", () => {
  rotateSelection(true);
});

flipHSelectionButton.addEventListener("click", () => {
  flipSelection(true);
});

flipVSelectionButton.addEventListener("click", () => {
  flipSelection(false);
});

layerAdjustButton.addEventListener("click", () => {
  setLayerAdjusting(!isAdjustingLayer);
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
    overlayOffsetX = 0;
    overlayOffsetY = 0;
    setOverlayScale(Number(layerZoomInput.value) / 100);
    layerToggleButton.textContent = "Hide";
    setLayerAdjusting(true);
    URL.revokeObjectURL(url);
  };
  image.src = url;
});

layerToggleButton.addEventListener("click", () => {
  overlayVisible = !overlayVisible;
  layerToggleButton.textContent = overlayVisible ? "Hide" : "Show";
  if (!overlayVisible) {
    setLayerAdjusting(false);
  } else {
    drawOverlay();
  }
});

layerClearButton.addEventListener("click", () => {
  overlayImage = null;
  overlayVisible = true;
  overlayOffsetX = 0;
  overlayOffsetY = 0;
  layerDragState = null;
  layerToggleButton.textContent = "Hide";
  layerImageInput.value = "";
  setLayerAdjusting(false);
});

layerOpacityInput.addEventListener("input", (event) => {
  overlayOpacity = Number(event.target.value) / 100;
  layerOpacityLabel.textContent = event.target.value;
  drawOverlay();
});

layerZoomInput.addEventListener("input", (event) => {
  setOverlayScale(Number(event.target.value) / 100);
  drawOverlay();
});

layerRotateInput.addEventListener("input", (event) => {
  overlayRotation = Number(event.target.value);
  layerRotateLabel.textContent = event.target.value;
  drawOverlay();
});

savePngButton.addEventListener("click", () => {
  draw(false);
  const link = document.createElement("a");
  link.download = `pixel-${gridSize}x${gridSize}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  draw();
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
      loadPixelData(data);
    } catch (error) {
      alert("JSON file is not valid for this editor.");
    }
  };
  reader.readAsText(file);
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
    return;
  }
  if (event.target.matches("input, textarea")) {
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
    if (selection) {
      event.preventDefault();
      copySelection();
    }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
    if (clipboardSelection) {
      event.preventDefault();
      pasteSelection();
    }
    return;
  }
  if (event.key.toLowerCase() === "b") {
    setTool("brush");
  }
  if (event.key.toLowerCase() === "e") {
    setTool("eraser");
  }
  if (event.key.toLowerCase() === "s") {
    setTool("select");
  }
  if (event.key === "Escape") {
    selection = null;
    selectionDragStart = null;
    draw();
    updateSelectionButtons();
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
layerAdjustButton.disabled = true;
updateUndoButton();
updateSelectionButtons();
resizeCanvas();
