import { DefaultParser } from 'leto-modelizer-plugin-core';
import { ElectrificatorListener } from 'src/parser/ElectrificatorListener';

/**
 * Template of plugin parser.
 */
class ElectrificatorParser extends DefaultParser {
  isParsable(fileInformation) {
    /*
     * Implement this to indicate which fileInformation your provider can manage.
     *
     * You just have to return a Boolean to say if your parser can manage the file or not.
     *
     * By default, this function return false only on null/undefined fileInformation.
     */
    // return super.isParsable(fileInformation);
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
        console.log(progress);
        console.log(e);
      }
      listener.components.forEach((component) => this.pluginData.components.push(component));
      this.pluginData.emitEvent({ id, status: 'success' });
    });
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

    if (Object.prototype.toString.call(data) === '[object Array]') {
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
      default:
        break;
    }
  }
}

export { ElectrificatorParser };
