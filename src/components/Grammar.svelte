<script>
  import { igramaState } from '../igrama.svelte.js';
  import { simplifyLine, getPattern } from '../lib/helpers.js';
  import { i18n } from '../lib/i18n.svelte.js';

  let canvasRef = $state();
  let ctx = $state();
  
  let activeSectionIdx = $state(0);
  let activeSection = $derived(igramaState.model.sections[activeSectionIdx] || {x:0, y:0, w:100, h:100});
  let activeSectionName = $derived(igramaState.model.metadata.sectionsNames[activeSectionIdx] || `section_${activeSectionIdx}`);

  // Semantic 2-Bit State
  let currentColor = $state('black'); // 'black' | 'white' | 'accent'
  let currentWeight = $state(4);
  let currentStyle = $state('solid'); // 'solid' | 'dither' (hatching)
  let currentMode = $state('stroke'); // 'stroke' | 'fill'

  let currentLayer = $state([]); 
  let currentDoodle = $state(null);
  let undoStack = $state([]);
  let isDrawing = $state(false);
  let attributeInput = $state('');

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

  // --- SEMANTIC COLOR RESOLVER ---
  // Converts the semantic word into the actual hex code for rendering
  function resolveColor(semanticColor) {
    if (semanticColor === 'white') return '#ffffff';
    if (semanticColor === 'black') return '#000000';
    if (semanticColor === 'accent') return igramaState.model.metadata.accentColor;
    return semanticColor; 
  }

  function startDraw(e) {
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    if (x >= activeSection.x && x <= activeSection.x + activeSection.w && y >= activeSection.y && y <= activeSection.y + activeSection.h) {
      isDrawing = true;
      currentDoodle = { 
        color: currentColor,
        weight: currentWeight, 
        style: currentStyle,
        type: currentMode,
        points: [[x, y]] 
      };
    }
  }

  function doDraw(e) {
    if (!isDrawing) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    if (x >= activeSection.x && x <= activeSection.x + activeSection.w && y >= activeSection.y && y <= activeSection.y + activeSection.h) {
      currentDoodle.points.push([x, y]);
      redrawCanvas();
    } else endDraw();
  }

  function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    const simplifiedPoints = simplifyLine(currentDoodle.points, 10);
    
    if (simplifiedPoints.length > 1) {
      currentDoodle.points = simplifiedPoints;
      currentLayer.push(currentDoodle);
      undoStack = [];
    }
    
    currentDoodle = null;
    redrawCanvas();
  }

  function redrawCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    
    // Draw Background Guide
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)'; 
    ctx.lineWidth = 2;
    igramaState.model.sketch.forEach(doodle => {
      if (doodle.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(doodle[0][0], doodle[0][1]);
      for (let i = 1; i < doodle.length; i++) ctx.lineTo(doodle[i][0], doodle[i][1]);
      ctx.stroke();
    });

    currentLayer.forEach(d => drawDoodle(d));
    if (currentDoodle) drawDoodle(currentDoodle);
  }

  function drawDoodle(doodle) {
    if (doodle.points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(doodle.points[0][0], doodle.points[0][1]);
    for (let i = 1; i < doodle.points.length; i++) ctx.lineTo(doodle.points[i][0], doodle.points[i][1]);

    // Resolve the semantic color to hex BEFORE sending it to getPattern
    const actualHex = resolveColor(doodle.color);
    const fillStyle = getPattern(ctx, actualHex, doodle.style);

    if (doodle.type === 'fill') {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    } else {
      ctx.strokeStyle = fillStyle;
      ctx.lineWidth = doodle.weight;
      ctx.stroke();
    }
  }

  function saveOptionToGrammar() {
    if (currentLayer.length === 0) {
      commitRuleToGrammar(""); return;
    }
    const vectorData = currentLayer.map(doodle => {
      const flatPts = doodle.points.map(p => `${Math.floor(p[0])},${Math.floor(p[1])}`).join(',');
      return `${doodle.color}&${doodle.weight}&${doodle.type}&${doodle.style}&${flatPts}`;
    }).join('**');
    commitRuleToGrammar(`vector%%${vectorData}%%${attributeInput}`);
  }

  function commitRuleToGrammar(ruleString) {
    if (!igramaState.model.grammar[activeSectionName]) igramaState.model.grammar[activeSectionName] = [];
    igramaState.model.grammar[activeSectionName].push(ruleString);
    const baseBranches = [];
    for (let i = 0; i < igramaState.model.metadata.sectionsN; i++) baseBranches.push(`<${igramaState.model.metadata.sectionsNames[i] || `section_${i}`}>`);
    igramaState.model.grammar.base = [baseBranches.join('|')];
    
    currentLayer = []; undoStack = []; attributeInput = ''; redrawCanvas();
  }
</script>

<div class="igrama-layout">
  <section class="igrama-workspace">
    <div class="canvas-container" style="width: {igramaState.model.metadata.width}px; height: {igramaState.model.metadata.height}px; background: {igramaState.model.metadata.bg};">
      <canvas bind:this={canvasRef} 
        onpointerdown={startDraw} onpointermove={doDraw} onpointerup={endDraw} onpointerleave={endDraw} 
        style="width: {igramaState.model.metadata.width}px; height: {igramaState.model.metadata.height}px; cursor: crosshair; z-index: 10;">
      </canvas>

      {#each igramaState.model.sections as sec, i}
        {#if i !== activeSectionIdx}
          <div class="section-box" style="left: {sec.x}px; top: {sec.y}px; width: {sec.w}px; height: {sec.h}px; opacity: 0.2; pointer-events: none;"></div>
        {/if}
      {/each}

      <div class="section-box section-box-active" style="left: {activeSection.x}px; top: {activeSection.y}px; width: {activeSection.w}px; height: {activeSection.h}px; pointer-events: none;">
        <span class="section-label">{activeSectionName}</span>
      </div>
    </div>
  </section>

  <aside class="igrama-toolbar">
    <h3 style="margin:0;">{i18n.t('nav_gram')}</h3>
    
    <div class="control-group">
      <label>{i18n.t('active_section')}</label>
      <select style="width: 100%; font-weight: bold;" bind:value={activeSectionIdx} onchange={() => { currentLayer = []; redrawCanvas(); }}>
        {#each igramaState.model.metadata.sectionsNames as name, i}
          <option value={i}>{name}</option>
        {/each}
      </select>
    </div>

    <hr/>

    <div class="control-group">
      <label>{i18n.t('label_color')}</label>
      <div class="btn-group">
        <button 
          class="color-btn {currentColor === 'black' ? 'color-active' : ''}" 
          style="background: #000000;" 
          onclick={() => currentColor = 'black'}
          aria-label="black"
        ></button>
        <button 
          class="color-btn {currentColor === 'white' ? 'color-active' : ''}" 
          style="background: #ffffff;" 
          onclick={() => currentColor = 'white'}
          aria-label="white"
        ></button>
        <button 
          class="color-btn {currentColor === 'accent' ? 'color-active' : ''}" 
          style="background: {igramaState.model.metadata.accentColor};" 
          onclick={() => currentColor = 'accent'}
          aria-label="accent"
        ></button>
      </div>
    </div>

    <div class="control-group">
      <label>{i18n.t('label_style')}</label>
      <div class="btn-group">
        <button class="btn {currentStyle === 'solid' ? 'btn-active' : ''}" onclick={() => currentStyle = 'solid'}>{i18n.t('val_solid')}</button>
        <button class="btn {currentStyle === 'dither' ? 'btn-active' : ''}" onclick={() => currentStyle = 'dither'}>{i18n.t('val_dither')}</button>
      </div>
    </div>

    <div class="control-group">
      <label>{i18n.t('label_mode')}</label>
      <div class="btn-group">
        <button class="btn {currentMode === 'stroke' ? 'btn-active' : ''}" onclick={() => currentMode = 'stroke'}>{i18n.t('val_stroke')}</button>
        <button class="btn {currentMode === 'fill' ? 'btn-active' : ''}" onclick={() => currentMode = 'fill'}>{i18n.t('val_fill')}</button>
      </div>
    </div>

    {#if currentMode === 'stroke'}
      <div class="control-group" style="margin-top: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; min-height: 50px;">
          <label style="margin: 0;">{i18n.t('label_weight')} ({currentWeight}px)</label>
          <div style="
            width: {currentWeight}px; 
            height: {currentWeight}px; 
            border-radius: 50%; 
            background: {resolveColor(currentColor)}; 
            border: 1px solid var(--text-color);
            transition: all 0.1s ease;
          "></div>
        </div>
        <input type="range" min="1" max="50" bind:value={currentWeight} style="width: 100%" />
      </div>
    {/if}

    <div class="btn-group">
      <button class="btn" onclick={() => { if(currentLayer.length>0) { undoStack.push(currentLayer.pop()); redrawCanvas(); }}}>{i18n.t('btn_undo')}</button>
      <button class="btn" onclick={() => { if(undoStack.length>0) { currentLayer.push(undoStack.pop()); redrawCanvas(); }}}>{i18n.t('btn_redo')}</button>
      <button class="btn" onclick={() => { currentLayer = []; undoStack = []; redrawCanvas(); }}>{i18n.t('btn_clear')}</button>
    </div>

    <div class="control-group" style="margin-top: 0.5rem;">
      <label>{i18n.t('attr_optional')} <input type="text" style="width:100%" bind:value={attributeInput} /></label>
      <button class="btn save-option-btn" onclick={saveOptionToGrammar}>{i18n.t('btn_save_option')}</button>
    </div>
    
    <div style="font-size: 0.8rem; text-align: center;">
      {i18n.t('options_saved')} <strong>{igramaState.model.grammar[activeSectionName]?.length || 0}</strong>
    </div>

    <button class="btn btn-primary" onclick={() => igramaState.step = 'generator'}>{i18n.t('btn_generate')}</button>
  </aside>
</div>

<style>
  .save-option-btn {
    background: var(--accent-color);
  }

  /* Solid Color Buttons */
  .color-btn {
    height: 35px;
    border: var(--border-main);
    cursor: pointer;
    border-radius: 0;
    padding: 0;
    transition: transform 0.1s ease;
  }
  .color-btn:hover {
    transform: scale(1.05);
  }
  .color-active {
    outline: 3px solid var(--accent-color);
    outline-offset: 2px;
    z-index: 2; /* Ensures the outline sits above neighboring buttons */
  }
</style>