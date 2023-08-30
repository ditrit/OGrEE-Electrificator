import { DefaultRender, FileInput } from 'leto-modelizer-plugin-core';
import { copyObject } from 'src/render/utils';
import { ElectrificatorAQLRenderer } from 'src/render/ElectrificatorAQLRenderer';

/**
 * The plugin renderer.
 * It parses the Leto Modelizer components into our self-defined JSON format
 * that will be written to files.
 * It handles the switch from the "Draw" tab to the "Text" tab.
 */
class ElectrificatorRenderer extends DefaultRender {
  // Terrator uses nunjucks to render the files.
  // It isn't currently used in this plugin.
  // TODO : Evaluate if it is possible and useful to use it.

  /**
   * The name of the container where all orphan components will be placed.
   * @type {string}
   */
  defaultParent = 'stray';

  /**
   * Generate all files from components and links.
   * @param {string} [parentEventId] - Parent event id.
   * @returns {FileInput[]} Array of generated files from components and links.
   */
  renderFiles(parentEventId) {
    return this.generateFilesFromComponentsMap(
      this.pluginData.components.reduce(
        (map, component) => {
          if (!map.has(component.path)) {
            map.set(component.path, [component]);
          } else {
            map.get(component.path).push(component);
          }
          return map;
        },
        new Map(),
      ),
      parentEventId,
    );
  }

  /**
   * Render files from related components.
   * @param {Map<string,Component[]>} map - Components mapped by file name.
   * @param {string} parentEventId - Parent event id.
   * @returns {FileInput[]} Render files array.
   */
  generateFilesFromComponentsMap(map, parentEventId) {
    const files = [];

    map.forEach((components, path) => {
      const id = this.pluginData.emitEvent({
        parent: parentEventId,
        type: 'Render',
        action: 'write',
        status: 'running',
        files: [path],
        data: {
          global: false,
        },
      });
      const ctx = {
        rendered: {
          links: new Map(),
          devices: new Map(),
          interfaces: new Map(),
          containers: new Map(),
        },
        partiallyRendered: {
          links: new Map(),
          devices: new Map(),
          interfaces: new Map(),
          containers: new Map(),
        },
        warnings: [],
        info: [],
      };

      components.forEach((component) => {
        this.renderComponent(ctx, component);
      });

      const renderedJSONFile = this.renderFileFromContext(ctx);

      if (ctx.info.length > 0) {
        console.log(`Info for file ${path}:`, ctx.info);
      }
      if (ctx.warnings.length > 0) {
        console.log(`Warnings for file ${path}:`, ctx.warnings);
      }

      files.push(new FileInput({
        path,
        content: renderedJSONFile,
      }));

      const AQlRenderer = new ElectrificatorAQLRenderer(this.pluginData, path, this.defaultParent);
      const renderedAQLFile = AQlRenderer.generateAQLFilesFromContext(ctx);
      renderedAQLFile.forEach((file) => files.push(file));

      this.pluginData.emitEvent({ id, status: 'success' });
    });

    return files;
  }

