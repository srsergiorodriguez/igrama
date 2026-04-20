// src/lib/i18n.svelte.js
// @ts-nocheck

const dict = {
  en: {
    hub_title: "igrama",
    hub_subtitle: "generative composition tool.",
    create_new: "create new igrama",
    drop_title: "load model",
    drop_desc: "drag & drop a .json file or a .zip archive here.",
    hub_or: "or",
    err_invalid_file: "invalid file format.",
    err_no_json: "no valid .json found in .zip.",

    nav_hub: "hub",
    nav_struct: "structure",
    nav_gram: "grammar",
    nav_gen: "generator",
    btn_undo: "undo",
    btn_redo: "redo",
    btn_clear: "clear",
    btn_continue: "continue →",
    btn_download_json: "download .json",
    
    // Structure Component
    mode_guide: "guide",
    mode_sections: "sections",
    accent_color: "accent color",
    label_width: "width",
    label_height: "height",
    label_sections: "sections",
    select_prompt: "select...",
    section_names: "section names",

    // Grammar Component
    active_section: "active section",
    label_weight: "weight",
    label_color: "color",
    label_style: "pattern",
    label_mode: "mode",
    val_solid: "solid",
    val_dither: "dither",
    val_stroke: "stroke",
    val_fill: "fill",
    color_black: "black",
    color_white: "white",
    color_accent: "accent",
    attr_optional: "attribute (optional)",
    btn_save_option: "+ save option",
    options_saved: "options saved:",
    btn_generate: "generate →",

    // Generator Component
    btn_generate_another: "generate another",
    btn_disable_wiggle: "disable wiggle (.png)",
    btn_enable_wiggle: "enable wiggle (.gif)",
    btn_download_image: "download image",
    btn_back_grammar: "← back to grammar",
    loading_generating: "generating..."
  },
  es: {
    hub_title: "igrama",
    hub_subtitle: "herramienta de composición generativa.",
    create_new: "crear nuevo igrama",
    drop_title: "cargar modelo",
    drop_desc: "arrastra y suelta un archivo .json o un archivo .zip aquí.",
    hub_or: "o",
    err_invalid_file: "formato de archivo inválido.",
    err_no_json: "no se encontró un .json válido en el .zip.",
    
    nav_hub: "inicio",
    nav_struct: "estructura",
    nav_gram: "gramática",
    nav_gen: "generador",
    btn_undo: "deshacer",
    btn_redo: "rehacer",
    btn_clear: "borrar",
    btn_continue: "continuar →",
    btn_download_json: "descargar .json",
    
    // Structure Component
    mode_guide: "guía",
    mode_sections: "secciones",
    accent_color: "color de acento",
    label_width: "ancho",
    label_height: "alto",
    label_sections: "secciones",
    select_prompt: "seleccionar...",
    section_names: "nombres de secciones",

    // Grammar Component
    active_section: "sección activa",
    label_weight: "grosor",
    label_color: "color",
    label_style: "patrón",
    label_mode: "modo",
    val_solid: "sólido",
    val_dither: "trama",
    val_stroke: "línea",
    val_fill: "relleno",
    color_black: "negro",
    color_white: "blanco",
    color_accent: "acento",
    attr_optional: "atributo (opcional)",
    btn_save_option: "+ guardar opción",
    options_saved: "opciones guardadas:",
    btn_generate: "generar →",

    // Generator Component
    btn_generate_another: "generar otro",
    btn_disable_wiggle: "desactivar wiggle (.png)",
    btn_enable_wiggle: "activar wiggle (.gif)",
    btn_download_image: "descargar imagen",
    btn_back_grammar: "← volver a gramática",
    loading_generating: "generando..."
  }
};

export const i18n = $state({
  lang: 'en',
  t: (key) => {
    if (dict[i18n.lang] && dict[i18n.lang][key]) return dict[i18n.lang][key];
    return key;
  }
});

export function toggleLanguage() {
  i18n.lang = i18n.lang === 'en' ? 'es' : 'en';
}