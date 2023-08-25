class ElectrificatorAQLRenderer {
  documentCollectionName = 'objects';

  connectionEdgeCollectionName = 'connectionEdges';

  parentEdgeCollectionName = 'parentHoodEdges';

  constructor(defaultParent = 'stray') {
    this.defaultParent = defaultParent;
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
  renderAQLDocument(document, documentCollectionName) {
    document._key = document.name;
    return `INSERT ${JSON.stringify(document)} INTO ${documentCollectionName}`;
  }

  /**
   * Render a link object into an insert query.
   * @param {string} from The name of the source object.
   * @param {string} to The name of the destination object.
   * @param {string} edgeCollectionName The name of the edge collection.
   * @returns {string} The rendered query edge.
   */
  renderAQLEdge(from, to, edgeCollectionName) {
    return `INSERT {_from:"${this.documentCollectionName}/${from}", _to:"${this.documentCollectionName}/${to}"} INTO ${edgeCollectionName}`;
  }

  /**
   * Render an object in a flat form (interpretable by ARANGO) from the rendered objects .
   * @param {object} originalContext The context of the parsing.
   * @returns {string} The rendered file.
   */
  renderAQLFileFromContext(originalContext) {
    const renderedAQLObjects = [];
    const renderedAQLLinks = [];
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
        renderedAQLLinks.push(this.renderAQLEdge(
          device.name,
          device.parentId,
          this.parentEdgeCollectionName,
        ));
      }

      Object.values(device.ports).forEach((portType) => {
        portType.forEach((port) => {
          delete port.linkedTo;
        });
      });

      renderedAQLObjects.push(this.renderAQLDocument(device, this.documentCollectionName));
    });

    ctx.rendered.containers.forEach((container) => {
      const parent = ctx.rendered.containers.get(container.parentId);
      if (parent === undefined) {
        ctx.warnings.push(`Container ${container.name} parent is invalid ${container.parentId}: set to ${null}`);
        container.parentId = null;
      } else {
        renderedAQLLinks.push(this.renderAQLEdge(
          container.name,
          container.parentId,
          this.parentEdgeCollectionName,
        ));
      }

      renderedAQLObjects.push(this.renderAQLDocument(container, this.documentCollectionName));
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
        renderedAQLLinks.push(this.renderAQLEdge(
          inter.name,
          inter.parentId,
          this.parentEdgeCollectionName,
        ));
      }

      Object.values(inter.ports).forEach((portType) => {
        portType.forEach((port) => {
          delete port.linkedTo;
        });
      });

      renderedAQLObjects.push(this.renderAQLDocument(inter, this.documentCollectionName));
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
        renderedAQLLinks.push(this.renderAQLEdge(
          link.name,
          link.parentId,
          this.parentEdgeCollectionName,
        ));
      }
      renderedAQLObjects.push(this.renderAQLDocument(link, this.documentCollectionName));

      link.ports.in.forEach((port) => {
        renderedAQLLinks.push(this.renderAQLEdge(
          port.name,
          link.name,
          this.connectionEdgeCollectionName,
        ));
      });
      link.ports.out.forEach((port) => {
        renderedAQLLinks.push(this.renderAQLEdge(
          link.name,
          port.name,
          this.connectionEdgeCollectionName,
        ));
      });
    });
    return `${renderedAQLObjects.concat(renderedAQLLinks).join('\n')}`;
  }
}

export { ElectrificatorAQLRenderer };
