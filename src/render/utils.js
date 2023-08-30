/**
 * Used to convert Map to JSON. It adds a dataType field to the Map object to identify it.
 * Useful to copy objects that have Map fields.
 * @param {string} key The object key.
 * @param {any} value The object value.
 * @returns {any} The value.
 */
function replacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  }
  return value;
}

/**
 * Used to convert JSON-Converted Map (with replacer) to a Map object.
 * It checks if the dataType field is set to Map.
 * Useful to copy objects that have Map fields.
 * @param {string} key The key.
 * @param {any} value The value.
 * @returns {Map<string, object[]>|any} The revived value.
 */
function reviver(key, value) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

/**
 * Make a deep copy of an object.
 * Can handle:
 * - Plain object
 * - Map
 * @param {object} object The object to copy.
 * @returns {object} The copied object.
 */
function copyObject(object) {
  return JSON.parse(JSON.stringify(object, replacer), reviver);
}

export { copyObject };
