import { DefaultMetadata, ComponentDefinition, ComponentAttributeDefinition } from 'leto-modelizer-plugin-core';

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

    /*
    const objectDefinition = new ComponentDefinition('object');
    objectDefinition.definedAttributes.push(new ComponentAttributeDefinition(
      'name',
      'string',
      [],
      true,
    ));
    objectDefinition.isContainer = true;

    const innerObjectDefinition = new ComponentDefinition('innerObject');
    innerObjectDefinition.definedAttributes.push(new ComponentAttributeDefinition(
      'name',
      'string',
      [],
      true,
    ));

    this.pluginData.definitions = {
      components: [objectDefinition, innerObjectDefinition],
    };
    */

    // DemoMetadata

    this.pluginData.__nameAttributeDefinition = new ComponentAttributeDefinition({
      name: 'name',
      type: 'String',
      required: true,
      rules: {
        min: 3,
        max: 100,
        regex: /[A-Z]{1}[a-z]+(-[A-Z]{1}[a-z]+)*/,
      },
    });

    this.pluginData.__networkAttributeDefinition = new ComponentAttributeDefinition({
      name: 'network',
      type: 'Reference',
      containerRef: 'network',
    });

    // Component Definitions
    this.pluginData.__networkDefinition = new ComponentDefinition({
      type: 'network',
      icon: 'DefaultIcon',
      model: 'DefaultContainer',
      parentTypes: ['network'],
      childrenTypes: ['server', 'network'],
      definedAttributes: [this.pluginData.__nameAttributeDefinition,
        this.pluginData.__networkAttributeDefinition],
      isContainer: true,
    });

    this.pluginData.__serverDefinition = new ComponentDefinition({
      type: 'server',
      icon: 'DefaultIcon',
      model: 'DefaultModel',
      parentTypes: ['network'],
      definedAttributes: [
        this.pluginData.__nameAttributeDefinition,
        this.pluginData.__networkAttributeDefinition,
      ],
      isContainer: false,
    });

    this.pluginData.definitions = {
      components: [
        this.pluginData.__networkDefinition,
        this.pluginData.__serverDefinition,
      ],
    };

    this.pluginData.initLinkDefinitions();
  }
}

export default ElectrificatorMetadata;
