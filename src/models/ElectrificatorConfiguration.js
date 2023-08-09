import { DefaultConfiguration, Tag } from 'leto-modelizer-plugin-core';

/**
 * Electrificator configuration.
 */
class ElectrificatorConfiguration extends DefaultConfiguration {
  /**
   * Default constructor.
   *
   * @param {object} [props] - Object that contains all properties to set.
   */
  constructor(props) {
    super({
      ...props,
      editor: {
        ...props.editor,
        // TODO: Define syntax
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
