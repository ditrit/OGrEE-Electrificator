import { DefaultRender } from 'leto-modelizer-plugin-core';

/**
 * Template of plugin renderer.
 */
class ElectrificatorRenderer extends DefaultRender {
  renderFiles() {
    /*
     * The purpose of this function is to generate all files.
     *
     * You have to map all the given components into a file content and return all files.
     *
     * Implement your own parse function here.
     *
     * Components can be find in `this.pluginData.components`.
     */
    return []; // Return FileInput[].
  }
}

export default ElectrificatorRenderer;
