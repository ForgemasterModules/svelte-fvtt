const { DocumentSheetV2 } = foundry.applications.api;

class SvelteDocumentSheet extends DocumentSheetV2 {
  /** @type {string[]} */
  #customHTMLTags = Object.values(foundry.applications.elements)
    .reduce((acc, E) => {
      const { tagName } = E;
      if (!tagName) return acc;
      acc.push(tagName.toUpperCase());
      return acc;
    });

  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    if (event.type !== 'change') return;
    if (!this.document) return;

    const { target } = event;
    if (!target) return;

    if (!this.#customHTMLTags.includes(target.tagName)) return;
    const value = target._getValue();

    this.document.update({ [target.name]: value });
  }
}

export { SvelteDocumentSheet };