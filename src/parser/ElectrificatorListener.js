import { Component } from 'leto-modelizer-plugin-core';

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
   * Current Container
   *
   * @type {Component}
   */
  currentContainer = null;

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
    console.log(`enter_Container: ${ctx.current.name}`);
    this.currentContainer = this.createComponent(
      ctx.current.name,
      this.definitions.find((definition) => definition.type === 'container'),
      ctx.current.attributes,
    );
  }

  exit_Container(ctx) {
    this.components.push(this.currentContainer);
    this.currentContainer = null;
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
