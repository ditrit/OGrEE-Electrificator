import nunjucks from 'nunjucks';
import templates from 'src/render/ElectrificatorTemplate';
import { DefaultRender, FileInput } from 'leto-modelizer-plugin-core';
import { number } from 'nunjucks/src/tests';

/**
 * Template of plugin renderer.
 */
class ElectrificatorRenderer extends DefaultRender {
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
    const parsedComponents = [];

    console.log(map);

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
      components.forEach((component) => {
        this.parseComponent(parsedComponents, component);
      });
      console.log('parsedComponents: ');
      console.log(parsedComponents);
      const generatedContentFromParsedComponents = JSON.stringify(parsedComponents, null, 2);
      files.push(new FileInput({
        path,
        // content: `${this.template.render({ components }).trim()}\n`,
        content: generatedContentFromParsedComponents,
      }));

      this.pluginData.emitEvent({ id, status: 'success' });
    });

    return files;
  }

  /**
   * Append content dict to container objects.
   *
   * @param {object[]} renderedComponentList - List of components.
   * @param {Component} currentComponent - Current component.
   */
  parseComponent(renderedComponentList, currentComponent) {
    switch (currentComponent?.definition.type) {
      case 'container':
        this.renderContainerObject(renderedComponentList, currentComponent);
        break;
      case 'interface':
        this.renderInterface(renderedComponentList, currentComponent);
        break;
      case 'genericDipole':
        this.renderGenericDipole(renderedComponentList, currentComponent);
        break;
      default:
        break;
    }
  }

  /**
   * Get object from list by name.
   *
   * @param {object[]} objectList  List of objects
   * @param {string} name Name of the object to be found
   * @returns {null|object} Object with the name
   */
  getObjectFromListByName(objectList, name) {
    return objectList.reduce((acc, object) => {
      if (acc) {
        return acc;
      } if (object.name === name) {
        return object;
      }
      return null;
    }, null);
  }

  /**
   * Append contentDict to the objects field of the object with the name
   * parentObjectName in the objectList.
   * If the object with the name parentObjectName does not exist in the objectList, it is created.
   *
   * @param {object[]} objectList List of objects
   * @param {string} parentObjectName  Name of the object to which the contentDict is to be appended
   * @param {string} parentField Name of the field in the object to which
   * the contentDict is to be appended
   * @param {object} contentDict Content to be appended
   */
  appendContentDictToContainer(objectList, parentObjectName, parentField, contentDict) {
    const containerObject = this.getObjectFromListByName(objectList, parentObjectName);
    if (containerObject) {
      if (!containerObject[parentField]) {
        containerObject[parentField] = [contentDict];
      } else {
        containerObject[parentField].push(contentDict);
      }
    } else {
      const parent = {
        type: 'container',
        name: parentObjectName,
      };
      parent[parentField] = contentDict;
      objectList.push({ parent });
    }
  }

  renderGenericDipole(renderedComponentList, currentComponent) {
    let parent = 'root';
    currentComponent?.attributes.forEach((attribute) => {
      if (attribute.definition?.name === 'parent') {
        parent = attribute.value;
      }
    });
    const contentDict = {
      name: currentComponent.id,
      attributes: {
        type: 'genericDipole',
      },
      domain: 'electrical',
      category: 'device',
      description: currentComponent.definition.description,
    };

    this.appendContentDictToContainer(renderedComponentList, parent, 'objects', contentDict);
  }

  /**
   * Append contentDict to the objects field of the object with the name
   *
   * @param {object[]} renderedComponentList List of objects
   * @param {Component} currentComponent Content to be appended
   */
  renderContainerObject(
    renderedComponentList,
    currentComponent,
  ) {
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

    let contentDict = {
      name: currentComponent.id,
      parentId: parentObjectName,
      type: 'container',
      attributes,
      domain: 'electrical',
      category: 'electrical_device',
      description: currentComponent.definition.description,
      objects: [],
      links: [],
      interfaces: [],
    };

    const currentObject = this.getObjectFromListByName(renderedComponentList, currentComponent.id);
    // The current object already exists in the list,
    // we have to remove it from the list and add it to the parent object
    if (currentObject) {
      renderedComponentList.splice(renderedComponentList.indexOf(currentObject), 1);
      contentDict = {
        ...contentDict,
        ...currentObject,
      };
    }

    const parentObject = this.getObjectFromListByName(renderedComponentList, parentObjectName);
    if (parentObject) {
      parentObject.objects.push(contentDict);
    } else {
      renderedComponentList.push(contentDict);
    }
  }

  /**
   * Render interfaces in a specified format and add it to the object list.
   *
   * @param {object[]} renderedComponentList List of components that have already been rendered
   * @param {Component} currentComponent Current component to be rendered
   */

  renderInterface(renderedComponentList, currentComponent) {
    let parentId = 'root';
    let domain = null;
    let role = null;
    const attributes = currentComponent?.attributes.reduce((acc, attribute) => {
      if (attribute.definition === null || attribute.definition?.name === 'phase') {
        acc[attribute.name] = attribute.value;
      } else if (attribute.definition?.name === 'parent') {
        parentId = attribute.value;
      } else if (attribute.definition?.name === 'domain') {
        domain = attribute.value;
      } else if (attribute.definition?.name === 'role') {
        role = attribute.value;
      }
      return acc;
    }, {});

    const contentDict = {
      name: currentComponent.id,
      type: 'interface',
      parentId,
      attributes,
      role,
      domain,
      description: currentComponent.definition.description,
    };

    this.appendContentDictToContainer(renderedComponentList, parentId, 'interfaces', contentDict);
  }
}

export { ElectrificatorRenderer };
