import { DefaultDrawer } from 'leto-modelizer-plugin-core';

/*
 * By default the DefaultDrawer use D3 to draw.
 *
 * Feel free to override the default draw method if you want to use another library.
 *
 * Only the function draw is called by Leto-Modelizer with the id of the canvas and all the components to draw.
 */
class ElectrificatorDrawer extends DefaultDrawer {
  constructor(pluginData, resources, rootId, options) {
    super(pluginData, resources, rootId, {
      ...options,
      minHeight: 80,
      minWidth: 110,
      margin: 5,
    });
  }
}

export { ElectrificatorDrawer };
