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

  enter_Container(ctx) {
    const definition = this.definitions.find(
      (def) => def.type === 'container',
    );
    const attributes = Object.entries(ctx.current.attributes).reduce(
      (acc, [key, value]) => {
        acc.push(new ComponentAttribute({
          name: key,
          value,
          type: 'string',
          definition: null,
        }));
        return acc;
      },
      [],
    );

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

  exit_Container(ctx) {
    this.components.push(this.containerStack.pop());
  }

  enter_electricalInterface(ctx) {
    const definition = this.definitions.find((def) => def.type === 'electricalInterface');

    const attributes = Object.entries(ctx.current.attributes).reduce((acc, [key, value]) => {
      const attributeDefinition = definition.definedAttributes.find(
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

  exit_electricalInterface(ctx) {

  }

  enter_electricalLine(ctx) {
    console.log('enter_electricalLine');
    const definition = this.definitions.find((def) => def.type === 'electricalLine');

    const attributes = Object.entries(ctx.current.attributes).reduce((acc, [key, value]) => {
      const attributeDefinition = definition.definedAttributes.find(
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

  exit_electricalLine(ctx) {

  }

  enter_atomicObject(ctx) {

  }

  exit_atomicObject(ctx) {

  }
}

export { ElectrificatorListener };
