import {
  DefaultMetadata, ComponentDefinition, ComponentAttributeDefinition,
} from 'leto-modelizer-plugin-core';

import metadata from 'src/assets/metadata/index.js';

/*
 * Metadata is used to generate definition of Component and ComponentAttribute.
 *
 * In our plugin managing Terraform, we use [Ajv](https://ajv.js.org/) to validate metadata.
 * And we provide a `metadata.json` to define all metadata.
 *
 * Feel free to manage your metadata as you wish.
 */
class ElectrificatorMetadata extends DefaultMetadata {
  validate() {
    return super.validate();
  }

  parse() {
    /*
     * Implement this to provide all the definitions describing the components.
     *
     * ComponentDefinition is used to generate the instantiable component list.
     *
     * And the componentAttributeDefinition is used to generate the form to update a component.
     *
     * Both of them can be also used to check components in parser and generate errors.
     */

    // DemoMetadata

    const components = [];

    Object.values(metadata.components).forEach((component) => {
      console.log(component);
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
    };

    this.pluginData.initLinkDefinitions();
  }
}

export { ElectrificatorMetadata };
