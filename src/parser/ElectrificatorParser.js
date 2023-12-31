import { DefaultParser, Variable } from 'leto-modelizer-plugin-core';
import { ElectrificatorListener } from 'src/parser/ElectrificatorListener';

/**
 * The plugin parser. It parses our self-defined JSON format into
 * Leto Modelizer components that will be drawn.
 * It handles the switch from the "Text" tab to the "Draw" tab.
 */
class ElectrificatorParser extends DefaultParser {
  /**
   * Check if the file is parsable by this parser.
   * The parsable file formats are:
   *   - JSON.
   * @param {FileInformation} fileInformation - File information.
   * @returns {boolean} True if the file is parsable, false otherwise.
   */
  isParsable(fileInformation) {
    return /^.*\.json$/.test(fileInformation.path);
  }

  /**
   * Get the list of model paths from all files.
   * @param {FileInformation[]} [files] - List of files.
   * @returns {string[]} List of folder paths that represent a model.
   */
  getModels(files = []) {
    return files.filter((file) => this.isParsable(file))
      .reduce((acc, file) => {
        const model = file.path.split('/').slice(0, -1).join('/');

        if (!acc.includes(model)) {
          acc.push(model);
        }

        return acc;
      }, []);
  }

  /**
   * Convert the content of files into Components.
   * @param {FileInformation} diagram - Diagram file information.
   * @param {FileInput[]} [inputs] - Data you want to parse.
   * @param {string} [parentEventId] - Parent event id.
   */
  parse(diagram, inputs = [], parentEventId = '') {
    /*
     * Implement your own parse function here.
     *
     * You receive in `inputs` a list of content file.
     *
     * In our plugin managing the terraform files, we use antlr for parsing. You can find an example
     * of the terraform parser in https://github.com/ditrit/iactor/blob/dev/src/parser/TerraformParser.js.
     */
    this.pluginData.components = [];
    this.pluginData.parseErrors = [];

    inputs.filter(({ content, path }) => {
      if (content && content.trim() !== '') {
        return true;
      }

      this.pluginData.emitEvent({
        parent: parentEventId,
        type: 'Parser',
        action: 'read',
        status: 'warning',
        files: [path],
        data: {
          code: 'no_content',
          global: false,
        },
      });

      return false;
    }).forEach((input) => {
      const id = this.pluginData.emitEvent({
        parent: parentEventId,
        type: 'Parser',
        action: 'read',
        status: 'running',
        files: [input.path],
        data: {
          global: false,
        },
      });
      const listener = new ElectrificatorListener(input, this.pluginData.definitions.components);
      const progress = {
        errors: [],
        warnings: [],
        imports: [],
        alreadyImported: [],
        root: [],
      };

      try {
        // TODO: interface taken from lidy-js, maybe use another one ?
        this.parseFile(
          input.content,
          listener,
          input.path,
          progress,
        );
      } catch (e) {
        console.log('Error during parsing. Progress:', progress);
        console.log(e);
      }
      listener.components.forEach((component) => this.pluginData.components.push(component));
      this.pluginData.emitEvent({ id, status: 'success' });
    });

    this.pluginData.variables = this.getIndependentVariables();
  }

  /**
   * Return the lost of the plugin fixed variables.
   * Currently used for ArangoDB collections names.
   * TODO: Update if necessary once variables are editable in the UI.
   * @returns {Variable[]} A list of fixed variables.
   */
  getIndependentVariables() {
    return [
      new Variable({
        name: 'objectsCollection',
        value: 'objects',
        type: 'String',
        category: 'ArangoDBCollection',
      }),
      new Variable({
        name: 'connectionEdgesCollection',
        value: 'connectionEdges',
        type: 'String',
        category: 'ArangoDBCollection',
      }),
      new Variable({
        name: 'parentEdgesCollection',
        value: 'parentEdges',
        type: 'String',
        category: 'ArangoDBCollection',
      }),
    ];
  }

