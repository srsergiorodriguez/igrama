<script>
  import { igramaState } from '../igrama.svelte.js';
  import { triggerJSONDownload, compressSketch } from '../lib/helpers.js';
  import { i18n } from '../lib/i18n.svelte.js';
  import Aventura from '../lib/aventura.esm.js'; 

  let resultUrl = $state('');
  let format = $state('png');
  let generatedText = $state('');
  let isGenerating = $state(false);

  const aventura = new Aventura();

  async function generate() {
    isGenerating = true;
    aventura.setIgrama(igramaState.model);
    const layers = aventura.expandIgrama('base');
    generatedText = aventura.igramaText(layers);
    resultUrl = await aventura.igramaDataUrl(layers, format);
    isGenerating = false;
  }

  function toggleWiggle() {
    format = format === 'png' ? 'gif' : 'png';
    generate();
  }

  function downloadImage() {
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `igrama_output.${format}`;
    link.click();
    link.remove();
  }

  function downloadJSON() {
    const exportModel = JSON.parse(JSON.stringify(igramaState.model));
    exportModel.sketch = compressSketch(exportModel.sketch);
    triggerJSONDownload(exportModel, "igrama_model.json");
  }

  function goBack() {
    igramaState.step = 'grammar';
  }

  $effect(() => {
    generate();
  });
</script>

<div class="igrama-layout">
  
  <section class="igrama-workspace">
    <div class="result-wrapper" style="width: {igramaState.model.metadata.width}px; height: {igramaState.model.metadata.height}px;">
      
      {#if isGenerating}
        <div class="loading-state">{i18n.t('loading_generating')}</div>
      {:else if resultUrl}
        <img src={resultUrl} alt="Generative Igrama" class="result-image" />
        
        {#if generatedText.trim().length > 0}
          <div class="text-overlay">{generatedText}</div>
        {/if}
      {/if}

    </div>
  </section>

  <aside class="igrama-toolbar">
    <h3 style="margin:0;">{i18n.t('nav_gen')}</h3>
    
    <div class="control-group">
      <button class="btn btn-primary" onclick={generate}>{i18n.t('btn_generate_another')}</button>
    </div>

    <hr/>

    <div class="control-group">
      <button class="btn {format === 'gif' ? 'btn-active' : ''}" onclick={toggleWiggle}>
        {format === 'gif' ? i18n.t('btn_disable_wiggle') : i18n.t('btn_enable_wiggle')}
      </button>
    </div>

    <div class="control-group" style="margin-top: 1rem;">
      <button class="btn" onclick={downloadImage}>{i18n.t('btn_download_image')}</button>
      <button class="btn" onclick={downloadJSON}>{i18n.t('btn_download_json')}</button>
    </div>

    <button class="btn btn-primary" onclick={goBack} style="margin-top: auto;">{i18n.t('btn_back_grammar')}</button>
  </aside>

</div>

<style>
  .result-wrapper {
    position: relative;
    border: var(--border-main);
    box-shadow: 4px 4px 0px rgba(0,0,0,0.1);
    background: url('/checkers.png'); 
    background-size: cover;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .result-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .loading-state {
    font-family: var(--font-text);
    font-weight: bold;
    background: var(--bg-color);
    padding: 0.5rem 1rem;
    border: var(--border-main);
  }

  .text-overlay {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: var(--border-main);
    padding: 0.5rem;
    text-align: center;
    font-weight: bold;
    z-index: 20;
  }
</style>