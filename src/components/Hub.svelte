<script>
  import { igramaState, createDefaultModel } from '../igrama.svelte.js';
  import { decompressSketch, convertToWebP } from '../lib/helpers.js';
  import { i18n } from '../lib/i18n.svelte.js';
  import JSZip from 'jszip';

  let isDragging = $state(false);

  function startNew() {
    // Relying entirely on the single source of truth!
    igramaState.model = createDefaultModel();
    igramaState.step = 'structure';
  }

  async function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      await loadJSON(file);
    } else if (file.name.endsWith('.zip')) {
      await loadZIP(file);
    } else {
      alert(i18n.t('err_invalid_file'));
    }
  }

  async function loadJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    
    if (typeof parsed.sketch === 'string') {
      parsed.sketch = decompressSketch(parsed.sketch);
    }

    igramaState.model = parsed;
    igramaState.step = 'grammar'; 
  }

  async function loadZIP(file) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    let loadedIgrama = null;
    const grammarRules = {};

    for (const [filename, zipEntry] of Object.entries(contents.files)) {
      if (zipEntry.dir) continue;

      if (filename.endsWith('.json') && !filename.includes('_MACOSX')) {
        const text = await zipEntry.async("text");
        loadedIgrama = JSON.parse(text);
      } 
      else if (filename.match(/\.(png|jpg|jpeg)$/i)) {
        const parts = filename.split('/');
        if (parts.length > 1) {
          const sectionName = parts[parts.length - 2];
          if (!grammarRules[sectionName]) grammarRules[sectionName] = [];
          
          const base64Data = await zipEntry.async("base64");
          const mime = filename.toLowerCase().endsWith('png') ? 'image/png' : 'image/jpeg';
          const webpDataUrl = await convertToWebP(`data:${mime};base64,${base64Data}`);
          
          grammarRules[sectionName].push(`url%%${webpDataUrl}%%`);
        }
      }
    }

    if (loadedIgrama) {
      Object.assign(loadedIgrama.grammar, grammarRules);
      if (typeof loadedIgrama.sketch === 'string') {
        loadedIgrama.sketch = decompressSketch(loadedIgrama.sketch);
      }
      igramaState.model = loadedIgrama;
      igramaState.step = 'generator'; 
    } else {
      alert(i18n.t('err_no_json'));
    }
  }
</script>

<div class="igrama-layout hub-layout">
  <div class="hub-container">
    <h1 class="hub-title">{i18n.t('hub_title')}</h1>
    
    <button class="btn btn-primary start-btn" onclick={startNew}>
      {i18n.t('create_new')}
    </button>

    <div class="divider">{i18n.t('hub_or')}</div>

    <div class="drop-zone {isDragging ? 'dragging' : ''}"
         ondragover={(e) => { e.preventDefault(); isDragging = true; }}
         ondragleave={() => isDragging = false}
         ondrop={handleDrop}>
      <h3>{i18n.t('drop_title')}</h3>
      <p>{i18n.t('drop_desc')}</p>
    </div>
  </div>
</div>

<style>
  .hub-layout {
    justify-content: center;
    align-items: center;
    /* height: 100vh; */
  }

  .hub-container {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .hub-title {
    font-size: 2rem;
    margin: 0;
    text-align: center;
    text-transform: lowercase;
  }

  .start-btn {
    width: 100%;
    font-size: 1rem;
    text-transform: uppercase;
  }

  .divider {
    text-align: center;
    font-weight: bold;
    position: relative;
  }
  
  .divider::before, .divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    border-bottom: var(--border-main);
  }
  .divider::before { left: 0; }
  .divider::after { right: 0; }

  .drop-zone {
    border: dashed 2px var(--text-color);
    padding: 1rem 1rem;
    text-align: center;
    background: var(--bg-color);
    transition: all 0.2s ease;
  }

  .drop-zone h3 {
    margin: 0 0 0.5rem 0;
  }

  .drop-zone p {
    margin: 0;
    font-size: 0.9rem;
  }

  .dragging {
    background: var(--text-color);
    color: var(--bg-color);
  }
</style>