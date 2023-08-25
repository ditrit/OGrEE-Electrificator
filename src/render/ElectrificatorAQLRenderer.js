import { FileInput } from 'leto-modelizer-plugin-core';

class ElectrificatorAQLRenderer {
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

  constructor(path, defaultParent = 'stray') {
    this.defaultParent = defaultParent;
    this.path = path.replace('.json', '');
  }

  /**
   * Used to convert Map to JSON. It adds a dataType field to the Map object to identify it.
   * Useful to copy objects that have Map fields.
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
   * Used to convert JSON-Converted Map (with replacer) to a Map object. It checks
   * if the dataType field is set to Map.
   * Useful to copy objects that have Map fields.
   * @param {string} key The key.
   * @param {any} value The value.
   * @returns {Map<string, object[]>|any} The revived value.
   */
  reviver(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
    }
    return value;
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
    const ctx = JSON.parse(JSON.stringify(originalContext, this.replacer), this.reviver);

    ctx.rendered.containers.set(this.defaultParent, {
      name: this.defaultParent,
      parentId: null,
      type: 'container',
      attributes: {},
      domain: 'general',
      description: [],
    });

    ctx.rendered.devices.forEach((device) => {
      if (device.parentId === null) {
        device.parentId = this.defaultParent;
        ctx.warnings.push(`Device ${device.name} has no parent: set to ${this.defaultParent}`);
      }

      const parent = ctx.rendered.containers.get(device.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Device ${device.name} parent is invalid ${device.parentId}: set to ${this.defaultParent}`);
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

    ctx.rendered.containers.forEach((container) => {
      const parent = ctx.rendered.containers.get(container.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Container ${container.name} parent is invalid ${container.parentId}: set to ${null}`);
        container.parentId = null;
      } else {
        this.rendered.parentEdges.documents.push(this.renderAQLEdge(
          container.name,
          container.parentId,
        ));
      }

      this.rendered.objects.documents.push(this.renderAQLDocument(container));
    });

    ctx.rendered.interfaces.forEach((inter) => {
      if (inter.parentId === null) {
        inter.parentId = this.defaultParent;
        ctx.warnings.push(`Interface ${inter.name} has no parent: set to ${this.defaultParent}`);
      }

      const parent = ctx.rendered.containers.get(inter.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Interface ${inter.name} parent is invalid ${inter.parentId}: set to ${this.defaultParent}`);
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
      }

      const parent = ctx.rendered.containers.get(link.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Link ${link.name} parent is invalid (${link.parentId}): set to ${this.defaultParent}`);
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
  }

  /**
   * Generate JSON files importable using arangoimport from the rendered objects.
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
