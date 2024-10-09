/* eslint-disable @typescript-eslint/no-unused-vars */
import { SvelteDocumentSheet } from './SvelteDocumentSheet.svelte.ts';

class SvelteActorSheet extends SvelteDocumentSheet {
  static DEFAULT_OPTIONS = {
    position: {
      width: 600
    },
    window: {
      controls: [
        {
          action: 'configurePrototypeToken',
          icon: 'fa-solid fa-user-circle',
          label: 'TOKEN.TitlePrototype',
          ownership: 'OWNER'
        },
        {
          action: 'showPortraitArtwork',
          icon: 'fa-solid fa-image',
          label: 'SIDEBAR.CharArt',
          ownership: 'OWNER'
        },
        {
          action: 'showTokenArtwork',
          icon: 'fa-solid fa-image',
          label: 'SIDEBAR.TokenArt',
          ownership: 'OWNER'
        }
      ]
    },
    actions: {
      configurePrototypeToken: SvelteActorSheet.#onConfigurePrototypeToken,
      showPortraitArtwork: SvelteActorSheet.#onShowPortraitArtwork,
      showTokenArtwork: SvelteActorSheet.#onShowTokenArtwork,
    }
  };

  /** The Actor document managed by this sheet. */
  get actor() {
    return this.document;
  }

  /* -------------------------------------------- */

  /**
   * If this sheet manages the ActorDelta of an unlinked Token, reference that Token document.
   */
  get token() {
    return this.document.token || null;
  }

  /* -------------------------------------------- */

  _getHeaderControls() {
    const controls = this.options.window ?? {};
    if (!controls) return controls;

    // Portrait image
    const { img } = this.actor;
    if (img === CONST.DEFAULT_TOKEN) controls.findSplice((c) => c.action === 'showPortraitArtwork');

    // Token image
    const pt = this.actor.prototypeToken;
    const tex = pt.texture.src;
    if (pt.randomImg || [null, undefined, CONST.DEFAULT_TOKEN].includes(tex)) {
      controls.findSplice((c) => c.action === 'showTokenArtwork');
    }
    return controls;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle header control button clicks to render the Prototype Token configuration sheet.
   * @this {ActorSheetV2}
   * @param {PointerEvent} event
   */
  static #onConfigurePrototypeToken(event) {
    event.preventDefault();
    const renderOptions = {
      left: Math.max(this.position.left - 560 - 10, 10),
      top: this.position.top
    };

    // eslint-disable-next-line new-cap
    new CONFIG.Token.prototypeSheetClass(
      this.actor.prototypeToken,
      renderOptions
    ).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle header control button clicks to display actor portrait artwork.
   * @this {ActorSheetV2}
   * @param {PointerEvent} event
   */
  static #onShowPortraitArtwork(event) {
    const { img, name, uuid } = this.actor;
    new ImagePopout(img, { title: name, uuid }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle header control button clicks to display actor portrait artwork.
   * @this {ActorSheetV2}
   * @param {PointerEvent} event
   */
  static #onShowTokenArtwork(event) {
    const { prototypeToken, name, uuid } = this.actor;
    new ImagePopout(prototypeToken.texture.src, { title: name, uuid }).render(true);
  }

  /* -------------------------------------------- */
  /*  Custom Changes                              */
  /* -------------------------------------------- */
  _canDragStart() {
    return this.isEditable;
  }

  _canDragDrop() {
    return this.isEditable;
  }

  _onDragStart(event) {
    const target = event.currentTarget;
    if (!target) return;

    if ('link' in (event.target?.dataset ?? {})) return;

    // Create drag data
    let dragData;

    // Owned Items
    if (target.dataset.itemId) {
      const item = this.actor.items.get(target.dataset.itemId);
      dragData = item?.toDragData();
    }

    // Active Effect
    if (target.dataset.effectId) {
      const effect = this.actor.effects.get(target.dataset.effectId);
      dragData = effect?.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  _attachFrameListeners() {
    super._attachFrameListeners();

    if (this.options.tag === 'form') {
      this.element.addEventListener('drop', this._onDrop.bind(this));
    }
  }

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.document;

    const allowed = Hooks.call('dropActorSheetData', actor, this, data);
    if (allowed === false) return false;

    // Handle different data types
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
      default:
        return false;
    }
  }

  async _onDropActiveEffect(event, data) {
    //
  }

  async _onDropActor(event, data) {
    if (!this.document.isOwner) return false;
    return true;
  }

  async _onDropItem(event, data) {
    if (!this.document.isOwner) return false;

    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    // Handle item sorting within the same Actor
    if (this.document.uuid === item.actor?.uuid) return this._onSortItem(event, itemData);

    // Create the owned item
    return this._onDropItemCreate(itemData, event);
  }

  async _onDropFolder(event, data) { }

  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.document.createEmbeddedDocuments('Item', itemData);
  }

  _onSortItem(event, itemData) {
    // Get the drag source and drop target
    const { items } = this.document;
    const source = items.get(itemData._id);
    if (!source) return false;

    const dropTarget = event.target?.closest('[data-item-id]');
    if (!dropTarget) return false;

    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (source.id === target?.id) return false;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId;
      if (siblingId && (siblingId !== source.id)) siblings.push(items.get(el.dataset.itemId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
    const updateData = sortUpdates.map((u) => {
      const { update } = u;
      update._id = u.target?._id;
      return update;
    });

    // Perform the update
    return this.document.updateEmbeddedDocuments('Item', updateData);
  }
}

export { SvelteActorSheet };