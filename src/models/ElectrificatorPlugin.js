import {
  DefaultPlugin,
  DefaultData,
} from 'leto-modelizer-plugin-core';
import ElectrificatorDrawer from 'src/draw/ElectrificatorDrawer';
import ElectrificatorMetadata from 'src/metadata/ElectrificatorMetadata';
import ElectrificatorParser from 'src/parser/ElectrificatorParser';
import ElectrificatorRenderer from 'src/render/ElectrificatorRenderer';
import { name, version } from 'package.json';

/**
 * Template of plugin model.
 */
class ElectrificatorPlugin extends DefaultPlugin {
  /**
   * Default constructor.
   */
  constructor() {
    const pluginData = new DefaultData({
      name,
      version,
    });

    super({
      pluginData,
      pluginDrawer: new ElectrificatorDrawer(pluginData),
      pluginMetadata: new ElectrificatorMetadata(pluginData),
      pluginParser: new ElectrificatorParser(pluginData),
      pluginRenderer: new ElectrificatorRenderer(pluginData),
    });
  }
}

export default ElectrificatorPlugin;