  /**
   * Append content dict to container objects.
   * @param {object} ctx - The context of the parsing.
   * @param {Component} currentComponent - Current component.
   */
  renderComponent(ctx, currentComponent) {
    switch (currentComponent?.definition.type) {
      case 'container':
        this.renderContainerObject(ctx, currentComponent);
        break;
      case 'electricalInputInterface':
      case 'electricalOutputInterface':
        this.renderElectricalInterface(ctx, currentComponent);
        break;
      case 'genericDipole':
        this.renderGenericDipole(ctx, currentComponent);
        break;
      case 'electricalLine':
        this.renderElectricalLine(ctx, currentComponent);
        break;
      case 'controlInputInterface':
      case 'controlOutputInterface':
        this.renderControlInterface(ctx, currentComponent);
        break;
      case 'controlLine':
        this.renderControlLine(ctx, currentComponent);
        break;
      case 'circuitBreaker':
        this.renderCircuitBreaker(ctx, currentComponent);
        break;
      case 'externalDevice':
        this.renderExternalDevice(ctx, currentComponent);
        break;
      case 'contactor':
        this.renderContactor(ctx, currentComponent);
        break;
      case 'switch':
        this.renderSwitch(ctx, currentComponent);
        break;
      case 'energyMeter':
        this.renderEnergyMeter(ctx, currentComponent);
        break;
      case 'mxCoil':
        this.renderMxCoil(ctx, currentComponent);
        break;
      case 'securityKey':
        this.renderSecurityKey(ctx, currentComponent);
        break;
      case 'transformer':
        this.renderTransformer(ctx, currentComponent);
        break;
      case 'ground':
        this.renderGround(ctx, currentComponent);
        break;
      case 'fuse':
        this.renderFuse(ctx, currentComponent);
        break;
      case 'switchDisconnector':
        this.renderSwitchDisconnector(ctx, currentComponent);
        break;
      case 'disconnector':
        this.renderDisconnector(ctx, currentComponent);
        break;
      case 'electricalSupply':
        this.renderElectricalSupply(ctx, currentComponent);
        break;
      case 'manualActuator':
        this.renderManualActuator(ctx, currentComponent);
        break;
      case 'kmCoil':
        this.renderKmCoil(ctx, currentComponent);
        break;
      case 'generalActuator':
        this.renderGeneralActuator(ctx, currentComponent);
        break;
      case 'sts':
        this.renderSts(ctx, currentComponent);
        break;
      case 'junctionBox':
        this.renderJunctionBox(ctx, currentComponent);
        break;
      default:
        ctx.warnings.push(`Component type ${currentComponent.definition.type} is not supported (${currentComponent.name})`);
        break;
    }
  }

  /**
   * Render an object in hierarchical form from the rendered objects.
   * @param {object} originalCtx The context of the parsing.
   * @returns {string} The rendered file.
   */
  renderFileFromContext(originalCtx) {
    const ctx = copyObject(originalCtx);
    if (ctx.partiallyRendered.containers.size > 0) {
      ctx.partiallyRendered.containers.forEach((container) => {
        ctx.warnings.push(`Container ${container.name} is not fully rendered`);
      });
    }
    if (ctx.partiallyRendered.interfaces.size > 0) {
      ctx.partiallyRendered.interfaces.forEach((inter) => {
        ctx.warnings.push(`Interface ${inter.name} is not fully rendered`);
      });
    }
    if (ctx.partiallyRendered.devices.size > 0) {
      ctx.partiallyRendered.devices.forEach((device) => {
        ctx.warnings.push(`Device ${device.name} is not fully rendered`);
      });
    }
    if (ctx.partiallyRendered.links.size > 0) {
      ctx.partiallyRendered.links.forEach((link) => {
        ctx.warnings.push(`Link ${link.name} is not fully rendered`);
      });
    }

    const defaultParent = {
      name: this.defaultParent,
      parentId: null,
      type: 'container',
      attributes: {},
      domain: 'general',
      description: [],
      objects: [],
      links: [],
      interfaces: [],
    };

    ctx.rendered.devices.forEach((device) => {
      if (device.parentId === null) {
        ctx.warnings.push(`Device ${device.name} has no parent: set to ${this.defaultParent}`);
        device.parentId = this.defaultParent;
        defaultParent.objects.push(device);
        return;
      }

      const parent = ctx.rendered.containers.get(device.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Device ${device.name} parent is invalid ${device.parentId}: set to ${this.defaultParent}`);
        device.parentId = this.defaultParent;
        defaultParent.objects.push(device);
        return;
      }

      parent.objects.push(device);
    });

    ctx.rendered.interfaces.forEach((inter) => {
      if (inter.parentId === null) {
        ctx.warnings.push(`Interface ${inter.name} has no parent: set to ${this.defaultParent}`);
        inter.parentId = this.defaultParent;
        defaultParent.interfaces.push(inter);
        return;
      }

      const parent = ctx.rendered.containers.get(inter.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Interface ${inter.name} parent is invalid ${inter.parentId}: set to ${this.defaultParent}`);
        inter.parentId = this.defaultParent;
        defaultParent.interfaces.push(inter);
        return;
      }

      parent.interfaces.push(inter);
    });

