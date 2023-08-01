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
   * @param {Map<string,Component>} map - Component mapped by file name.
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
      console.log(components);
      console.log(path);
      const generated_content = components.forEach((component) => {
        this.generateContentFromComponent(component);
      });
      files.push(new FileInput({
        path,
        // content: `${this.template.render({ components }).trim()}\n`,
        content: JSON.stringify(components),
      }));

      this.pluginData.emitEvent({ id, status: 'success' });
    });

    return files;
  }

  generateContentFromComponent(component) {
    return JSON.stringify(component);
  }
}

export default ElectrificatorRenderer;
