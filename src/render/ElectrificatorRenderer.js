import nunjucks from 'nunjucks';
import templates from 'src/render/ElectrificatorTemplate';
import { DefaultRender, FileInput } from 'leto-modelizer-plugin-core';

/**
 * Template of plugin renderer.
 */
class ElectrificatorRenderer extends DefaultRender {
  defaultParent = 'stray';

  constructor(pluginData) {
    super(pluginData);

    const Loader = nunjucks.Loader.extend({
      getSource(name) {
        return {
          src: templates[name],
        };
      },
    });
    const env = new nunjucks.Environment(new Loader(), {
      autoescape: false,
      trimBlocks: true,
      lstripBlocks: true,
    });
    this.template = nunjucks.compile(templates.root, env);
  }

  /**
   * Convert all provided components and links in terraform files.
   *
   * @param {string} [parentEventId] - Parent event id.
   * @returns {FileInput[]} Array of generated files from components and links.
   */
  renderFiles(parentEventId = null) {
    /*
     * The purpose of this function is to generate all files.
     *
     * You have to map all the given components into a file content and return all files.
     *
     * Implement your own parse function here.
     *
     * Components can be find in `this.pluginData.components`.
     */
    // return []; // Return FileInput[].

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
   *
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
      };

      components.forEach((component) => {
        this.parseComponent(ctx, component);
      });

      const renderedFile = this.renderFileFromContext(ctx);

      if (ctx.warnings.length > 0) {
        console.log(`Warnings for file ${path}:`);
        console.log(ctx.warnings);
      }

      files.push(new FileInput({
        path,
        // content: `${this.template.render({ components }).trim()}\n`,
        content: renderedFile,
      }));

