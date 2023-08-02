import {
  DefaultPlugin,
  DefaultData, DefaultConfiguration,
} from 'leto-modelizer-plugin-core';
import ElectrificatorDrawer from 'src/draw/ElectrificatorDrawer';
import ElectrificatorMetadata from 'src/metadata/ElectrificatorMetadata';
import { ElectrificatorParser } from 'src/parser/ElectrificatorParser';
import ElectrificatorRenderer from 'src/render/ElectrificatorRenderer';
import { name, version } from 'package.json';

/**
 * Template of plugin model.
 */
class ElectrificatorPlugin extends DefaultPlugin {
  /**
   * Default constructor.
   *
   * @param props
   */
  constructor(props = {
    event: null,
  }) {
    const pluginConfiguration = new DefaultConfiguration({
      defaultFileName: 'datacenter.json',
    });

    const pluginData = new DefaultData(pluginConfiguration, {
      name,
      version,
    }, props.event);

    super({
      pluginData,
      configuration: pluginConfiguration,
      pluginDrawer: new ElectrificatorDrawer(pluginData),
      pluginMetadata: new ElectrificatorMetadata(pluginData),
      pluginParser: new ElectrificatorParser(pluginData),
      pluginRenderer: new ElectrificatorRenderer(pluginData),
    });
  }
}

export default ElectrificatorPlugin;
