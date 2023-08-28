import { DefaultPlugin, DefaultData } from 'leto-modelizer-plugin-core';
import { ElectrificatorConfiguration } from 'src/models/ElectrificatorConfiguration';
import { ElectrificatorDrawer } from 'src/draw/ElectrificatorDrawer';
import { ElectrificatorMetadata } from 'src/metadata/ElectrificatorMetadata';
import { ElectrificatorParser } from 'src/parser/ElectrificatorParser';
import { ElectrificatorRenderer } from 'src/render/ElectrificatorRenderer';
import packageInfo from 'package.json';

// TODO: Importing the whole package.json is not a good idea as it will be included in the bundle.
// Find another way to get the package name and version.
const PACKAGE_NAME = packageInfo.name;
const PACKAGE_VERSION = packageInfo.version;

/**
 * Template of plugin model.
 */
class ElectrificatorPlugin extends DefaultPlugin {
  /**
   * Default constructor.
   * @param {object} props - All properties to set.
   */
  constructor(props = {
    event: null,
  }) {
    const pluginConfiguration = new ElectrificatorConfiguration();

    const pluginData = new DefaultData(pluginConfiguration, {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
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

export { ElectrificatorPlugin };
