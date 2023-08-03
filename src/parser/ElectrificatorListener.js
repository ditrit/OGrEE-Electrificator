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
      (acc, [key, value]) => acc,
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

  enter_Link(ctx) {

  }

  exit_Link(ctx) {

  }

  enter_Interface(ctx) {

  }

  exit_Interface(ctx) {

  }

  enter_atomicObject(ctx) {

  }

  exit_atomicObject(ctx) {

  }
}

export { ElectrificatorListener };
