// The single source of truth for a blank Igrama model
export function createDefaultModel() {
  return {
    metadata: {
      width: 400,
      height: 400,
      bg: '#ffffff',
      accentColor: '#00bfff',
      sectionsN: 2,
      sectionsNames: ['section_0', 'section_1'],
      attributes: [false, false]
    },
    sections: [
      { x: 50, y: 50, w: 150, h: 150 },
      { x: 200, y: 200, w: 150, h: 150 }
    ],
    grammar: { base: ['<section_0>|<section_1>'] },
    sketch: []
  };
}

export const igramaState = $state({
  step: 'hub',
  model: createDefaultModel() // Initialize with the template
});