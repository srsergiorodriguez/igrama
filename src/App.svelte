<script>
  import { igramaState } from './igrama.svelte.js';
  import TopBar from './components/TopBar.svelte';
  import Hub from './components/Hub.svelte';
  import Structure from './components/Structure.svelte';
  import Grammar from './components/Grammar.svelte';
  import Generator from './components/Generator.svelte';
</script>

<main class="igrama-app">
  
  <TopBar />

  <div class="igrama-layout">
    {#if igramaState.step === 'hub'}
      <Hub />
    {:else if igramaState.step === 'structure'}
      <Structure />
    {:else if igramaState.step === 'grammar'}
      <Grammar />
    {:else if igramaState.step === 'generator'}
      <Generator />
    {/if}
  </div>
</main>