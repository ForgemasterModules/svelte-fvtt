import { mount, unmount } from 'svelte';

function SvelteApplicationMixin(BaseApplication) {
  class SvelteApplication extends BaseApplication {
    #componentInstance;

    #svelteData;

    constructor(...args) {
      const { svelte, ...options } = args[0];
      super(options);

      // Check for svelte data
      if (!svelte) throw Error('No Svelte data found.');

      // Check if a component exists to initialize
      const { component } = svelte;
      if (!component) throw new Error('No Component Found.');

      this.#svelteData = svelte;
    }

    async close(options = {}) {
      // Destroy Component instance
      if (this.#componentInstance) {
        unmount(this.#componentInstance);
        this.#componentInstance = null;
      }

      options.animate = false;
      return super.close(options);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async _prepareContext(options = {}) {
      const context = {};
      return context;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async _renderHTML(context, options) {
      // Update context for props

      return '';
    }

    _replaceHTML() { }

    async _renderFrame(options) {
      const context = await this._prepareContext(options);
      const frame = await super._renderFrame(options);

      const target = this.hasFrame ? frame.querySelector('.window-content') : frame;
      if (!target) return frame;

      const { component } = this.#svelteData ?? {};
      if (!component) return frame;

      // @ts-expect-error
      target.innerContent = '';
      this.#componentInstance = mount(component, {
        target,
        props: { ...this.props, context }
      });

      return frame;
    }
  }

  return SvelteApplication;
}

export { SvelteApplicationMixin };