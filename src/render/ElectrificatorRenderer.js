import nunjucks from 'nunjucks';
import templates from 'src/render/ElectrificatorTemplate';
import { DefaultRender, FileInput } from 'leto-modelizer-plugin-core';

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
   * @param {object[]} componentList - List of components.
   * @param {Component} currentComponent - Current component.
   */
  parseComponent(componentList, currentComponent) {
    let contentDict = {};
    let parent = null;

    if (currentComponent?.definition.type === 'container') {
      contentDict = {
        name: currentComponent.id,
        type: 'container',
        attributes: {},
        domain: 'electrical',
        category: 'electrical_device',
        description: currentComponent.definition.description,
        objects: [],
        links: [],
        interfaces: [],
      };
      currentComponent?.attributes.forEach((attribute) => {
        if (attribute.definition?.name === 'parent') {
          parent = attribute.value;
        }
      });
      this.parseContainerObject(componentList, parent, currentComponent.id, contentDict);
    }

    if (currentComponent?.definition.type === 'genericDipole') {
      parent = 'root';
      contentDict = {
        name: currentComponent.id,
        attributes: {
          type: 'genericDipole',
        },
        domain: 'electrical',
        category: 'electrical_device',
        description: currentComponent.definition.description,
      };
      console.log(currentComponent?.attributes.values());
      currentComponent?.attributes.forEach((attribute) => {
        console.log(`attribute: ${attribute}`);
        if (attribute.definition?.name === 'parent') {
          parent = attribute.value;
        }
      });
      this.appendContentDictToContainerObjects(componentList, parent, contentDict);
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
   * @param {object} contentDict Content to be appended
   */
  appendContentDictToContainerObjects(objectList, parentObjectName, contentDict) {
    const containerObject = this.getObjectFromListByName(objectList, parentObjectName);
    if (containerObject) {
      containerObject.objects.push(contentDict);
    } else {
      objectList.push({
        type: 'container',
        name: parentObjectName,
        objects: [contentDict],
      });
    }
  }

  /**
   * Append contentDict to the objects field of the object with the name
   *
   * @param {object[]} objectList List of objects
   * @param {string|null} parentObjectName Name of the object to which the contentDict
   * is to be appended
   * @param {string} childrenObjectName  Name of the object to which the contentDict belongs.
   * @param {object} contentDict Content to be appended
   */
  parseContainerObject(
    objectList,
    parentObjectName,
    childrenObjectName,
    contentDict,
  ) {
    const currentObject = this.getObjectFromListByName(objectList, childrenObjectName);
    // The current object already exists in the list,
    // we have to remove it from the list and add it to the parent object
    if (currentObject) {
      objectList.splice(objectList.indexOf(currentObject), 1);
      contentDict = {
        ...currentObject,
        ...contentDict,
      };
    }

    const containerObject = this.getObjectFromListByName(objectList, parentObjectName);
    if (containerObject) {
      containerObject.objects.push(contentDict);
    } else {
      objectList.push(contentDict);
    }
  }
}

export { ElectrificatorRenderer };