  /**
   * Parse a file.
   * @param {string} srcData The source data to parse.
   * @param {ElectrificatorListener} listener The listener to use.
   * @param {string} path The path of the file.
   * @param {object} prog The progress object.
   */
  parseFile(srcData, listener, path, prog) {
    const data = JSON.parse(srcData);

    if (Array.isArray(data)) {
      Object.values(data).forEach((value) => {
        this.parseObject(value, listener, path, prog);
      });
    } else {
      this.parseObject(data, listener, path, prog);
    }
  }

  /**
   * Parse an object.
   * @param {object} srcObject The source object to parse.
   * @param {ElectrificatorListener} listener The listener to use.
   * @param {string} path The path of the file.
   * @param {object} prog The progress object.
   */
  parseObject(srcObject, listener, path, prog) {
    if (!srcObject.type) {
      prog.warnings.push({
        code: 'no_type',
        message: 'No type found',
      });
      return;
    }
    const context = {
      current: srcObject,
      progress: prog,
    };

    switch (srcObject.type) {
      case 'container':
        listener.enter_Container(context);
        srcObject.objects?.forEach((value) => {
          this.parseObject(value, listener, path, prog);
        });
        srcObject.interfaces?.forEach((value) => {
          this.parseObject(value, listener, path, prog);
        });
        srcObject.links?.forEach((value) => {
          this.parseObject(value, listener, path, prog);
        });
        listener.exit_Container(context);
        break;
      case 'genericDipole':
        listener.enter_genericDipole(context);
        listener.exit_genericDipole(context);
        break;
      case 'electricalInterface':
        listener.enter_electricalInterface(context);
        listener.exit_electricalInterface(context);
        break;
      case 'electricalLine':
        listener.enter_electricalLine(context);
        listener.exit_electricalLine(context);
        break;
      case 'controlInterface':
        listener.enter_controlInterface(context);
        listener.exit_controlInterface(context);
        break;
      case 'controlLine':
        listener.enter_controlLine(context);
        listener.exit_controlLine(context);
        break;
      case 'circuitBreaker':
        listener.enter_circuitBreaker(context);
        listener.exit_circuitBreaker(context);
        break;
      case 'externalDevice':
        listener.enter_externalDevice(context);
        listener.exit_externalDevice(context);
        break;
      case 'contactor':
        listener.enter_contactor(context);
        listener.exit_contactor(context);
        break;
      case 'switch':
        listener.enter_switch(context);
        listener.exit_switch(context);
        break;
      case 'energyMeter':
        listener.enter_energyMeter(context);
        listener.exit_energyMeter(context);
        break;
      case 'mxCoil':
        listener.enter_mxCoil(context);
        listener.exit_mxCoil(context);
        break;
      case 'securityKey':
        listener.enter_securityKey(context);
        listener.exit_securityKey(context);
        break;
      case 'transformer':
        listener.enter_transformer(context);
        listener.exit_transformer(context);
        break;
      case 'ground':
        listener.enter_ground(context);
        listener.exit_ground(context);
        break;
      case 'fuse':
        listener.enter_fuse(context);
        listener.exit_fuse(context);
        break;
      case 'switchDisconnector':
        listener.enter_switchDisconnector(context);
        listener.exit_switchDisconnector(context);
        break;
      case 'disconnector':
        listener.enter_disconnector(context);
        listener.exit_disconnector(context);
        break;
      case 'electricalSupply':
        listener.enter_electricalSupply(context);
        listener.exit_electricalSupply(context);
        break;
      case 'manualActuator':
        listener.enter_manualActuator(context);
        listener.exit_manualActuator(context);
        break;
      case 'kmCoil':
        listener.enter_kmCoil(context);
        listener.exit_kmCoil(context);
        break;
      case 'generalActuator':
        listener.enter_generalActuator(context);
        listener.exit_generalActuator(context);
        break;
      case 'sts':
        listener.enter_sts(context);
        listener.exit_sts(context);
        break;
      case 'junctionBox':
        listener.enter_junctionBox(context);
        listener.exit_junctionBox(context);
        break;
      default:
        break;
    }
  }
}

export { ElectrificatorParser };
