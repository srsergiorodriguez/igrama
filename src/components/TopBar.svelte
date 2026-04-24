<script>
  import { igramaState } from '../igrama.svelte.js';
  import { i18n } from '../lib/i18n.svelte.js';
</script>

<header class="topbar">
  <nav class="breadcrumbs">
    {#if igramaState.step !== 'hub'}
      <button class="crumb" onclick={() => igramaState.step = 'hub'}>{i18n.t('nav_hub')}</button> <span>/</span>
      <button class="crumb {igramaState.step === 'structure' ? 'crumb-active' : ''}" onclick={() => igramaState.step = 'structure'}>{i18n.t('nav_struct')}</button> <span>/</span>
      <button class="crumb {igramaState.step === 'grammar' ? 'crumb-active' : ''}" onclick={() => igramaState.step = 'grammar'}>{i18n.t('nav_gram')}</button> <span>/</span>
      <button class="crumb {igramaState.step === 'generator' ? 'crumb-active' : ''}" onclick={() => igramaState.step = 'generator'}>{i18n.t('nav_gen')}</button>
    {/if}
  </nav>
  
  <div class="lang-toggle" style="display: flex; gap: 0.5rem;">
    <button class="btn lang-btn {i18n.lang === 'en' ? 'active' : ''}" onclick={() => i18n.lang = 'en'}>en</button>
    <button class="btn lang-btn {i18n.lang === 'es' ? 'active' : ''}" onclick={() => i18n.lang = 'es'}>es</button>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
    height: 3rem;
    border-bottom: var(--border-main);
    background: var(--bg-color);
    flex-shrink: 0;
  }

  .lang-btn {
    padding: 0.1rem 0.4rem;
    background: var(--bg-color);
    color: var(--text-color);
  }

  .lang-btn:hover {
    background: var(--text-color);
    color: var(--bg-color);
  }

  .lang-btn.active {
    background: var(--accent-color);
    color: var(--text-color);
    border-color: var(--text-color);
  }

  .lang-btn.active:hover {
    background: var(--bg-color);
  }
</style>