      this.pluginData.emitEvent({ id, status: 'success' });
    });

    return files;
  }

  /**
   * Append content dict to container objects.
   *
   * @param {object} ctx - The context of the parsing.
   * @param {Component} currentComponent - Current component.
   */
  parseComponent(ctx, currentComponent) {
    switch (currentComponent?.definition.type) {
      case 'container':
        this.renderContainerObject(ctx, currentComponent);
        break;
      case 'electricalInterface':
        this.renderElectricalInterface(ctx, currentComponent);
        break;
      case 'genericDipole':
        this.renderGenericDipole(ctx, currentComponent);
        break;
      case 'electricalLine':
        this.renderElectricalLine(ctx, currentComponent);
        break;
      case 'circuitBreaker':
        this.renderCircuitBreaker(ctx, currentComponent);
        break;
      default:
        ctx.warnings.push(`Component type ${currentComponent.definition.type} is not supported (${currentComponent.name})`);
        break;
    }
  }

  /**
   * For debug, render a map.
   *
   * @param {string} key The object key.
   * @param {any} value The object value.
   * @returns {any} The value.
   */
  replacer(key, value) {
    if (value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    }
    return value;
  }

  /**
   * Render an object in hierarchical form from the rendered objects.
   *
   * @param {object} ctx The context of the parsing.
   * @returns {string} The rendered file.
   */
  renderFileFromContext(ctx) {
    // TODO: Maybe clone the object to avoid side effects ?
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

    ctx.rendered.containers.set(this.defaultParent, {
      name: this.defaultParent,
      parentId: null,
      type: 'container',
      attributes: {},
      domain: 'general',
      description: [],
      objects: [],
      links: [],
      interfaces: [],
    });

    ctx.rendered.devices.forEach((device) => {
      if (device.parentId === null) {
        device.parentId = this.defaultParent;
        ctx.warnings.push(`Device ${device.name} has no parent: set to ${this.defaultParent}`);
        return;
      }

      const parent = ctx.rendered.containers.get(device.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Device ${device.name} parent is invalid ${device.parentId}: set to ${this.defaultParent}`);
        device.parentId = this.defaultParent;
        return;
      }

      parent.objects.push(device);
    });

    ctx.rendered.interfaces.forEach((inter) => {
      if (inter.parentId === null) {
        inter.parentId = this.defaultParent;
        ctx.warnings.push(`Interface ${inter.name} has no parent: set to ${this.defaultParent}`);
        return;
      }

      const parent = ctx.rendered.containers.get(inter.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Interface ${inter.name} parent is invalid ${inter.parentId}: set to ${this.defaultParent}`);
        inter.parentId = this.defaultParent;
        return;
      }

      parent.interfaces.push(inter);
    });

    ctx.rendered.links.forEach((link) => {
      if (link.parentId === null) {
        link.parentId = this.defaultParent;
        ctx.warnings.push(`Link ${link.name} has no parent: set to ${this.defaultParent}`);
        return;
      }

      const parent = ctx.rendered.containers.get(link.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Link ${link.name} parent is invalid (${link.parentId}): set to ${this.defaultParent}`);
        link.parentId = this.defaultParent;
        return;
      }

      parent.links.push(link);
    });

    const childrenMap = this.createContainerChildrenMap(ctx.rendered.containers);

    let done = false;
    while (!done) {
      done = true;
      const childrenToDelete = [];
      childrenMap.forEach((children, parentId) => {
        if (children.size === 0) {
          return;
        }
        const toDelete = [];
        children.forEach((child) => {
          // The child is in the map, it means it also has children of its own,
          // do not render it yet.
          if (childrenMap.has(child.name)) {
            return;
          }

          // The child is not in the map, it means it has no children, render it.
          const parent = ctx.rendered.containers.get(parentId);
          parent.objects.push(child);
          toDelete.push(child.name);
        });
        // Remove rendered children from the map.
        toDelete.forEach((name) => {
          children.splice(children.indexOf(name), 1);
          if (children.length === 0) {
            childrenToDelete.push(parentId);
          }
          done = false;
        });
      });
      // Remove rendered parents from the map.
      childrenToDelete.forEach((parentId) => {
        childrenMap.delete(parentId);
      });
    }

    // Render the root containers.
    const rootContainers = [];
    ctx.rendered.containers.forEach((container) => {
      if (container.parentId === null) {
        rootContainers.push(container);
      }
    });

    return JSON.stringify(rootContainers, null, 2);
  }

  /**
   * Create a Map of the children of each container.
   * If a container has no parent, it is set as a root container.
   * If a container has no children, it is not in the map.
   *
   * @param {Map<string, object>} containerMap List of containers
   * @returns {Map<string,object>} Map of the children of each container
   */
  createContainerChildrenMap(containerMap) {
    const childrenMap = new Map();
    containerMap.forEach((container) => {
      if (container.parentId === null) {
        if (!childrenMap.has(container.name)) {
          childrenMap.set(container.name, []);
        }
        return;
      }

      const parent = childrenMap.get(container.parentId);
      if (parent) {
        parent.push(container);
      } else {
        childrenMap.set(container.parentId, [container]);
      }
    });
    return childrenMap;
  }

  /**
   * Render container object.
   *
   * @param {object} ctx The context of the parsing.
   * @param {Component} currentComponent Current component.
   */
  renderGenericDipole(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portIn = null;
    let portOut = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parent') {
        parent = attribute.value;
      }
      if (attribute.definition?.name === 'portIn') {
        portIn = attribute.value;
      }
      if (attribute.definition?.name === 'portOut') {
        portOut = attribute.value;
      }
    });

    const contentDict = {
      name: currentComponent.id,
      attributes: {},
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports: {
        in: [
          { name: 'portIn', domain: 'electrical', linkedTo: portIn },
        ],
        out: [
          { name: 'portOut', domain: 'electrical', linkedTo: portOut },
        ],
      },
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  /**
   * Render circuit breaker object.
   *
   * @param {object} ctx The context of the parsing.
   * @param {Component} currentComponent Current component.
   */
  renderCircuitBreaker(ctx, currentComponent) {
    let parent = this.defaultParent;
    let portIn = null;
    let portOut = null;
    let portControl = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parent') {
        parent = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portIn = attribute.value;
      } else if (attribute.definition?.name === 'portOut') {
        portOut = attribute.value;
      } else if (attribute.definition?.name === 'portControl') {
        portControl = attribute.value;
      }
    });

    const contentDict = {
      name: currentComponent.id,
      attributes: {},
      type: currentComponent.definition.type,
      domain: 'electrical',
      category: 'device',
      parentId: parent,
      description: currentComponent.definition.description,
      ports: {
        in: [
          { name: 'portIn', domain: 'electrical', linkedTo: portIn },
          { name: 'portControl', domain: 'control', linkedTo: portControl },
        ],
        out: [
          { name: 'portOut', domain: 'electrical', linkedTo: portOut },
        ],
      },
    };

    ctx.rendered.devices.set(currentComponent.id, contentDict);
  }

  /**
   * Append contentDict to the objects field of the object with the name
   *
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Content to be appended
   */
  renderContainerObject(ctx, currentComponent) {
    let parentObjectName = null;
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parent' || attribute.definition?.name === 'parentContainer'
          || attribute.definition?.name === 'floor') {
        parentObjectName = attribute.value;
      }
    });

    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition === null) {
        acc[attribute.name] = attribute.value;
      }
      return acc;
    }, {});

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
   *
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered
   */

  renderElectricalInterface(ctx, currentComponent) {
    let parentId = this.defaultParent;
    let role = null;
    let portIn = null;
    let portOut = null;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition === null || attribute.definition?.name === 'phase') {
        acc[attribute.name] = attribute.value;
      } else if (attribute.definition?.name === 'parentContainer') {
        parentId = attribute.value;
      } else if (attribute.definition?.name === 'role') {
        role = attribute.value;
      } else if (attribute.definition?.name === 'portIn') {
        portIn = attribute.value;
      } else if (attribute.definition?.name === 'portOut') {
        portOut = attribute.value;
      }
      return acc;
    }, {});

    const contentDict = {
      name: currentComponent.id,
      type: 'electrical_interface',
      parentId,
      attributes,
      role,
      domain: 'electrical',
      description: currentComponent.definition.description,
      ports: {
        in: [
          { name: 'portIn', domain: 'electrical', linkedTo: portIn },
        ],
        out: [
          { name: 'portOut', domain: 'electrical', linkedTo: portOut },
        ],
      },
    };

    ctx.rendered.interfaces.set(currentComponent.id, contentDict);
  }

  /**
   * Render links in a specified format and add it to the object list.
   *
   * @param {object} ctx The parsing context.
   * @param {Component} currentComponent Current component to be rendered
   */
  renderElectricalLine(ctx, currentComponent) {
    let parentId = this.defaultParent;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition === null || attribute.definition?.name === 'phase') {
        acc[attribute.name] = attribute.value;
      } else if (attribute.definition?.name === 'parentContainer') {
        parentId = attribute.value;
      }
      return acc;
    }, {});

    const contentDict = {
      name: currentComponent.id,
      type: 'electrical_line',
      parentId,
      attributes,
      domain: 'electrical',
      description: currentComponent.definition.description,
      ports: { in: [], out: [] },
    };

    ctx.rendered.links.set(currentComponent.id, contentDict);
  }
}

export { ElectrificatorRenderer };
