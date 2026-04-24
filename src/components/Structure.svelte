<script>
  import { igramaState } from '../igrama.svelte.js';
  import { triggerJSONDownload, compressSketch, simplifyLine } from '../lib/helpers.js';
  import { i18n } from '../lib/i18n.svelte.js';

  let canvasRef = $state();
  let ctx = $state();
  let undoStack = $state([]);
  let currentDoodle = $state([]);
  let isDrawing = $state(false);

  let mode = $state('sketch');

  let draggingIdx = $state(null);
  let resizingIdx = $state(null);
  let startX = $state(0);
  let startY = $state(0);
  let startBounds = $state(null);

  const sketchWeight = 4;

  $effect(() => {
    if (canvasRef) {
      const dpr = window.devicePixelRatio || 1;
      canvasRef.width = igramaState.model.metadata.width * dpr;
      canvasRef.height = igramaState.model.metadata.height * dpr;

      ctx = canvasRef.getContext('2d');
      ctx.scale(dpr, dpr); 
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      redrawCanvas();
    }
  });

  function generateRandomSections(count) {
    igramaState.model.metadata.sectionsN = count;
    const w = igramaState.model.metadata.width;
    const h = igramaState.model.metadata.height;
    
    let newSections = [];
    let newNames = [];
    for (let i = 0; i < count; i++) {
      const secW = Math.floor(100 + Math.random() * (w / 2 - 100));
      const secH = Math.floor(100 + Math.random() * (h / 2 - 100));
      newSections.push({ w: secW, h: secH, x: Math.floor(Math.random() * (w - secW)), y: Math.floor(Math.random() * (h - secH)) });
      newNames.push(igramaState.model.metadata.sectionsNames[i] || `section_${i}`);
    }
    igramaState.model.sections = newSections;
    igramaState.model.metadata.sectionsNames = newNames;
    mode = 'sections';
  }

  function updateDimensions(w, h) {
    igramaState.model.metadata.width = w;
    igramaState.model.metadata.height = h;
    requestAnimationFrame(redrawCanvas);
  }

  // --- DRAWING LOGIC ---
  function startDraw(e) {
    if (mode !== 'sketch') return;
    isDrawing = true;
    const rect = canvasRef.getBoundingClientRect();
    currentDoodle = [[e.clientX - rect.left, e.clientY - rect.top]];
  }

  function doDraw(e) {
    if (!isDrawing) return;
    const rect = canvasRef.getBoundingClientRect();
    currentDoodle.push([e.clientX - rect.left, e.clientY - rect.top]);
    redrawCanvas();
  }

  function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    
    const simplifiedPoints = simplifyLine(currentDoodle, 10);
    
    if (simplifiedPoints.length > 1) {
      igramaState.model.sketch.push(simplifiedPoints);
      undoStack = [];
    }
    
    currentDoodle = [];
    redrawCanvas();
  }

  function redrawCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    
    // Bind the sketch to the new global accent color
    ctx.strokeStyle = igramaState.model.metadata.accentColor;
    ctx.lineWidth = sketchWeight;
    
    igramaState.model.sketch.forEach(d => drawDoodle(d));
    if (currentDoodle.length > 0) drawDoodle(currentDoodle);
  }

  function drawDoodle(doodle) {
    if (doodle.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(doodle[0][0], doodle[0][1]);
    for (let i = 1; i < doodle.length; i++) ctx.lineTo(doodle[i][0], doodle[i][1]);
    ctx.stroke();
  }

  // --- DRAG LOGIC ---
  function handlePointerDown(e, idx, type) {
    if (mode !== 'sections') return;
    e.stopPropagation();
    if (type === 'resize') resizingIdx = idx; else draggingIdx = idx;
    startX = e.clientX; startY = e.clientY;
    startBounds = { ...igramaState.model.sections[idx] };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e) {
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    const w = igramaState.model.metadata.width; const h = igramaState.model.metadata.height;
    if (draggingIdx !== null) {
      const sec = igramaState.model.sections[draggingIdx];
      sec.x = Math.max(0, Math.min(w - sec.w, startBounds.x + dx));
      sec.y = Math.max(0, Math.min(h - sec.h, startBounds.y + dy));
    } else if (resizingIdx !== null) {
      const sec = igramaState.model.sections[resizingIdx];
      sec.w = Math.max(20, Math.min(w - sec.x, startBounds.w + dx));
      sec.h = Math.max(20, Math.min(h - sec.y, startBounds.h + dy));
    }
  }

  function handlePointerUp() {
    draggingIdx = null; resizingIdx = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  // --- UTILS ---
  function downloadStructure() {
    const exportModel = JSON.parse(JSON.stringify(igramaState.model));
    exportModel.sketch = compressSketch(exportModel.sketch);
    triggerJSONDownload(exportModel, "igrama_structure.json");
  }

  function goToGrammar() {
    for (let i = 0; i < igramaState.model.metadata.sectionsN; i++) {
      if (!igramaState.model.metadata.sectionsNames[i]) igramaState.model.metadata.sectionsNames[i] = `section_${i}`;
    }
    igramaState.step = 'grammar';
  }
</script>

<div class="igrama-layout">
  
  <section class="igrama-workspace">
    <div class="canvas-container" style="width: {igramaState.model.metadata.width}px; height: {igramaState.model.metadata.height}px; background: {igramaState.model.metadata.bg};">
      <canvas bind:this={canvasRef} 
        onpointerdown={startDraw} onpointermove={doDraw} onpointerup={endDraw} onpointerleave={endDraw}
        style="width: {igramaState.model.metadata.width}px; height: {igramaState.model.metadata.height}px; cursor: {mode === 'sketch' ? 'crosshair' : 'default'}">
      </canvas>

      {#each igramaState.model.sections as sec, i}
        <div class="section-box" style="left: {sec.x}px; top: {sec.y}px; width: {sec.w}px; height: {sec.h}px; pointer-events: {mode === 'sections' ? 'auto' : 'none'}; cursor: move;"
             onpointerdown={(e) => handlePointerDown(e, i, 'drag')}>
          <span class="section-label">{i}</span>
          <div class="resize-handle" onpointerdown={(e) => handlePointerDown(e, i, 'resize')}></div>
        </div>
      {/each}
    </div>
  </section>

  <aside class="igrama-toolbar">
    <header class="toolbar-header">
      <h3>{i18n.t('nav_struct')}</h3>
    </header>
    
    <div class="toolbar-content">
      <div class="btn-group">
        <button class="btn btn-secondary {mode === 'sketch' ? 'btn-active' : ''}" onclick={() => mode = 'sketch'}>{i18n.t('mode_guide')}</button>
        <button class="btn btn-secondary {mode === 'sections' ? 'btn-active' : ''}" onclick={() => mode = 'sections'}>{i18n.t('mode_sections')}</button>
      </div>

      <div class="control-group">
        <label>{i18n.t('accent_color')}
          <div style="display: flex; gap: 0.5rem; margin-top: 0.2rem;">
            <input type="color" bind:value={igramaState.model.metadata.accentColor} oninput={redrawCanvas} style="padding: 0; width: 40px; height: 30px;" />
            <input type="text" bind:value={igramaState.model.metadata.accentColor} oninput={redrawCanvas} style="flex-grow: 1;" />
          </div>
        </label>
      </div>

      <div class="control-group">
        <label>{i18n.t('label_width')} <input type="number" style="width: 100%" value={igramaState.model.metadata.width} oninput={(e) => updateDimensions(+e.target.value, igramaState.model.metadata.height)} /></label>
      </div>
      
      <div class="control-group">
        <label>{i18n.t('label_height')} <input type="number" style="width: 100%" value={igramaState.model.metadata.height} oninput={(e) => updateDimensions(igramaState.model.metadata.width, +e.target.value)} /></label>
      </div>
      
      <div class="control-group">
        <label>{i18n.t('label_sections')}
          <select style="width: 100%" onchange={(e) => generateRandomSections(+e.target.value)}>
            <option value="0">{i18n.t('select_prompt')}</option>
            {#each [1,2,3,4,5,6,7,8] as n} <option value={n}>{n}</option> {/each}
          </select>
        </label>
      </div>

      {#if mode === 'sketch'}
        <div class="btn-group">
          <button class="btn btn-secondary" onclick={() => { if(igramaState.model.sketch.length>0) { undoStack.push(igramaState.model.sketch.pop()); redrawCanvas(); } }}>{i18n.t('btn_undo')}</button>
          <button class="btn btn-secondary" onclick={() => { if(undoStack.length>0) { igramaState.model.sketch.push(undoStack.pop()); redrawCanvas(); } }}>{i18n.t('btn_redo')}</button>
          <button class="btn btn-secondary" onclick={() => { igramaState.model.sketch = []; undoStack = []; redrawCanvas(); }}>{i18n.t('btn_clear')}</button>
        </div>
      {/if}

      {#if igramaState.model.sections.length > 0}
        <div class="control-group">
          <label style="font-weight: bold; margin-top: 0.5rem;">{i18n.t('section_names')}</label>
          {#each igramaState.model.sections as sec, i}
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.8rem; width: 20px;">{i}:</span>
              <input type="text" style="flex-grow: 1;" bind:value={igramaState.model.metadata.sectionsNames[i]} />
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <footer class="toolbar-footer">
      <button class="btn btn-secondary w-full" onclick={downloadStructure}>{i18n.t('btn_download_json')}</button>
      <button class="btn btn-primary w-full" onclick={goToGrammar}>{i18n.t('btn_continue')}</button>
    </footer>
  </aside>
</div>