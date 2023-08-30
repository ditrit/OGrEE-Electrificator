import { FileInput } from 'leto-modelizer-plugin-core';
import { copyObject } from 'src/render/utils';

/**
 * A custom renderer that generates AQL files from the parsed objects.
 * It does NOT extend the default renderer to allow reusing the work we did in
 * the ElectrificatorRenderer.
 */
class ElectrificatorAQLRenderer {
  /**
   * The rendered objects in a flat form.
   * @type {{parentEdges: {documents: [], collection: string},
   * connectionEdges: {documents: [], collection: string},
   * objects: {documents: [], collection: string}}}
   */
  rendered = {
    objects: {
      collection: 'objects',
      documents: [],
    },
    parentEdges: {
      collection: 'parentHoodEdges',
      documents: [],
    },
    connectionEdges: {
      collection: 'connectionEdges',
      documents: [],
    },
  };

  /**
   * Construcs the AQL renderer.
   * @param {DefaultData} pluginData The plugin data.
   * @param {string} path The path of the original rendered file
   * (ends with json or with no extension).
   * @param {string} defaultParent The default parent name.
   */
  constructor(pluginData, path, defaultParent = 'stray') {
    this.pluginData = pluginData;
    this.defaultParent = defaultParent;
    this.path = path.replace('.json', '');

    // We use variables to allow the user to change the collection names.
    // The names matter as they are used to define edges.
    this.pluginData.variables.forEach((variable) => {
      if (variable.name === 'objectsCollection') {
        this.rendered.objects.collection = variable.value;
      } else if (variable.name === 'connectionEdgesCollection') {
        this.rendered.connectionEdges.collection = variable.value;
      } else if (variable.name === 'parentEdgesCollection') {
        this.rendered.parentEdges.collection = variable.value;
      } else {
        throw new Error(`Unknown variable ${variable.name}`);
      }
    });
  }

  /**
   * Render a container object into an insert query.
   * @param {object} document The document to render.
   * @param {string} documentCollectionName The name of the document collection.
   * @returns {string} The rendered query document.
   */
  renderAQLDocumentINSERTQuery(document, documentCollectionName) {
    document._key = document.name;
    return `INSERT ${JSON.stringify(document)} INTO ${documentCollectionName}`;
  }

  /**
   * Render a container object into an insert query.
   * @param {object} document The document to render.
   * @returns {string} The rendered query document.
   */
  renderAQLDocument(document) {
    document._key = document.name;
    return `${JSON.stringify(document)}`;
  }

  /**
   * Render a link object into an insert query.
   * @param {string} from The name of the source object.
   * @param {string} to The name of the destination object.
   * @param {string} edgeCollectionName The name of the edge collection.
   * @returns {string} The rendered query edge.
   */
  renderAQLEdgeINSERTQuery(from, to, edgeCollectionName) {
    return `INSERT {_from:"${this.rendered.objects.collection}/${from}", _to:"${this.rendered.objects.collection}/${to}"} INTO ${edgeCollectionName}`;
  }

  /**
   * Render a link object into an insert query.
   * @param {string} from The name of the source object.
   * @param {string} to The name of the destination object.
   * @returns {string} The rendered query edge.
   */
  renderAQLEdge(from, to) {
    return `{"_from":"${this.rendered.objects.collection}/${from}", "_to":"${this.rendered.objects.collection}/${to}"}`;
  }

  /**
   * Render an object in a flat form (interpretable by ARANGO) from the rendered objects .
   * @param {object} originalContext The context of the parsing.
   */
  renderAQLFromContext(originalContext) {
    const ctx = copyObject(originalContext);
    let needDefaultParent = false;

    ctx.rendered.devices.forEach((device) => {
      if (device.parentId === null) {
        device.parentId = this.defaultParent;
        needDefaultParent = true;
        ctx.warnings.push(`Device ${device.name} has no parent: set to ${this.defaultParent}`);
      }

      const parent = ctx.rendered.containers.get(device.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Device ${device.name} parent is invalid ${device.parentId}: set to ${this.defaultParent}`);
        needDefaultParent = true;
        device.parentId = this.defaultParent;
      } else {
        this.rendered.parentEdges.documents.push(this.renderAQLEdge(
          device.name,
          device.parentId,
        ));
      }

      Object.values(device.ports).forEach((portType) => {
        portType.forEach((port) => {
          delete port.linkedTo;
        });
      });

      this.rendered.objects.documents.push(this.renderAQLDocument(device));
    });

    ctx.rendered.interfaces.forEach((inter) => {
      if (inter.parentId === null) {
        inter.parentId = this.defaultParent;
        ctx.warnings.push(`Interface ${inter.name} has no parent: set to ${this.defaultParent}`);
        needDefaultParent = true;
      }

      const parent = ctx.rendered.containers.get(inter.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Interface ${inter.name} parent is invalid ${inter.parentId}: set to ${this.defaultParent}`);
        needDefaultParent = true;
        inter.parentId = this.defaultParent;
      } else {
        this.rendered.parentEdges.documents.push(this.renderAQLEdge(
          inter.name,
          inter.parentId,
        ));
      }

      Object.values(inter.ports).forEach((portType) => {
        portType.forEach((port) => {
          delete port.linkedTo;
        });
      });

      this.rendered.objects.documents.push(this.renderAQLDocument(inter));
    });

    ctx.rendered.links.forEach((link) => {
      if (link.parentId === null) {
        link.parentId = this.defaultParent;
        ctx.warnings.push(`Link ${link.name} has no parent: set to ${this.defaultParent}`);
        needDefaultParent = true;
      }

      const parent = ctx.rendered.containers.get(link.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Link ${link.name} parent is invalid (${link.parentId}): set to ${this.defaultParent}`);
        needDefaultParent = true;
        link.parentId = this.defaultParent;
      } else {
        this.rendered.parentEdges.documents.push(this.renderAQLEdge(
          link.name,
          link.parentId,
        ));
      }
      this.rendered.objects.documents.push(this.renderAQLDocument(link));

      link.ports.in.forEach((port) => {
        this.rendered.connectionEdges.documents.push(this.renderAQLEdge(port.name, link.name));
      });
      link.ports.out.forEach((port) => {
        this.rendered.connectionEdges.documents.push(this.renderAQLEdge(link.name, port.name));
      });
    });

    // Add the default parent if needed
    if (needDefaultParent) {
      ctx.rendered.containers.set(this.defaultParent, {
        name: this.defaultParent,
        parentId: null,
        type: 'container',
        attributes: {},
        domain: 'general',
        description: [],
      });
    }

    ctx.rendered.containers.forEach((container) => {
      const parent = ctx.rendered.containers.get(container.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Container ${container.name} parent is invalid ${container.parentId}: set to null`);
        container.parentId = null;
      } else {
        this.rendered.parentEdges.documents.push(this.renderAQLEdge(
          container.name,
          container.parentId,
        ));
      }

      this.rendered.objects.documents.push(this.renderAQLDocument(container));
    });
  }

  /**
   * Generate JSONL files importable using arangoimport from the rendered objects.
   * @param {object} originalContext The context of the parsing.
   * @returns {FileInput[]} The generated files.
   */
  generateAQLFilesFromContext(originalContext) {
    this.renderAQLFromContext(originalContext);
    const files = [];
    Object.values(this.rendered).forEach((collection) => files.push(new FileInput({
      path: `${this.path}_${collection.collection}.jsonl`,
      content: collection.documents.join('\n'),
    })));

    return files;
  }
}

export { ElectrificatorAQLRenderer };
