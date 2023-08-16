import { Component, ComponentAttribute } from 'leto-modelizer-plugin-core';

/**
 * ElectrificatorListener for json files
 */
class ElectrificatorListener {
  /**
   * Parsed components.
   * @type {Component[]}
   */
  components = [];

  /**
   * Container stack.
   * @type {Component[]}
   */
  containerStack = [];

  /**
   * Default constructor.
   * @param {FileInformation} fileInformation - File information.
   * @param {ComponentDefinition[]} definitions - All component definitions.
   */
  constructor(fileInformation, definitions) {
    /**
     * File information.
     * @type {FileInformation}
     */
    this.fileInformation = fileInformation;
    /**
     * Array of component definitions.
     * @type {ComponentDefinition[]}
     */
    this.definitions = definitions;
  }

  /**
   * Create component except workflow type component.
   * @param {string} id - Component id.
   * @param {ComponentDefinition} definition -  Component definition.
   * @param {ComponentAttribute[]} [attributes] - Component attribute.
   * @returns {Component} Created component with default attribute(s) and properties.
   */
  createComponent(id, definition, attributes) {
    return new Component({
      id,
      definition,
      path: this.fileInformation.path,
      attributes,
    });
  }

  /**
   * Restore attributes from json file. If attribute is not defined in component definition, it will
   * be added as a string attribute.
   * @param {object} attributes - Attributes from json file.
   * @param {ComponentDefinition} componentDefinition - Component definition.
   * @returns {ComponentAttribute[]} Restored attributes.
   */
  restoreAttributes(attributes, componentDefinition) {
    return Object.entries(attributes).reduce((acc, [key, value]) => {
      const attributeDefinition = componentDefinition.definedAttributes.find(
        (attribute) => attribute.name === key,
      );
      acc.push(new ComponentAttribute({
        name: key,
        value,
        type: 'string',
        definition: attributeDefinition || null,
      }));
      return acc;
    }, []);
  }

  /**
   * Restore ports from json file.
   * @param {object} ports - Ports from json file.
   * @param {ComponentDefinition} componentDefinition - Component definition.
   * @returns {ComponentAttribute[]} Restored ports.
   */
  restorePorts(ports, componentDefinition) {
    const portList = [];

    // TODO: is "Array" the right type? Should it be "Link" ?
    // Currently, copied from the jobs of githubator

    Object.values(ports).forEach((portType) => {
      portType.forEach((port) => {
        // Is it useful to skip ports if they are empty
        if (port.linkedTo === null) {
          return;
        }

        portList.push(new ComponentAttribute({
          name: port.name,
          value: [port.linkedTo],
          type: 'Array',
          definition: componentDefinition.definedAttributes.find(
            (attribute) => attribute.name === port.name,
          ),
        }));
      });
    });

    return portList;
  }

  /**
   * Restore the 'parentContainer' attribute from a component.
   * @param {ComponentDefinition} definition The component definition.
   * @param {string} parentId The id of the parent container.
   * @returns {ComponentAttribute} The 'parentContainer' attribute.
   */
  restoreParentContainer(definition, parentId) {
    // TODO: Is it useful to check if the parent container exists?
    // Check if there is a parent container in the stack.
    // const parent = this.containerStack.find((container) => container.id === parentId);
    // if (parent) {
    return new ComponentAttribute({
      name: 'parentContainer',
      value: parentId,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === 'parentContainer'),
    });
    // }
    //
  }

  /**
   * Restore a generic dipole with a control line.
   * It is used for the "circuitBreaker" component, the "contactor" component and so on.
   * @param {object} ctx The parsing context.
   */
  createActionableDipole(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    let attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes = attributes.concat(this.restorePorts(ctx.current.ports, definition));
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  enter_Container(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    this.containerStack.push(this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    ));
  }

  exit_Container() {
    this.components.push(this.containerStack.pop());
  }

  /**
   * Create a generic dipole. Can be used for other components that have the same interface
   * as a generic dipole.
   * @param {object} ctx The parsing context.
   */
  enter_genericDipole(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    let attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes = attributes.concat(this.restorePorts(ctx.current.ports, definition));
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_genericDipole() {}

  enter_electricalInterface(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    let attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes = attributes.concat(this.restorePorts(ctx.current.ports, definition));
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    attributes.push(new ComponentAttribute({
      name: 'role',
      value: ctx.current.role,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === 'role'),
    }));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_electricalInterface() {

  }

  enter_electricalLine(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_electricalLine() {}

  enter_controlInterface(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    let attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes = attributes.concat(this.restorePorts(ctx.current.ports, definition));
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    attributes.push(new ComponentAttribute({
      name: 'role',
      value: ctx.current.role,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === 'role'),
    }));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_controlInterface() {}

  enter_controlLine(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);
    attributes.push(this.restoreParentContainer(definition, ctx.current.parentId));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_controlLine() {}

  enter_circuitBreaker(ctx) {
    this.createActionableDipole(ctx);
  }

  exit_circuitBreaker() {}

  enter_externalDevice(ctx) {
    this.enter_genericDipole(ctx);
  }

  exit_externalDevice() {}

  enter_contactor(ctx) {
    this.createActionableDipole(ctx);
  }

  exit_contactor() {}

  enter_switch(ctx) {
    this.createActionableDipole(ctx);
  }

  exit_switch() {}

  enter_energyMeter(ctx) {
    this.enter_genericDipole(ctx);
  }

  exit_energyMeter() {}

  enter_mxCoil(ctx) {
    this.enter_genericDipole(ctx);
  }

  exit_mxCoil() {}

  enter_securityKey(ctx) {
    this.enter_genericDipole(ctx);
  }

  exit_securityKey() {}

  enter_transformer(ctx) {
    this.enter_genericDipole(ctx);
  }

  exit_transformer() {}

  enter_ground(ctx) {
    this.enter_genericDipole(ctx);
  }

  exit_ground() {}

  enter_fuse(ctx) {
    this.createActionableDipole(ctx);
  }

  exit_fuse() {}

  enter_switchDisconnector(ctx) {
    this.createActionableDipole(ctx);
  }

  exit_switchDisconnector() {}
}

export { ElectrificatorListener };
