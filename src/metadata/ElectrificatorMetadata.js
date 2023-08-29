import Ajv from 'ajv';
import {
  DefaultMetadata, ComponentDefinition, ComponentAttributeDefinition,
} from 'leto-modelizer-plugin-core';

import metadata from 'src/assets/metadata/index.js';
import { MetadataValidationSchema } from 'src/assets/metadata/validation/index.js';

/**
 * Metadata is used to generate definition of Component and ComponentAttribute of the plugin
 */
class ElectrificatorMetadata extends DefaultMetadata {
  constructor(pluginData) {
    super(pluginData);
    this.ajv = new Ajv();
    this.schema = MetadataValidationSchema;
    // this.getAttributeDefinition = this.getAttributeDefinition.bind(this);
  }

  /**
   * Validate the provided metadata with a schemas.
   * @returns {boolean} True if metadata is valid.
   */
  validate() {
    const errors = [];
    const validate = this.ajv.compile(this.schema);
    Object.entries(metadata).forEach((metadataName, metadataValue) => {
      if (!validate(metadataValue)) {
        errors.push({
          metadataName,
          errors: validate.errors,
        });
      }
    });

    if (errors.length > 0) {
      throw new Error('Metadata are not valid', { cause: errors });
    }

    return true;
  }

  /**
   * Parse the metadata to generate the components' definition.
   * @param {string} parentEventId The parent event id.
   */
  parse(parentEventId) {
    /*
     * Implement this to provide all the definitions describing the components.
     *
     * ComponentDefinition is used to generate the instantiable component list.
     *
     * And the componentAttributeDefinition is used to generate the form to update a component.
     *
     * Both of them can be also used to check components in parser and generate errors.
     */

    const id = this.pluginData.emitEvent({
      parent: parentEventId,
      type: 'MetadataParser',
      action: 'createComponentDefinitions',
      status: 'running',
      files: ['components.json'],
      data: {
        global: false,
      },
    });

    /**
     * The list of components' definition.
     * @type {ComponentDefinition[]}
     */
    const components = [];

    Object.values(metadata.components).forEach((component) => {
      components.push(new ComponentDefinition({
        ...component,
        definedAttributes: component.attributes
          .map((attribute) => new ComponentAttributeDefinition({ ...attribute })),
      }));
    });

    this.pluginData.definitions = {
      components: [
        ...components,
      ],
      links: [],
    };

    this.pluginData.initLinkDefinitions(parentEventId);
    this.pluginData.emitEvent({ id, status: 'success' });
  }
}

export { ElectrificatorMetadata };
