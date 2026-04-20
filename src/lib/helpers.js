// @ts-nocheck

/**
 * Triggers a browser download for a JSON object.
 */
export function triggerJSONDownload(dataObj, filename) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj));
  const anchor = document.createElement('a');
  anchor.href = dataStr;
  anchor.download = filename;
  anchor.click();
  anchor.remove();
}

/**
 * Compresses the nested sketch array into a lightweight Base64 string.
 */
export function compressSketch(sketchArray) {
  if (!sketchArray || sketchArray.length === 0) return "";
  return btoa(sketchArray.map(doodle => doodle.join(',')).join('**'));
}

/**
 * Decompresses a Base64 string back into the nested sketch array.
 */
export function decompressSketch(sketchString) {
  if (!sketchString) return [];
  return atob(sketchString).split('**').map(doodle => {
    const flat = doodle.split(',');
    const xy = [];
    for (let i = 0; i < flat.length; i += 2) {
      if (flat[i]) xy.push([+flat[i], +flat[i + 1]]);
    }
    return xy;
  });
}

/**
 * Converts any Image Data URL to a lightweight WebP Data URL at 80% quality.
 */
export function convertToWebP(originalDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/webp', 0.8));
    };
    img.src = originalDataUrl;
  });
}

export function simplifyLine(points, threshold = 10) {
  if (!points || points.length <= 2) return points;
  
  const simplified = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = simplified[simplified.length - 1];
    const curr = points[i];
    
    // Only keep the point if it is further away than the threshold
    if (Math.hypot(curr[0] - last[0], curr[1] - last[1]) > threshold) {
      simplified.push(curr);
    }
  }
  
  // Guarantee the final point of the stroke is always included
  const actualLastPoint = points[points.length - 1];
  if (simplified[simplified.length - 1] !== actualLastPoint) {
    simplified.push(actualLastPoint);
  }
  
  return simplified;
}

/**
 * Generates a CanvasPattern. 
 * If style is 'dither' (hatching), it creates a high-res, seamless diagonal line pattern.
 */
export function getPattern(ctx, color, style) {
  if (style === 'solid') return color;
  
  const dpr = window.devicePixelRatio || 1;
  const pCanvas = document.createElement('canvas');
  const etchSize = 5; // Reduced from 8: brings lines closer together
  
  // Scale the invisible pattern canvas for High-DPI displays
  pCanvas.width = etchSize * dpr;
  pCanvas.height = etchSize * dpr;
  const pCtx = pCanvas.getContext('2d');
  pCtx.scale(dpr, dpr);
  
  pCtx.strokeStyle = color;
  pCtx.lineWidth = 1; // Thinner, crisper lines
  pCtx.lineCap = 'square';
  
  // Draw the primary diagonal line
  pCtx.beginPath();
  pCtx.moveTo(0, etchSize);
  pCtx.lineTo(etchSize, 0);
  pCtx.stroke();
  
  // Draw the corners for perfect tiling
  pCtx.beginPath();
  pCtx.moveTo(-etchSize / 2, etchSize / 2);
  pCtx.lineTo(etchSize / 2, -etchSize / 2);
  pCtx.stroke();
  
  pCtx.beginPath();
  pCtx.moveTo(etchSize / 2, etchSize * 1.5);
  pCtx.lineTo(etchSize * 1.5, etchSize / 2);
  pCtx.stroke();
  
  const pattern = ctx.createPattern(pCanvas, 'repeat');
  
  // Scale the pattern back down to CSS logical pixels so it doesn't look massive
  pattern.setTransform(new DOMMatrix().scale(1 / dpr, 1 / dpr));
  
  return pattern;
}