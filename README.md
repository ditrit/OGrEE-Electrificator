# electrificator-plugin

Plugin to draw and render Electrical schemas in [Leto-Modelizer](https://github.com/ditrit/Leto-Modelizer).

## Summary

This plugin is used to render electrical schemas in Leto-Modelizer.
Thanks to Leto-Modelizer, you can draw your electrical schemas and generate a textual representation of your electrical installation.
Any change in one representation is automatically reflected in the other.

The textual representation is a JSON file that represents the hierarchy of your electrical installation. (By default: ``schema.json``)

### ArangoDB

The plugin also provides a way to store the electrical schemas in an ArangoDB database.
It generates jsonl (json lines) files that can be imported in ArangoDB with the `arangoimport` command.

For now, we generate 3 files:
- 1 file that contains all the nodes of the electrical schemas (stored as documents).
- 1 file that contains all the physical connections of the electrical schemas (stored as edges).
- 1 file that contains all the relationships (parentHood) of the electrical schemas (stored as edges).

**N.B.** The files only reflect the content of the main json file. The changes are not bidirectional.

The import of the files in ArangoDB is done with the following commands:
```
arangoimport --file [file].jsonl --type jsonl --collection [collection] --create-collection true --progress true
```

## Install

To install the plugin, run in the Leto-Modelizer folder:
```
npm run plugin:install
```
Choose custom plugin and follow the instructions.
- plugin name: ``electrificator-plugin``
- plugin repository: ``https://github.com/ditrit/ogree-electrificator.git``

## Build

To build the plugin, run:
```
npm run build
```


## Development

### Commands
To enable hot-reload of the plugin in Leto-Modelizer, run:
```
npm run dev
```

### Setup

To easily setup the plugin in a way that Leto-Modelizer automatically loads any changes on the fly, do:

- Install the plugin in Leto-Modelizer with ``npm run plugin:install`` (see Install section)
- Clone the plugin in a lib/ folder (or any other name) of the local Leto-Modelizer project. It enables Quasar to see it and refresh automatically.
- Replace the plugin source in Leto-Modelizer's package.json with ``file:./lib/electrificator-plugin`` (instead of ``github:...``)
- Launch Quasar in Leto-Modelizer with Hot Module Reload (by default with ``npm run dev`` in the Leto-Modelizer folder)
- Launch the compilation of the plugin with ``npm run dev`` (in the plugin folder)

If done correctly, the plugin should be loaded in Leto-Modelizer and any change in the plugin should be automatically loaded in Leto-Modelizer.

**Note**: Everything in the ``public/`` folder will **NOT** be automatically loaded.
- You have to run `` npm run plugin:init`` in the Leto-Modelizer folder everytime you change a model or an image.
It will copy the content of the plugin ``public/`` folder in the Leto-Modelizer ``public/electrificator-plugin`` folder.

### Extend

To extend the plugin and add new components, you have to:

- Add a new component in the ``src/assets/metadata/components.json`` file. It will be used to define your ``Component`` and its ``ComponentAttribute``s.
- Define two function ``enter_[componentName]`` and ``exit_[componentName]`` in ``src/parser/ElectrificatorListener.js`` and set your parsing logic.
  - They will be used to parse your component from the json format into the Leto-Modelizer Components.
  - **N.B.**: Remember to register your functions in the ``parseObject`` method of the ``ElectrificatorParser`` class.
- Define a function ``render_[componentName]`` in ``src/renderer/ElectrificatorRenderer.js`` and set your rendering logic.
  - It will be used to render your component from the Leto-Modelizer Components format into the json format.
  - **N.B.**: Remember to register your function in the ``renderComponent`` method of the ``ElectrificatorRenderer`` class.
- If wanted, define a new model in the ``public/models`` folder and a new icon in the ``public/icons`` folder.
