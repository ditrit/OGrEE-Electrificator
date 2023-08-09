import { Component, ComponentAttribute } from 'leto-modelizer-plugin-core';

/**
 * ElectrificatorListener for json files
 */
class ElectrificatorListener {
  /**
   * Parsed components.
   *
   * @type {Component[]}
   */
  components = [];

  /**
   * Container stack.
   *
   * @type {Component[]}
   */
  containerStack = [];

  /**
   * Default constructor.
   *
   * @param {FileInformation} fileInformation - File information.
   * @param {ComponentDefinition[]} definitions - All component definitions.
   */
  constructor(fileInformation, definitions) {
    /**
     * File information.
     *
     * @type {FileInformation}
     */
    this.fileInformation = fileInformation;
    /**
     * Array of component definitions.
     *
     * @type {ComponentDefinition[]}
     */
    this.definitions = definitions;
  }

  /**
   * Create component except workflow type component.
   *
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
   *
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

  enter_Container(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);

    // Check if there is a parent container in the stack.
    const parent = this.containerStack.find((container) => container.id === ctx.current.parentId);
    if (parent) {
      attributes.push(new ComponentAttribute({
        name: 'parentContainer',
        value: parent.id,
        type: 'string',
        definition: definition.definedAttributes.find((attribute) => attribute.name === 'parentContainer'),
      }));
    }
    this.containerStack.push(this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    ));
  }

  exit_Container() {
    this.components.push(this.containerStack.pop());
  }

  enter_electricalInterface(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);

    const parent = this.containerStack.find((container) => container.id === ctx.current.parentId);
    if (parent) {
      attributes.push(new ComponentAttribute({
        name: 'parentContainer',
        value: parent.id,
        type: 'string',
        definition: definition.definedAttributes.find((attribute) => attribute.name === 'parentContainer'),
      }));
    }

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

    const parent = this.containerStack.find((container) => container.id === ctx.current.parentId);
    if (parent) {
      attributes.push(new ComponentAttribute({
        name: 'parentContainer',
        value: parent.id,
        type: 'string',
        definition: definition.definedAttributes.find((attribute) => attribute.name === 'parentContainer'),
      }));
    }

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_electricalLine() {

  }

  enter_circuitBreaker(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);

    const parent = this.containerStack.find((container) => container.id === ctx.current.parentId);
    if (parent) {
      attributes.push(new ComponentAttribute({
        name: 'parentContainer',
        value: parent.id,
        type: 'string',
        definition: definition.definedAttributes.find((attribute) => attribute.name === 'parentContainer'),
      }));
    }

    attributes.push(new ComponentAttribute({
      name: 'portIn',
      value: ctx.current.ports.in.filter((port) => port.name === 'portIn')[0].linkedTo,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === 'portIn'),
    }));
    attributes.push(new ComponentAttribute({
      name: 'portOut',
      value: ctx.current.ports.out.filter((port) => port.name === 'portOut')[0].linkedTo,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === 'portOut'),
    }));
    attributes.push(new ComponentAttribute({
      name: 'portControl',
      value: ctx.current.ports.in.filter((port) => port.name === 'portControl')[0].linkedTo,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === 'portControl'),
    }));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_circuitBreaker() {}

  enter_externalDevice(ctx) {
    const definition = this.definitions.find((def) => def.type === ctx.current.type);
    const attributes = this.restoreAttributes(ctx.current.attributes, definition);

    const parent = this.containerStack.find((container) => container.id === ctx.current.parentId);
    if (parent) {
      attributes.push(new ComponentAttribute({
        name: 'parentContainer',
        value: parent.id,
        type: 'string',
        definition: definition.definedAttributes.find((attribute) => attribute.name === 'parentContainer'),
      }));
    }

    const portName = 'portIn';
    attributes.push(new ComponentAttribute({
      name: portName,
      value: ctx.current.ports.in.find((port) => port.name === portName).linkedTo,
      type: 'string',
      definition: definition.definedAttributes.find((attribute) => attribute.name === portName),
    }));

    const component = this.createComponent(
      ctx.current.name,
      definition,
      attributes,
    );
    this.components.push(component);
  }

  exit_externalDevice() {}
}

export { ElectrificatorListener };
