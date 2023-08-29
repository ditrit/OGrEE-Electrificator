import { DefaultConfiguration, Tag } from 'leto-modelizer-plugin-core';

/**
 * The plugin configuration. It defines:
 *  - The default file name.
 *  - The default file extension.
 *  - The editor syntax.
 *  - The tags.
 */
class ElectrificatorConfiguration extends DefaultConfiguration {
  /**
   * Default constructor.
   * @param {object} [props] - Object that contains all properties to set.
   */
  constructor(props = { editor: null }) {
    super({
      ...props,
      editor: {
        ...props.editor,
        // We do not need to define a syntax,
        // JSON is automatically recognized by Leto
        syntax: null,
      },
      tags: [
        new Tag({ type: 'language', value: 'json' }),
        new Tag({ type: 'category', value: 'Electricity' }),
      ],
      defaultFileName: 'schema.json',
      defaultFileExtension: 'json',
    });
  }
}

export { ElectrificatorConfiguration };