    ctx.rendered.links.forEach((link) => {
      if (link.parentId === null) {
        ctx.warnings.push(`Link ${link.name} has no parent: set to ${this.defaultParent}`);
        link.parentId = this.defaultParent;
        defaultParent.links.push(link);
        return;
      }

      const parent = ctx.rendered.containers.get(link.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Link ${link.name} parent is invalid (${link.parentId}): set to ${this.defaultParent}`);
        link.parentId = this.defaultParent;
        defaultParent.links.push(link);
        return;
      }

      parent.links.push(link);
    });

    // Add the default parent if needed
    if (defaultParent.objects.length > 0
        || defaultParent.interfaces.length > 0
        || defaultParent.links.length > 0) {
      ctx.info.push(`Default parent "${this.defaultParent}" added`);
      ctx.rendered.containers.set(this.defaultParent, defaultParent);
    }

    const containerMap = new Map();
    ctx.rendered.containers.forEach((container) => {
      containerMap.set(container.name, container);
    });

    // Render the root containers and form the container hierarchy
    const rootContainers = [];
    ctx.rendered.containers.forEach((container) => {
      if (container.parentId === null) {
        rootContainers.push(container);
      } else {
        containerMap.get(container.parentId).objects.push(container);
      }
    });

    return JSON.stringify(rootContainers, null, 2);
  }

  /**
   * Ancient Work around for the fact that the value of an object could sometime be
   * a string or an array.
   * Kept it because replacing it generated a lot of eslint warnings.
   * TODO: remove once knowing how to fix the warnings properly.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component.
   * @param {string|Array|null} linkValue The value of the link attribute
   * @returns {string|null} The name of the link
   */
  getLinkName(ctx, currentComponent, linkValue) {
    if (linkValue === null) {
      return null;
    }

    return Array.isArray(linkValue) ? linkValue[0] : linkValue;
  }

  /**
   * Connects an input of a component to a line and mark it as an output of the line.
   * If the line has been rendered, the connection is added to the line.
   * If the line has not been rendered, the connection is added to the partially rendered line
   * (that will be created if necessary).
   * @param {object} ctx The parsing context.
   * @param {string} lineName The name of the line that is connected.
   * @param {string} componentName The name of the component that is connected.
   * @param {string} portName The name of the component port.
   * @param {string} portType The type of the component (device/interface).
   */
  makeConnectionInput(ctx, lineName, componentName, portName, portType) {
    const connection = {
      type: portType,
      name: componentName,
      port: portName,
    };
    const renderedLine = ctx.rendered.links.get(lineName);
    if (renderedLine !== undefined) {
      renderedLine.ports.out.push(connection);
      return;
    }

    const partiallyRenderedLine = ctx.partiallyRendered.links.get(lineName);
    if (partiallyRenderedLine !== undefined) {
      partiallyRenderedLine.ports.out.push(connection);
      return;
    }

    ctx.partiallyRendered.links.set(lineName, {
      name: lineName,
      ports: {
        in: [],
        out: [connection],
      },
    });
  }

  /**
   * Connects an output of a component to a line and mark it as an input of the line.
   * If the line has been rendered, the connection is added to the line.
   * If the line has not been rendered, the connection is added to the partially rendered line
   * (that will be created if necessary).
   * @param {object} ctx The parsing context.
   * @param {string} lineName The name of the line that is connected.
   * @param {string} componentName The name of the component that is connected.
   * @param {string} portName The name of the component port.
   * @param {string} portType The type of the component (device/interface).
   */
  makeConnectionOutput(ctx, lineName, componentName, portName, portType) {
    const connection = {
      type: portType,
      name: componentName,
      port: portName,
    };
    const renderedLine = ctx.rendered.links.get(lineName);
    if (renderedLine !== undefined) {
      renderedLine.ports.in.push(connection);
      return;
    }
    const partiallyRenderedLine = ctx.partiallyRendered.links.get(lineName);
    if (partiallyRenderedLine !== undefined) {
      partiallyRenderedLine.ports.in.push(connection);
      return;
    }

    ctx.partiallyRendered.links.set(lineName, {
      name: lineName,
      ports: {
        in: [connection],
        out: [],
      },
    });
  }

  /**
   * Report the connections of the object to the lines it is connected to.
   * @param {object} ctx The parsing context.
   * @param {string} componentName The name of the component.
   * @param {object} ports The ports of the component.
   */
  makeConnections(ctx, componentName, ports) {
    ports.in.forEach((port) => {
      // The port is connected to an interface or a line in another file or is not connected.
      // Skip it.
      if (port.source || port.linkedTo === null) { return; }

      this.makeConnectionInput(ctx, port.linkedTo, componentName, port.name, port.domain);
    });
    ports.out.forEach((port) => {
      // The port is connected to an interface or a line in another file or is not connected.
      // Skip it.
      if (port.source || port.linkedTo === null) { return; }

      this.makeConnectionOutput(ctx, port.linkedTo, componentName, port.name, port.domain);
    });
  }

  /**
   * Render container object.
   * @param {object} ctx The context of the parsing.
   * @param {Component} currentComponent Current component.
   */
  renderGenericDipole(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portInLine = null;
    let portOutLine = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portOut') {
        portOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portIn', domain: 'electrical', linkedTo: portInLine },
      ],
      out: [
        { name: 'portOut', domain: 'electrical', linkedTo: portOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  /**
   * Render an actionable dipole object.
   * Used for circuit breaker, contactor, etc. That behaves the same way.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent  Current component.
   */
  renderActionableDipole(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portInLine = null;
    let portOutLine = null;
    let portControlLine = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portOut') {
        portOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portControl') {
        portControlLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portIn', domain: 'electrical', linkedTo: portInLine },
        { name: 'portControl', domain: 'control', linkedTo: portControlLine },
      ],
      out: [
        { name: 'portOut', domain: 'electrical', linkedTo: portOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  /**
   * Render circuit breaker object.
   * @param {object} ctx The context of the parsing.
   * @param {Component} currentComponent Current component.
   */
  renderCircuitBreaker(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  /**
   * Render contactor object.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component.
   */
  renderContactor(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  /**
   * Render a switch object.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component.
   */
  renderSwitch(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  /**
   * Append contentDict to the objects field of the object with the name
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Content to be appended
   */
  renderContainerObject(ctx, currentComponent) {
    let parentObjectName = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parent'
          || attribute.definition?.name === 'parentContainer'
          || attribute.definition?.name === 'floor') {
        parentObjectName = attribute.value;
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const contentDict = {
      name: currentComponent.id,
      parentId: parentObjectName,
      type: currentComponent.definition.type,
      attributes,
      domain: 'general',
      description: currentComponent.definition.description,
      objects: [],
      links: [],
      interfaces: [],
    };

    ctx.rendered.containers.set(currentComponent.id, contentDict);
  }

  /**
   * Render interfaces in a specified format and add it to the object list.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered
   */

  renderElectricalInterface(ctx, currentComponent) {
    let parentId = this.defaultParent;
    let portInLine = null;
    let portOutLine = null;
    let inoutputSource = null;
    let inoutputName = null;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition === null || attribute.definition?.name === 'phase') {
        acc[attribute.name] = attribute.value;
      } else if (attribute.definition?.name === 'parentContainer') {
        parentId = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portOut') {
        portOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'inputSource' || attribute.definition?.name === 'outputSource') {
        inoutputSource = attribute.value;
      } else if (attribute.definition?.name === 'inputName' || attribute.definition?.name === 'outputName') {
        inoutputName = attribute.value;
      } else {
        acc[attribute.name] = attribute.value;
      }
      return acc;
    }, {});

    const ports = {
      in: [],
      out: [],
    };

    // For now, only one side of the interface is rendered in the same file.
    // We indicate where the interface is connected to on the other side by adding a source field.
    if (currentComponent.definition.type === 'electricalInputInterface') {
      attributes.role = 'input';
      ports.in.push({
        name: 'portIn', domain: 'electrical', linkedTo: inoutputName, source: inoutputSource,
      });
      ports.out.push({ name: 'portOut', domain: 'electrical', linkedTo: portOutLine });
    } else {
      attributes.role = 'output';
      ports.out.push({
        name: 'portOut', domain: 'electrical', linkedTo: inoutputName, source: inoutputSource,
      });
      ports.in.push({ name: 'portIn', domain: 'electrical', linkedTo: portInLine });
    }

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      type: 'electricalInterface',
      parentId,
      attributes,
      domain: 'electrical',
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.interfaces.set(currentComponent.id, contentDict);
  }

  /**
   * Render links in a specified format and add it to the object list.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered
   */
  renderElectricalLine(ctx, currentComponent) {
    // Look for the parent container and serialise the attributes
    let parentId = this.defaultParent;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parentId = attribute.value;
      } else if (attribute.definition?.name === 'phase') {
        acc[attribute.name] = attribute.value;
      } else {
        acc[attribute.name] = attribute.value;
      }
      return acc;
    }, {});

    // Get the input and output ports from the partially rendered line
    // and delete the partially rendered line
    const partiallyRendered = ctx.partiallyRendered.links.get(currentComponent.id);
    const input = partiallyRendered?.ports?.in ?? [];
    const output = partiallyRendered?.ports?.out ?? [];
    ctx.partiallyRendered.links.delete(currentComponent.id);

    const contentDict = {
      name: currentComponent.id,
      type: currentComponent.definition.type,
      parentId,
      attributes,
      domain: 'electrical',
      description: currentComponent.definition.description,
      ports: { in: input, out: output },
    };

    ctx.rendered.links.set(currentComponent.id, contentDict);
  }

  /**
   * Render a control interface in a specified format and add it to the object list.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered
   */
  renderControlInterface(ctx, currentComponent) {
    let parentId = this.defaultParent;
    const domain = 'control';
    let portInLine = null;
    let portOutLine = null;
    let sourceAttributeValue = null;
    let nameAttributeValue = null;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition === null || attribute.definition?.name === 'phase') {
        acc[attribute.name] = attribute.value;
      } else if (attribute.definition?.name === 'parentContainer') {
        parentId = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portOut') {
        portOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'inputSource' || attribute.definition?.name === 'outputSource') {
        sourceAttributeValue = attribute.value;
      } else if (attribute.definition?.name === 'inputName' || attribute.definition?.name === 'outputName') {
        nameAttributeValue = attribute.value;
      } else {
        acc[attribute.name] = attribute.value;
      }
      return acc;
    }, {});

    const ports = {
      in: [],
      out: [],
    };

    if (currentComponent.definition.type === 'controlInputInterface') {
      attributes.role = 'input';
      ports.in.push({
        name: 'portIn', domain, linkedTo: nameAttributeValue, source: sourceAttributeValue,
      });
      ports.out.push({ name: 'portOut', domain, linkedTo: portOutLine });
    } else {
      attributes.role = 'output';
      ports.out.push({
        name: 'portOut', domain, linkedTo: nameAttributeValue, source: sourceAttributeValue,
      });
      ports.in.push({ name: 'portIn', domain, linkedTo: portInLine });
    }

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      type: 'controlInterface',
      parentId,
      attributes,
      domain,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.interfaces.set(currentComponent.id, contentDict);
  }

  /**
   * Render Control Line in a specified format and add it to the object list.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered
   */
  renderControlLine(ctx, currentComponent) {
    // Look for the parent container and serialise the attributes
    let parentId = this.defaultParent;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parentId = attribute.value;
      } else {
        acc[attribute.name] = attribute.value;
      }
      return acc;
    }, {});

    // Get the input and output ports from the partially rendered line
    // and delete the partially rendered line
    const partiallyRendered = ctx.partiallyRendered.links.get(currentComponent.id);
    const input = partiallyRendered?.ports?.in ?? [];
    const output = partiallyRendered?.ports?.out ?? [];
    ctx.partiallyRendered.links.delete(currentComponent.id);

    const contentDict = {
      name: currentComponent.id,
      type: currentComponent.definition.type,
      parentId,
      attributes,
      domain: 'control',
      description: currentComponent.definition.description,
      ports: { in: input, out: output },
    };

    ctx.rendered.links.set(currentComponent.id, contentDict);
  }

  /**
   * Render devices in a specified format and add it to the object list.
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered (external device)
   */
  renderExternalDevice(ctx, currentComponent) {
    let parent = this.defaultParent;
    const attributes = {};
    let portInLine = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portIn', domain: 'electrical', linkedTo: portInLine },
      ],
      out: [],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderEnergyMeter(ctx, currentComponent) {
    this.renderGenericDipole(ctx, currentComponent);
  }

  renderMxCoil(ctx, currentComponent) {
    let parent = this.defaultParent;
    const attributes = {};
    let portControlOutLine = null;
    let portControlInLine = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portControlIn') {
        portControlInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portControlOut') {
        portControlOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portControlIn', domain: 'control', linkedTo: portControlInLine },
      ],
      out: [
        { name: 'portControlOut', domain: 'control', linkedTo: portControlOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'control',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderSecurityKey(ctx, currentComponent) {
    let parent = this.defaultParent;
    const attributes = {};
    let portControlOutLine = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portControlOut') {
        portControlOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'keyType') {
        attributes.keyType = attribute.value;
      } else if (attribute.definition?.name === 'keyId') {
        attributes.keyId = attribute.value;
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [],
      out: [
        { name: 'portControlOut', domain: 'control', linkedTo: portControlOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'control',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderTransformer(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  renderGround(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portInLine = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portIn', domain: 'electrical', linkedTo: portInLine },
      ],
      out: [],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderFuse(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  renderSwitchDisconnector(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  renderDisconnector(ctx, currentComponent) {
    this.renderActionableDipole(ctx, currentComponent);
  }

  renderElectricalSupply(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portOutLine = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portOut') {
        portOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [],
      out: [
        { name: 'portOut', domain: 'electrical', linkedTo: portOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderManualActuator(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portControlOutLine = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portControlOut') {
        portControlOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [],
      out: [
        { name: 'portControlOut', domain: 'control', linkedTo: portControlOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'control',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderKmCoil(ctx, currentComponent) {
    let parent = this.defaultParent;
    const attributes = {};
    let portControlOutLine = null;
    let portControlInLine = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portControlIn') {
        portControlInLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portControlOut') {
        portControlOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portControlIn', domain: 'control', linkedTo: portControlInLine },
      ],
      out: [
        { name: 'portControlOut', domain: 'control', linkedTo: portControlOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'control',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderGeneralActuator(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portControlOutLine = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portControlOut') {
        portControlOutLine = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [],
      out: [
        { name: 'portControlOut', domain: 'control', linkedTo: portControlOutLine },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'control',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderSts(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portInA = null;
    let portInB = null;
    let portOut = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portOut') {
        portOut = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portInA') {
        portInA = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portInB') {
        portInB = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portInA', domain: 'electrical', linkedTo: portInA },
        { name: 'portInB', domain: 'electrical', linkedTo: portInB },
      ],
      out: [
        { name: 'portOut', domain: 'electrical', linkedTo: portOut },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  renderJunctionBox(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portIn = null;
    let portGround = null;
    let portOutA = null;
    let portOutB = null;
    const attributes = {};
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parentContainer') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portOutA') {
        portOutA = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portOutB') {
        portOutB = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portIn') {
        portIn = this.getLinkName(ctx, currentComponent, attribute.value);
      } else if (attribute.definition?.name === 'portGround') {
        portGround = this.getLinkName(ctx, currentComponent, attribute.value);
      } else {
        attributes[attribute.name] = attribute.value;
      }
    });

    const ports = {
      in: [
        { name: 'portIn', domain: 'electrical', linkedTo: portIn },
      ],
      out: [
        { name: 'portOutA', domain: 'electrical', linkedTo: portOutA },
        { name: 'portOutB', domain: 'electrical', linkedTo: portOutB },
        { name: 'portGround', domain: 'electrical', linkedTo: portGround },
      ],
    };

    this.makeConnections(ctx, currentComponent.id, ports);

    const contentDict = {
      name: currentComponent.id,
      attributes,
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports,
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }
}

export { ElectrificatorRenderer };
