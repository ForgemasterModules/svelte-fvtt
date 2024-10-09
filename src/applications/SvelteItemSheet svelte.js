import { SvelteDocumentSheet } from './SvelteDocumentSheet.svelte.ts';

class SvelteItemSheet extends SvelteDocumentSheet {
  static DEFAULT_OPTIONS = {
    position: {
      width: 480
    }
  };

  /**
   * The Item instance 
   * @returns {Item.ConfiguredInstance} 
   */
  get item() {
    return this.document;
  }

  /**
   * The Actor instance which owns this Item, if any.
   * @returns {Actor.ConfiguredInstance | null}
   */
  get actor() {
    return this.document.actor;
  }
}

export { SvelteItemSheet };