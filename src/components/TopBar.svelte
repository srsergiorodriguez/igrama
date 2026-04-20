<script>
  import { igramaState } from '../igrama.svelte.js';
  import { i18n, toggleLanguage } from '../lib/i18n.svelte.js';
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
  
  <button class="lang-btn" onclick={toggleLanguage}>
    {i18n.lang === 'en' ? 'ES' : 'EN'}
  </button>
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
    background: var(--text-color);
    color: var(--bg-color);
    border: none;
    padding: 0.4rem 0.8rem;
    font-family: var(--font-text);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .lang-btn:hover {
    background: var(--accent-color);
    color: var(--text-color);
  }
</style>