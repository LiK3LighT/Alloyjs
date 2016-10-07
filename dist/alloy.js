(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Alloy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Component = require("./base/Component");

var _Component2 = _interopRequireDefault(_Component);

var _Attribute = require("./base/Attribute");

var _Attribute2 = _interopRequireDefault(_Attribute);

var _StringUtils = require("./utils/StringUtils");

var _StringUtils2 = _interopRequireDefault(_StringUtils);

var _NodeArray = require("./utils/NodeArray");

var _NodeArray2 = _interopRequireDefault(_NodeArray);

var _XHRProvider = require("./utils/data-providers/XHRProvider");

var _XHRProvider2 = _interopRequireDefault(_XHRProvider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let _isPrototypeOf = function (object, prototype) {
    if (object.__proto__ === prototype) {
        return true;
    } else if (object.__proto__ != null) {
        return _isPrototypeOf(object.__proto__, prototype);
    } else {
        return false;
    }
};

class Alloy {
    static register(component) {
        if (_isPrototypeOf(component, _Component2.default)) {
            let prototype = Object.create(HTMLElement.prototype);
            prototype.createdCallback = function () {
                this._component = new component(this);
            };
            prototype.detachedCallback = function () {
                if (this._component._destructor instanceof Function) {
                    this._component._destructor();
                }
            };
            prototype.attributeChangedCallback = function (name, oldValue, newValue) {
                if (this._component.attributeChanged instanceof Function) {
                    this._component.attributeChanged(name, oldValue, newValue);
                }
            };
            prototype.cloneNode = function () {
                return this._component.cloneNode(this.constructor);
            };

            let dashedName = _StringUtils2.default.toDashed(component.name);
            window[component.name] = document.registerElement(dashedName, { prototype: prototype });
            //Alloy._registeredComponents.add(dashedName);
        } else if (_isPrototypeOf(component, _Attribute2.default)) {
                Alloy._registeredAttributes.set(_StringUtils2.default.toDashed(component.name), component);
            }
    }

    static get(selector) {
        return document.querySelector(selector);
    }
}
//Alloy._registeredComponents = new Set();
Alloy._registeredAttributes = new Map();
Alloy.Component = _Component2.default;
Alloy.Attribute = _Attribute2.default;
Alloy.NodeArray = _NodeArray2.default;
Alloy.XHRProvider = _XHRProvider2.default;

exports.default = Alloy;
},{"./base/Attribute":2,"./base/Component":3,"./utils/NodeArray":4,"./utils/StringUtils":5,"./utils/data-providers/XHRProvider":7}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
//noinspection JSUnusedLocalSymbols
class Attribute {

    constructor(attributeNode) {
        this.component = attributeNode._alloyComponent;
        let variables = new Set();
        let variablesRegExp = /\s*this\.([a-zA-Z0-9_\$]+)\s*/g;
        let variableMatch;
        while (variableMatch = variablesRegExp.exec(attributeNode.value)) {
            variables.add(variableMatch[1]);
            this.component.addUpdateCallback(variableMatch[1], variableName => {
                this.update(variableName);
            });
        }
    }

    update() {}

}
exports.default = Attribute;
},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _XHRProvider = require("./../utils/data-providers/XHRProvider");

var _XHRProvider2 = _interopRequireDefault(_XHRProvider);

var _Alloy = require("../Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

var _NodeArray = require("./../utils/NodeArray");

var _NodeArray2 = _interopRequireDefault(_NodeArray);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const _triggerUpdateCallbacks = function (variableName) {
    if (this._variableUpdateCallbacks.has(variableName)) {
        let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
        for (let i = 0, length = updateCallbacks.length; i < length; i++) {
            updateCallbacks[i](variableName);
        }
    }
    _update.call(this, variableName);
    if (this.update instanceof Function) {
        this.update(variableName);
    }
};

const _buildSetterVariable = function (variableName) {
    if (this.hasOwnProperty(variableName)) return;

    this["__" + variableName] = this[variableName];
    Object.defineProperty(this, variableName, {
        get: () => {
            return this["__" + variableName];
        },
        set: newValue => {
            if (newValue.constructor === Object || newValue instanceof Array) {
                const proxyTemplate = {
                    get: (target, property) => {
                        return target[property];
                    },
                    set: (target, property, value) => {
                        if (value instanceof Object) {
                            value = new Proxy(value, proxyTemplate);
                        }
                        if (target[property] !== value) {
                            target[property] = value;
                            _triggerUpdateCallbacks.call(this, variableName);
                        }
                        return true;
                    }
                };
                newValue = new Proxy(newValue, proxyTemplate);
            }
            if (this["__" + variableName] !== newValue) {
                this["__" + variableName] = newValue;
                _triggerUpdateCallbacks.call(this, variableName);
            }
        }
    });
};

const evalMatchRegExp = /\${([^}]*)}/g;
const variablesRegExp = /\s*this\.([a-zA-Z0-9_$]+)\s*/g;
const _callForVariablesInText = function (text, callback) {
    let evalMatch;
    evalMatchRegExp.lastIndex = 0; // Reset the RegExp, better performance than recreating it every time
    while (evalMatch = evalMatchRegExp.exec(text)) {
        let variableMatch;
        variablesRegExp.lastIndex = 0; // Reset the RegExp, better performance than recreating it every time

        let variables = new Set();
        while (variableMatch = variablesRegExp.exec(evalMatch[1])) {
            variables.add(variableMatch[1]);
        }

        callback(variables);
    }
};

const _recurseTextNodes = function (startNode, callback) {
    if (startNode instanceof CharacterData && startNode.textContent !== "") {
        callback.call(this, startNode, startNode.textContent);
    }
    if (startNode.attributes !== undefined) {
        for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
            if (attributeNode.value != "") {
                callback.call(this, attributeNode, attributeNode.value);
            }
        }
    }

    let nodeList = startNode.childNodes;
    for (let i = 0, node; node = nodeList[i]; i++) {
        if (!(node instanceof CharacterData)) {
            continue;
        }
        _recurseTextNodes.call(this, node, callback);
    }
};

const _setupBindMapForNode = function (node, text) {
    let alreadyBoundForNode = new Set();
    _callForVariablesInText(text, variables => {
        for (let variableName of variables) {
            if (!alreadyBoundForNode.has(variableName)) {
                alreadyBoundForNode.add(variableName);
                if (!this._bindMap.has(variableName)) {
                    this._bindMap.set(variableName, []);
                }
                let bindAttributes = this._bindMap.get(variableName);
                bindAttributes.push([node, text, variables]);

                if (!this._bindMapIndex.has(node)) {
                    this._bindMapIndex.set(node, new Set());
                }
                let bindMapIndexEntries = this._bindMapIndex.get(node);
                bindMapIndexEntries.add(variableName);

                if (Object.getOwnPropertyDescriptor(this, variableName) === undefined || Object.getOwnPropertyDescriptor(this, variableName).set === undefined) {
                    _buildSetterVariable.call(this, variableName);
                }
            }
        }
    });
};

// TODO: Performance save evaluated function objects in the bind mapping and just call these instead of evaluating the functions with every update

const _evaluateAttributeHandlers = function (startNode) {
    // Creates instances of specific attribute classes into the attribute node itself.
    if (startNode.attributes !== undefined) {
        for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
            if (_Alloy2.default._registeredAttributes.has(attributeNode.name) && attributeNode._alloyAttribute === undefined) {
                attributeNode._alloyComponent = this;
                attributeNode._alloyAttribute = new (_Alloy2.default._registeredAttributes.get(attributeNode.name))(attributeNode);
            }
        }
    }
    let nodeList = startNode.childNodes;
    for (let i = 0, node; node = nodeList[i]; i++) {
        _evaluateAttributeHandlers.call(this, node);
    }
};

const _update = function (variableName) {
    if (!this._bindMap.has(variableName)) return;

    for (let value of this._bindMap.get(variableName)) {
        // Loop through all nodes in which the variable that triggered the update is used in
        let nodeToUpdate = value[0]; // The node in which the variable that triggered the update is in, the text can already be overritten by the evaluation of evalText
        let evalText = value[1]; // Could contain multiple variables, but always the variable that triggered the update which is variableName

        // Convert the nodeToUpdate to a non TextNode Node
        let htmlNodeToUpdate;
        if (nodeToUpdate instanceof CharacterData) {
            htmlNodeToUpdate = nodeToUpdate.parentElement;
        } else if (nodeToUpdate instanceof Attr) {
            htmlNodeToUpdate = nodeToUpdate.ownerElement;
        } else {
            htmlNodeToUpdate = nodeToUpdate;
        }

        if (htmlNodeToUpdate.parentElement === null) continue; // Skip nodes that are not added to the visible dom

        for (let variablesVariableName of value[2]) {
            if (this[variablesVariableName] instanceof _NodeArray2.default || this[variablesVariableName] instanceof HTMLElement) {
                evalText = evalText.replace(new RegExp("\\${\\s*this\\." + variablesVariableName + "\\s*}", "g"), ""); // Remove already as node identified and evaluated variables from evalText
                if (variableName === variablesVariableName) {
                    if (this[variablesVariableName] instanceof _NodeArray2.default) {
                        for (let i = 0, length = this[variablesVariableName].length; i < length; i++) {
                            let node = this[variablesVariableName][i];
                            htmlNodeToUpdate.appendChild(node);
                        }
                    } else {
                        htmlNodeToUpdate.appendChild(this[variablesVariableName]);
                    }
                }
            }
        }

        if (!(nodeToUpdate instanceof HTMLElement)) {
            let evaluated;
            try {
                let variableDeclarationString = "";
                for (let declaredVariableName in htmlNodeToUpdate._variables) {
                    // no need to check for hasOwnProperty, cause of Object.create(null)
                    //noinspection JSUnfilteredForInLoop
                    variableDeclarationString += "let " + declaredVariableName + "=" + JSON.stringify(htmlNodeToUpdate._variables[declaredVariableName]) + ";";
                }
                evaluated = eval(variableDeclarationString + "`" + evalText + "`");
            } catch (error) {
                console.error(error, evalText, "on node", nodeToUpdate);
            }
            if (nodeToUpdate instanceof CharacterData) {
                nodeToUpdate.textContent = evaluated;
            } else {
                nodeToUpdate.value = evaluated;
            }
        }
    }
};

const _isNodeChildOf = function (parent, child) {
    if (child.parentElement === parent) {
        return true;
    }
    if (child.parentElement === null || child.parentElement === document.body) {
        return false;
    }
    return _isNodeChildOf(parent, child.parentElement);
};

let _instances = new Map();

//noinspection JSUnusedLocalSymbols
class Component {

    //noinspection JSUnusedGlobalSymbols
    static getInstance(elementId) {
        return _instances.get(elementId);
    }

    constructor(rootNode, options) {
        this._rootNode = rootNode;
        options.templateMethod = options.templateMethod === undefined ? "auto" : options.templateMethod;

        new Promise((resolve, reject) => {
            if (options.templateMethod === "inline") {
                resolve(options.template);
            } else if (options.templateMethod === "children") {
                resolve();
            } else {
                _XHRProvider2.default.load(options.template, null, { cache: options.cache, version: options.version }).then(template => {
                    resolve(template);
                }).catch(error => {
                    reject(error);
                });
            }
        }).then(template => {
            if (template !== undefined) {
                this._transcludedChildren = document.createElement("div");
                while (this._rootNode.firstChild) {
                    this._transcludedChildren.appendChild(this._rootNode.firstChild);
                }
                this._transcludedChildren = new _NodeArray2.default(this._transcludedChildren.childNodes);
                this._rootNode.innerHTML += template;
            }

            this._variableUpdateCallbacks = new Map();
            this._bindMapIndex = new Map();
            this._bindMap = new Map();
            //this._bindMap = _buildBindMap.call(this, this._rootNode);
            //_evaluateAttributeHandlers.call(this, this._rootNode);
            this.updateBindings(this._rootNode);

            if (this.attached instanceof Function) {
                this.attached();
            }

            if (this._rootNode.attributes.id !== undefined) {
                _instances.set(this._rootNode.attributes.id.value, this);
            }
        }).catch(error => {
            if (error instanceof Error) {
                //noinspection JSUnresolvedVariable
                error = error.stack;
            }
            console.error("Failed to initialize component %o", this, error);
        });
    }

    _destructor() {
        //noinspection JSUnresolvedVariable
        if (this.destructor instanceof Function) {
            //noinspection JSUnresolvedFunction
            this.destructor();
        }

        if (this._rootNode.attributes.id !== undefined && _instances.has(this._rootNode.attributes.id.value)) {
            _instances.delete(this._rootNode.attributes.id.value);
        }
    }

    //noinspection JSUnusedGlobalSymbols
    getAttributes() {
        return this._rootNode.attributes;
    }

    //noinspection JSUnusedGlobalSymbols
    getAttributeValue(name) {
        return this._rootNode.attributes.getNamedItem(name).nodeValue;
    }

    getTranscludedChildren() {
        return this._transcludedChildren;
    }

    addUpdateCallback(variableName, callback) {
        if (!this._variableUpdateCallbacks.has(variableName)) {
            this._variableUpdateCallbacks.set(variableName, []);
        }
        let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
        updateCallbacks[updateCallbacks.length] = callback;

        _buildSetterVariable.call(this, variableName);
    }

    //noinspection JSUnusedGlobalSymbols
    removeUpdateCallback(variableName, callback) {
        let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
        updateCallbacks.splice(updateCallbacks.indexOf(callback), 1);
    }

    updateBindings(startNode) {
        _evaluateAttributeHandlers.call(this, startNode);

        if (this._bindMapIndex.has(startNode)) {
            // if node was already evaluated

            if (!_isNodeChildOf(this._rootNode, startNode)) {
                // If not a child of the component anymore, remove from bindMap
                let bindMapKeys = this._bindMapIndex.get(startNode);
                for (let bindMapKey of bindMapKeys) {
                    let bindMap = this._bindMap.get(bindMapKey);
                    for (let i = 0, length = bindMap.length; i < length; i++) {
                        if (bindMap[i][0] === startNode) {
                            bindMap.splice(i, 1);
                        }
                    }
                }
                this._bindMapIndex.delete(startNode);
            }
        } else if (_isNodeChildOf(this._rootNode, startNode)) {
            // If this node is not already bound
            _recurseTextNodes.call(this, startNode, (node, text) => {
                _setupBindMapForNode.call(this, node, text);
            });
        }

        let nodeList = startNode.childNodes;
        for (let i = 0, node; node = nodeList[i]; i++) {
            this.updateBindings(node);
        }
    }

    cloneNode(component) {
        let rootNode = document.createElement("div");
        let transcludedChildren = this.getTranscludedChildren();
        for (let child of transcludedChildren) {
            rootNode.appendChild(child.cloneNode(true));
        }

        let holderNode = document.createElement("div");
        holderNode.innerHTML = "<" + component.name + ">" + rootNode.innerHTML + "</" + component.name + ">";

        return holderNode.childNodes[0];
    }

}
exports.default = Component;
},{"../Alloy":1,"./../utils/NodeArray":4,"./../utils/data-providers/XHRProvider":7}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
//noinspection JSUnusedLocalSymbols
class NodeArray extends Array {
    constructor(nodeList) {
        super();
        if (nodeList instanceof NodeList || nodeList instanceof Array) {
            for (let i = 0, length = nodeList.length; i < length; i++) {
                this[i] = nodeList[i];
            }
        }
    }

    clone() {
        let newNodes = [];
        for (let node of this) {
            newNodes[newNodes.length] = node.cloneNode(true);
        }

        return new NodeArray(newNodes);
    }
}
exports.default = NodeArray;
},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
class StringUtils {

    static toDashed(source) {
        return source.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }

}
exports.default = StringUtils;
},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _IndexedDB = require("../indexed-db/IndexedDB");

var _IndexedDB2 = _interopRequireDefault(_IndexedDB);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Cache {
    static get(url, version) {
        version = version !== undefined ? version : 0;
        return new Promise((resolve, reject) => {
            if (Cache.memory[url]) {
                resolve(Cache.memory[url]);
                return;
            }

            Cache.indexedDB.get(url, { version: version }).then(data => {
                resolve(data.getValues().resource);
            }).catch(error => {
                if (error !== undefined) console.warn("Failed to retrieve resource from IndexedDB", error);

                reject(error);
            });
        });
    }

    static set(url, data, version) {
        version = version !== undefined ? version : 0;
        Cache.memory[url] = data;
        Cache.indexedDB.set(url, data, version);
    }
}
exports.default = Cache;
Cache.memory = {};
Cache.indexedDB = new _IndexedDB2.default("cache", 2, "resources", ["url", "resource", "version"]);
},{"../indexed-db/IndexedDB":8}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Cache = require("./Cache");

var _Cache2 = _interopRequireDefault(_Cache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_METHOD = "get";
const DEFAULT_MIME_TYPE = null; // Automatic
const DEFAULT_RESPONSE_TYPE = null; // Automatic
const DEFAULT_CACHE_STATE = false;

class XHRProvider {

    static post(url, data, options, onProgress) {
        if (options === undefined) options = {};
        options.method = "post";
        return this.load(url, data, options, onProgress);
    }

    static get(url, options, onProgress) {
        return this.load(url, null, options, onProgress);
    }

    // Overwrite this and call super.load() inside
    static load(url, data, options, onProgress) {
        return XHRProvider._load(url, data, options, onProgress);
    }

    static _load(url, data, options, onProgress) {
        return new Promise((resolve, reject) => {
            if (options === undefined) options = {};

            options.cache = options.cache !== undefined ? options.cache : DEFAULT_CACHE_STATE;
            if (options.cache === true) {
                _Cache2.default.get(url, options.version).then(resolve).catch(function () {
                    XHRProvider._doXHR(url, data, options, onProgress).then(resolve).catch(reject);
                });
            } else {
                XHRProvider._doXHR(url, data, options, onProgress).then(resolve).catch(reject);
            }
        });
    }

    static _doXHR(url, data, options, onProgress) {
        return new Promise((resolve, reject) => {
            let method = options.method || DEFAULT_METHOD;
            //noinspection JSUnresolvedVariable
            let mimeType = options.mimeType || DEFAULT_MIME_TYPE;
            let responseType = options.responseType || DEFAULT_RESPONSE_TYPE;

            let request = new XMLHttpRequest();
            if (mimeType) request.overrideMimeType(mimeType);
            if (responseType) request.responseType = responseType;
            request.open(method, url, true);

            if (onProgress) request.addEventListener("progress", onProgress, false);

            request.addEventListener("load", function () {
                if (this.status === 200) {
                    if (options.cache) {
                        _Cache2.default.set(url, this.response, options.version);
                    }
                    resolve(this.response);
                } else {
                    reject(this);
                }
            }, false);

            request.addEventListener("error", function () {
                reject(this);
            }, false);

            request.send(data);
        });
    }
}
exports.default = XHRProvider;
},{"./Cache":6}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _IndexedDBResult = require("./IndexedDBResult");

var _IndexedDBResult2 = _interopRequireDefault(_IndexedDBResult);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ACTIONS = {
    READONLY: "readonly",
    READWRITE: "readwrite"
};

class IndexedDB {
    constructor(databaseName, databaseVersion, storeName, structure) {
        this.databaseName = databaseName;
        this.databaseVersion = databaseVersion;
        this.storeName = storeName;
        this.storeKey = structure[0];

        this.structure = structure;
    }

    _init() {
        let scope = this;

        return new Promise((resolve, reject) => {

            new Promise((resolve, reject) => {
                let request = indexedDB.open(scope.databaseName, scope.databaseVersion);

                request.onupgradeneeded = function (event) {
                    // onSuccess is executed after onupgradeneeded DONT resolve here.
                    let database = event.currentTarget.result;
                    try {
                        database.deleteObjectStore(scope.storeName);
                    } catch (error) {}
                    database.createObjectStore(scope.storeName, { keyPath: scope.storeKey });
                };
                request.onsuccess = function () {
                    scope.database = this.result;
                    resolve();
                };
                request.onerror = function (event) {
                    if (!scope.triedDelete) {
                        console.log("Could not open indexedDB %s deleting exiting database and retrying...", scope.databaseName, event);
                        let request = indexedDB.deleteDatabase(scope.databaseName);
                        request.onsuccess = function () {
                            scope.triedDelete = true;
                            scope._init().then(resolve).catch(reject);
                        };
                        request.onerror = function () {
                            console.warn("Error while deleting indexedDB %s", scope.databaseName, event);
                            reject(event);
                        };
                        request.onblocked = function (event) {
                            console.warn("Couldn't delete indexedDB %s due to the operation being blocked", scope.databaseName, event);
                            reject(event);
                        };
                    } else {
                        console.warn("Could not open indexedDB %s", scope.databaseName, event);
                        reject(event);
                    }
                };
                request.onblocked = function (event) {
                    console.warn("Couldn't open indexedDB %s due to the operation being blocked", scope.databaseName, event);
                    reject(event);
                };
            }).then(data => {
                scope.initialized = true;
                resolve(data);
            }).catch(reject);
        });
    }

    __getStore(action) {
        let scope = this;

        let transaction = scope.database.transaction(scope.storeName, action);
        return transaction.objectStore(scope.storeName);
    }

    _getStore(action) {
        let scope = this;

        return new Promise((resolve, reject) => {
            if (scope.initialized) {
                resolve(scope.__getStore(action));
            } else {
                scope._init().then(() => {
                    resolve(scope.__getStore(action));
                }).catch(reject);
            }
        });
    }

    get(url, equals) {
        let scope = this;

        return new Promise(function (resolve, reject) {
            scope._getStore(ACTIONS.READONLY).then(store => {
                let request = store.get(url);
                request.onsuccess = function (event) {
                    let values = event.target.result;

                    if (values === undefined && equals !== undefined) {
                        reject();
                        return;
                    }

                    for (var key in equals) {
                        if (!equals.hasOwnProperty(key)) continue;

                        if (!values.hasOwnProperty(key) || values[key] !== equals[key]) {
                            reject();
                            return;
                        }
                    }

                    resolve(new _IndexedDBResult2.default(values));
                };
                request.onerror = reject;
            }).catch(reject);
        });
    }

    set(key, args) {
        let scope = this;

        let data = arguments;

        return new Promise((resolve, reject) => {
            let putData = {};
            for (var i = 0, length = scope.structure.length; i < length; i++) {
                putData[scope.structure[i]] = data[i];
            }

            scope._getStore(ACTIONS.READWRITE).then(store => {
                let request = store.put(putData);
                request.onsuccess = resolve;
                request.onerror = reject;
            }).catch(reject);
        });
    }

    remove(url) {
        let scope = this;

        return new Promise((resolve, reject) => {
            scope._getStore(ACTIONS.READWRITE).then(store => {
                let request = store.remove(url);
                request.onsuccess = resolve;
                request.onerror = reject;
            }).catch(reject);
        });
    }

    clear() {
        let scope = this;

        return new Promise((resolve, reject) => {
            scope._getStore(ACTIONS.READWRITE).then(store => {
                let request = store.clear();
                request.onsuccess = resolve;
                request.onerror = reject;
            }).catch(reject);
        });
    }
}
exports.default = IndexedDB;
},{"./IndexedDBResult":9}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
class IndexedDBResult {
    constructor(values) {
        this.values = values;
    }

    getValues() {
        return this.values;
    }
}
exports.default = IndexedDBResult;
},{}],10:[function(require,module,exports){
"use strict";

var _Alloy = require("../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_Alloy2.default.DataBinding = class DataBinding extends Object {

    constructor(dataProvider, path, dontCreate) {
        super();

        this._ = {};

        this._.dataProvider = dataProvider;
        this._.path = path;
        this._.intervalIndex = null;

        if (!dontCreate) {
            return Object.create(this);
        }
    }

    setPath(path) {
        this._.path = path;
    }

    getPath() {
        return this._.path;
    }

    setDataProvider(dataProvider) {
        this._.dataProvider = dataProvider;
    }

    getDataProvider() {
        return this._.dataProvider;
    }

    parseUpdate(result) {
        for (let key in result) {
            if (!result.hasOwnProperty(key)) continue;

            this[key] = result[key];
        }
    }

    baseUpdate() {
        let promise = this._.dataProvider.get(this._.path);
        promise.then(result => {
            this.parseUpdate(result);
        });
        return promise;
    }

    update() {
        return this.baseUpdate();
    }

    get() {
        return this.update();
    }

    setUpdateInterval(milliseconds) {
        this._.intervalIndex = setInterval(() => {
            this.update();
        }, milliseconds);
    }

    clearUpdateInterval() {
        clearInterval(this._.intervalIndex);
    }

};
},{"../../core/Alloy":1}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Alloy = require("../../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const _getScopeVariables = function (node) {
    if (node._variables) {
        return node._variables;
    } else if (node._component) {
        return null;
    }
    if (node.parentElement !== null) {
        return _getScopeVariables(node.parentElement);
    }
    return null;
};

class GenericEvent extends _Alloy2.default.Attribute {
    // TODO make this really generic... no .onclick stuff etc.

    constructor(attributeNode) {
        super(attributeNode);

        let component = this.component;

        let variables = _getScopeVariables(attributeNode.ownerElement);

        let originalFunction = attributeNode.ownerElement.onclick;

        let variableNames = ["event"];
        for (let declaredVariableName in variables) {
            // no need to check for hasOwnProperty, cause of Object.create(null)
            variableNames[variableNames.length] = declaredVariableName;
        }

        variableNames[variableNames.length] = "(" + originalFunction + ").call(this, event);"; // Add the actual function body to the function apply list

        let newFunction = Function.apply(null, variableNames);

        attributeNode.ownerElement.onclick = function (event) {
            let variableValues = [event];
            for (let declaredVariableName in variables) {
                // no need to check for hasOwnProperty, cause of Object.create(null)
                //noinspection JSUnfilteredForInLoop
                variableValues[variableValues.length] = variables[declaredVariableName];
            }

            newFunction.apply(component, variableValues);
        };
    }

}
exports.default = GenericEvent;
},{"../../../core/Alloy":1}],12:[function(require,module,exports){
"use strict";

var _Alloy = require("../../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

var _GenericEvent = require("./GenericEvent");

var _GenericEvent2 = _interopRequireDefault(_GenericEvent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Onclick extends _GenericEvent2.default {

    constructor(attributeNode) {
        super(attributeNode);
    }

}
_Alloy2.default.register(Onclick);
},{"../../../core/Alloy":1,"./GenericEvent":11}],13:[function(require,module,exports){
"use strict";

var _Alloy = require("../../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const FOR_TYPES = {
    OF: "of",
    IN: "in"
};

class For extends _Alloy2.default.Attribute {

    constructor(attributeNode) {
        super(attributeNode);

        this.multipliedNode = attributeNode.ownerElement;
        this.multipliedNode.attributes.removeNamedItem("for");
        this.parentNode = this.multipliedNode.parentNode;
        this.parentNode.removeChild(this.multipliedNode);

        this.component.updateBindings(this.multipliedNode);

        this.appendedChildren = new Map();

        this.forType = attributeNode.value.indexOf(" in ") !== -1 ? FOR_TYPES.IN : FOR_TYPES.OF;

        let parts = attributeNode.value.split(" " + this.forType + " ");
        this.toVariable = parts[0].substring(parts[0].indexOf(" ") + 1).trim();
        this.fromVariable = parts[1].substring(parts[1].indexOf(".") + 1).trim();
    }

    update() {
        let from = this.component[this.fromVariable];
        for (let key in from) {
            if (!from.hasOwnProperty(key)) continue;

            if (!this.appendedChildren.has(key)) {
                let newNode = this.multipliedNode.cloneNode(true);
                newNode._variables = Object.create(null);
                if (this.forType == FOR_TYPES.IN) {
                    newNode._variables[this.toVariable] = key;
                } else {
                    newNode._variables[this.toVariable] = from[key];
                }
                this.parentNode.appendChild(newNode);
                this.component.updateBindings(newNode);
                this.appendedChildren.set(key, newNode);
            }
        }
        for (let key of this.appendedChildren.keys()) {
            if (!from.hasOwnProperty(key)) {
                let nodeToRemove = this.appendedChildren.get(key);
                this.component.updateBindings(nodeToRemove);
                nodeToRemove.remove();
                this.appendedChildren.delete(key);
            }
        }
    }

}
_Alloy2.default.register(For);
},{"../../../core/Alloy":1}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const errorMessageLength = 50;

class JsonParseError extends Error {

    constructor(error, jsonString, ...data) {
        super();
        let errorPosition = error.message.split(" ");
        errorPosition = errorPosition[errorPosition.length - 1];
        this.message = error.message + " (" + jsonString.substr(Math.max(errorPosition - errorMessageLength / 2, 0), errorMessageLength).trim() + ") " + data.join(" ");
        this.stack = error.stack;
        this.name = error.name;
    }

}
exports.default = JsonParseError;
},{}],15:[function(require,module,exports){
"use strict";

var _Alloy = require("../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

var _JsonParseError = require("./JsonParseError");

var _JsonParseError2 = _interopRequireDefault(_JsonParseError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_Alloy2.default.JsonProvider = class JsonProvider extends _Alloy2.default.XHRProvider {

    static load(url, data, method, onProgress) {
        return new Promise((resolve, reject) => {
            super.load(url, data, { method: method, responseType: "text" }, onProgress).then(response => {
                try {
                    resolve(JSON.parse(response));
                } catch (jsonParseException) {
                    reject(new _JsonParseError2.default(jsonParseException, response, url));
                }
            }).catch(reject);
        });
    }

};
},{"../../core/Alloy":1,"./JsonParseError":14}],16:[function(require,module,exports){
"use strict";

var _Alloy = require("../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

var _RestResourceBase = require("./RestResourceBase");

var _RestResourceBase2 = _interopRequireDefault(_RestResourceBase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let recursiveSetNameAndParent = function (item, name) {
    if (item instanceof _RestResourceBase2.default) {
        item.setParent(this);
        item.setName(name);
    } else if (item instanceof Array) {
        for (let i = 0, length = item.length; i < length; i++) {
            recursiveSetNameAndParent.call(this, item[i], name + "/" + i);
        }
    } else if (item instanceof Object) {
        for (let key in item) {
            if (!item.hasOwnProperty(key)) continue;

            recursiveSetNameAndParent.call(this, item[key], name + "/" + key);
        }
    }
};

_Alloy2.default.RestResource = class RestResource extends _RestResourceBase2.default {

    constructor(structure, options) {
        super(options);

        let instance = Object.create(this);

        for (let key in structure) {
            if (!structure.hasOwnProperty(key)) continue;

            let item = structure[key];
            recursiveSetNameAndParent.call(this, item, key);
            instance[key] = item;
        }

        return instance;
    }

};
},{"../../core/Alloy":1,"./RestResourceBase":17}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Alloy = require("../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let updatePath = function () {
    let parent = this.getParent();
    let path = "/" + this.getName();
    if (parent !== null) {
        path = parent.getPath() + path;
    }
    this.setPath(path);
};

let deepClone = function (value) {
    if (value instanceof RestResourceBase) {
        value = value.clone();
    } else if (value instanceof Array) {
        for (let i = 0, length = value.length; i < length; i++) {
            value[i] = deepClone(value[i]);
        }
    } else if (value instanceof Object) {
        for (let key in value) {
            if (!value.hasOwnProperty(key)) continue;

            value[key] = deepClone(value[key]);
        }
    }
    return value;
};

class RestResourceBase extends _Alloy2.default.DataBinding {

    constructor(options) {
        let dataProvider;
        let onError;
        if (options instanceof Object) {
            dataProvider = options.dataProvider;
            onError = options.onError;
        }

        super(dataProvider, "", true);

        this._.onError = onError;

        this._.name = "";
        this._.parent = null;
    }

    getStructure() {
        // Yes there is no structure in the base class, it has to be implemented in the implementation classes this is needed for the clone method
        return this._.structure;
    }

    getOnError() {
        return this._.onError;
    }

    setOnError(onError) {
        this._.onError = onError;
    }

    getName() {
        return this._.name;
    }

    setName(name) {
        this._.name = name;

        updatePath.call(this);
    }

    getParent() {
        return this._.parent;
    }

    setParent(parent) {
        this._.parent = parent;

        this.setDataProvider(parent.getDataProvider());

        updatePath.call(this);
    }

    parseErrors(errors) {
        if (this._.onError instanceof Function) {
            this._.onError(errors); // Decide if onError is executed for every error in errors array / object
        }
    }

    parseData(data) {
        for (let key in data) {
            if (!data.hasOwnProperty(key)) continue;

            this[key] = data[key];
        }
    }

    parseUpdate(result) {
        if (result.data !== undefined) {
            this.parseData(result.data);
        }
        if (result.errors !== undefined) {
            this.parseErrors(result.errors);
        }
    }

    update() {
        return new Promise((resolve, reject) => {
            super.baseUpdate().then(() => {
                resolve(this);
            }).catch(error => {
                reject(error); // Evaluate if I handle errors here or not... e.g. check jsonapi.org if there is a standard... like only give 200 messages and stuff
            });
        });
    }

    clone() {
        let copy = new this.constructor(this.getStructure(), {
            dataProvider: this.getDataProvider(),
            onError: this.getOnError()
        });
        copy.setName(this.getName());

        for (let key in this) {
            if (!this.hasOwnProperty(key)) continue;

            copy[key] = deepClone(this[key]);
        }

        return copy;
    }

}
exports.default = RestResourceBase;
},{"../../core/Alloy":1}],18:[function(require,module,exports){
"use strict";

var _Alloy = require("../../core/Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

var _RestResourceBase = require("./RestResourceBase");

var _RestResourceBase2 = _interopRequireDefault(_RestResourceBase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let recursiveSetParent = function (item) {
    if (item instanceof _RestResourceBase2.default) {
        item.setParent(this);
    } else if (item instanceof Array) {
        for (let i = 0, length = item.length; i < length; i++) {
            recursiveSetParent.call(this, item[i]);
        }
    } else if (item instanceof Object) {
        for (let key in item) {
            if (!item.hasOwnProperty(key)) continue;

            recursiveSetParent.call(this, item[key]);
        }
    }
};

_Alloy2.default.RestResourceList = class RestResourceList extends _RestResourceBase2.default {

    constructor(structure, options) {
        super(options);

        this._.structure = structure;

        return Object.create(this);
    }

    parseData(data) {
        if (data instanceof Array) {
            for (let i = 0, index; (index = data[i]) !== undefined; i++) {
                this[index] = this.getStructure().clone();
                this[index].setParent(this);
                this[index].setName(index);

                for (let key in this[index]) {
                    if (!this[index].hasOwnProperty(key)) continue;

                    recursiveSetParent.call(this[index], this[index][key]);
                }
            }
        } else if (data instanceof Object) {
            for (let key in data) {
                if (!data.hasOwnProperty(key)) continue;

                recursiveSetParent.call(this, data[key]);
                this[key] = data[key];
            }
        }
    }

};
},{"../../core/Alloy":1,"./RestResourceBase":17}],19:[function(require,module,exports){
require("./plugins/default/events/Onclick.js");
require("./plugins/default/loops/For.js");
require("./plugins/data-binding/DataBinding.js");
require("./plugins/json-provider/JsonProvider.js");
require("./plugins/rest-binding/RestResource.js");
require("./plugins/rest-binding/RestResourceList.js");
module.exports = require("./core/Alloy").default;
},{"./core/Alloy":1,"./plugins/data-binding/DataBinding.js":10,"./plugins/default/events/Onclick.js":12,"./plugins/default/loops/For.js":13,"./plugins/json-provider/JsonProvider.js":15,"./plugins/rest-binding/RestResource.js":16,"./plugins/rest-binding/RestResourceList.js":18}]},{},[19])(19)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvY29yZS9BbGxveS5qcyIsImRpc3QvdGVtcC9jb3JlL2Jhc2UvQXR0cmlidXRlLmpzIiwiZGlzdC90ZW1wL2NvcmUvYmFzZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9Ob2RlQXJyYXkuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9TdHJpbmdVdGlscy5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2RhdGEtcHJvdmlkZXJzL0NhY2hlLmpzIiwiZGlzdC90ZW1wL2NvcmUvdXRpbHMvZGF0YS1wcm92aWRlcnMvWEhSUHJvdmlkZXIuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9pbmRleGVkLWRiL0luZGV4ZWREQi5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGF0YS1iaW5kaW5nL0RhdGFCaW5kaW5nLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvR2VuZXJpY0V2ZW50LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvT25jbGljay5qcyIsImRpc3QvdGVtcC9wbHVnaW5zL2RlZmF1bHQvbG9vcHMvRm9yLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvanNvbi1wcm92aWRlci9Kc29uUGFyc2VFcnJvci5qcyIsImRpc3QvdGVtcC9wbHVnaW5zL2pzb24tcHJvdmlkZXIvSnNvblByb3ZpZGVyLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZS5qcyIsImRpc3QvdGVtcC9wbHVnaW5zL3Jlc3QtYmluZGluZy9SZXN0UmVzb3VyY2VCYXNlLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZUxpc3QuanMiLCJkaXN0L3RlbXAvc3RhbmRhbG9uZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9Db21wb25lbnQgPSByZXF1aXJlKFwiLi9iYXNlL0NvbXBvbmVudFwiKTtcblxudmFyIF9Db21wb25lbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ29tcG9uZW50KTtcblxudmFyIF9BdHRyaWJ1dGUgPSByZXF1aXJlKFwiLi9iYXNlL0F0dHJpYnV0ZVwiKTtcblxudmFyIF9BdHRyaWJ1dGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQXR0cmlidXRlKTtcblxudmFyIF9TdHJpbmdVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzL1N0cmluZ1V0aWxzXCIpO1xuXG52YXIgX1N0cmluZ1V0aWxzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmluZ1V0aWxzKTtcblxudmFyIF9Ob2RlQXJyYXkgPSByZXF1aXJlKFwiLi91dGlscy9Ob2RlQXJyYXlcIik7XG5cbnZhciBfTm9kZUFycmF5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX05vZGVBcnJheSk7XG5cbnZhciBfWEhSUHJvdmlkZXIgPSByZXF1aXJlKFwiLi91dGlscy9kYXRhLXByb3ZpZGVycy9YSFJQcm92aWRlclwiKTtcblxudmFyIF9YSFJQcm92aWRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9YSFJQcm92aWRlcik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmxldCBfaXNQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3RvdHlwZSkge1xuICAgIGlmIChvYmplY3QuX19wcm90b19fID09PSBwcm90b3R5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChvYmplY3QuX19wcm90b19fICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIF9pc1Byb3RvdHlwZU9mKG9iamVjdC5fX3Byb3RvX18sIHByb3RvdHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmNsYXNzIEFsbG95IHtcbiAgICBzdGF0aWMgcmVnaXN0ZXIoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChfaXNQcm90b3R5cGVPZihjb21wb25lbnQsIF9Db21wb25lbnQyLmRlZmF1bHQpKSB7XG4gICAgICAgICAgICBsZXQgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuICAgICAgICAgICAgcHJvdG90eXBlLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQgPSBuZXcgY29tcG9uZW50KHRoaXMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHByb3RvdHlwZS5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb21wb25lbnQuX2Rlc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuX2Rlc3RydWN0b3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uIChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29tcG9uZW50LmF0dHJpYnV0ZUNoYW5nZWQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwcm90b3R5cGUuY2xvbmVOb2RlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb21wb25lbnQuY2xvbmVOb2RlKHRoaXMuY29uc3RydWN0b3IpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgbGV0IGRhc2hlZE5hbWUgPSBfU3RyaW5nVXRpbHMyLmRlZmF1bHQudG9EYXNoZWQoY29tcG9uZW50Lm5hbWUpO1xuICAgICAgICAgICAgd2luZG93W2NvbXBvbmVudC5uYW1lXSA9IGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChkYXNoZWROYW1lLCB7IHByb3RvdHlwZTogcHJvdG90eXBlIH0pO1xuICAgICAgICAgICAgLy9BbGxveS5fcmVnaXN0ZXJlZENvbXBvbmVudHMuYWRkKGRhc2hlZE5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKF9pc1Byb3RvdHlwZU9mKGNvbXBvbmVudCwgX0F0dHJpYnV0ZTIuZGVmYXVsdCkpIHtcbiAgICAgICAgICAgICAgICBBbGxveS5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMuc2V0KF9TdHJpbmdVdGlsczIuZGVmYXVsdC50b0Rhc2hlZChjb21wb25lbnQubmFtZSksIGNvbXBvbmVudCk7XG4gICAgICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGljIGdldChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfVxufVxuLy9BbGxveS5fcmVnaXN0ZXJlZENvbXBvbmVudHMgPSBuZXcgU2V0KCk7XG5BbGxveS5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMgPSBuZXcgTWFwKCk7XG5BbGxveS5Db21wb25lbnQgPSBfQ29tcG9uZW50Mi5kZWZhdWx0O1xuQWxsb3kuQXR0cmlidXRlID0gX0F0dHJpYnV0ZTIuZGVmYXVsdDtcbkFsbG95Lk5vZGVBcnJheSA9IF9Ob2RlQXJyYXkyLmRlZmF1bHQ7XG5BbGxveS5YSFJQcm92aWRlciA9IF9YSFJQcm92aWRlcjIuZGVmYXVsdDtcblxuZXhwb3J0cy5kZWZhdWx0ID0gQWxsb3k7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8vbm9pbnNwZWN0aW9uIEpTVW51c2VkTG9jYWxTeW1ib2xzXG5jbGFzcyBBdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50O1xuICAgICAgICBsZXQgdmFyaWFibGVzID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfXFwkXSspXFxzKi9nO1xuICAgICAgICBsZXQgdmFyaWFibGVNYXRjaDtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhhdHRyaWJ1dGVOb2RlLnZhbHVlKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJpYWJsZU1hdGNoWzFdKTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmFkZFVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTWF0Y2hbMV0sIHZhcmlhYmxlTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge31cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQXR0cmlidXRlOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfWEhSUHJvdmlkZXIgPSByZXF1aXJlKFwiLi8uLi91dGlscy9kYXRhLXByb3ZpZGVycy9YSFJQcm92aWRlclwiKTtcblxudmFyIF9YSFJQcm92aWRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9YSFJQcm92aWRlcik7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG52YXIgX05vZGVBcnJheSA9IHJlcXVpcmUoXCIuLy4uL3V0aWxzL05vZGVBcnJheVwiKTtcblxudmFyIF9Ob2RlQXJyYXkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTm9kZUFycmF5KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgX3RyaWdnZXJVcGRhdGVDYWxsYmFja3MgPSBmdW5jdGlvbiAodmFyaWFibGVOYW1lKSB7XG4gICAgaWYgKHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgIGxldCB1cGRhdGVDYWxsYmFja3MgPSB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHVwZGF0ZUNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdXBkYXRlQ2FsbGJhY2tzW2ldKHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX3VwZGF0ZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgaWYgKHRoaXMudXBkYXRlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICB9XG59O1xuXG5jb25zdCBfYnVpbGRTZXR0ZXJWYXJpYWJsZSA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eSh2YXJpYWJsZU5hbWUpKSByZXR1cm47XG5cbiAgICB0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV0gPSB0aGlzW3ZhcmlhYmxlTmFtZV07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHZhcmlhYmxlTmFtZSwge1xuICAgICAgICBnZXQ6ICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogbmV3VmFsdWUgPT4ge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlLmNvbnN0cnVjdG9yID09PSBPYmplY3QgfHwgbmV3VmFsdWUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3h5VGVtcGxhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogKHRhcmdldCwgcHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6ICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBuZXcgUHJveHkodmFsdWUsIHByb3h5VGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldFtwcm9wZXJ0eV0gIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZSA9IG5ldyBQcm94eShuZXdWYWx1ZSwgcHJveHlUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuY29uc3QgZXZhbE1hdGNoUmVnRXhwID0gL1xcJHsoW159XSopfS9nO1xuY29uc3QgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfJF0rKVxccyovZztcbmNvbnN0IF9jYWxsRm9yVmFyaWFibGVzSW5UZXh0ID0gZnVuY3Rpb24gKHRleHQsIGNhbGxiYWNrKSB7XG4gICAgbGV0IGV2YWxNYXRjaDtcbiAgICBldmFsTWF0Y2hSZWdFeHAubGFzdEluZGV4ID0gMDsgLy8gUmVzZXQgdGhlIFJlZ0V4cCwgYmV0dGVyIHBlcmZvcm1hbmNlIHRoYW4gcmVjcmVhdGluZyBpdCBldmVyeSB0aW1lXG4gICAgd2hpbGUgKGV2YWxNYXRjaCA9IGV2YWxNYXRjaFJlZ0V4cC5leGVjKHRleHQpKSB7XG4gICAgICAgIGxldCB2YXJpYWJsZU1hdGNoO1xuICAgICAgICB2YXJpYWJsZXNSZWdFeHAubGFzdEluZGV4ID0gMDsgLy8gUmVzZXQgdGhlIFJlZ0V4cCwgYmV0dGVyIHBlcmZvcm1hbmNlIHRoYW4gcmVjcmVhdGluZyBpdCBldmVyeSB0aW1lXG5cbiAgICAgICAgbGV0IHZhcmlhYmxlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhldmFsTWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuYWRkKHZhcmlhYmxlTWF0Y2hbMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2sodmFyaWFibGVzKTtcbiAgICB9XG59O1xuXG5jb25zdCBfcmVjdXJzZVRleHROb2RlcyA9IGZ1bmN0aW9uIChzdGFydE5vZGUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHN0YXJ0Tm9kZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEgJiYgc3RhcnROb2RlLnRleHRDb250ZW50ICE9PSBcIlwiKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgc3RhcnROb2RlLCBzdGFydE5vZGUudGV4dENvbnRlbnQpO1xuICAgIH1cbiAgICBpZiAoc3RhcnROb2RlLmF0dHJpYnV0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgYXR0cmlidXRlTm9kZTsgYXR0cmlidXRlTm9kZSA9IHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzW2pdOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVOb2RlLnZhbHVlICE9IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGF0dHJpYnV0ZU5vZGUsIGF0dHJpYnV0ZU5vZGUudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIG5vZGU7IG5vZGUgPSBub2RlTGlzdFtpXTsgaSsrKSB7XG4gICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgX3JlY3Vyc2VUZXh0Tm9kZXMuY2FsbCh0aGlzLCBub2RlLCBjYWxsYmFjayk7XG4gICAgfVxufTtcblxuY29uc3QgX3NldHVwQmluZE1hcEZvck5vZGUgPSBmdW5jdGlvbiAobm9kZSwgdGV4dCkge1xuICAgIGxldCBhbHJlYWR5Qm91bmRGb3JOb2RlID0gbmV3IFNldCgpO1xuICAgIF9jYWxsRm9yVmFyaWFibGVzSW5UZXh0KHRleHQsIHZhcmlhYmxlcyA9PiB7XG4gICAgICAgIGZvciAobGV0IHZhcmlhYmxlTmFtZSBvZiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgIGlmICghYWxyZWFkeUJvdW5kRm9yTm9kZS5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgIGFscmVhZHlCb3VuZEZvck5vZGUuYWRkKHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9iaW5kTWFwLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRNYXAuc2V0KHZhcmlhYmxlTmFtZSwgW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgYmluZEF0dHJpYnV0ZXMgPSB0aGlzLl9iaW5kTWFwLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGJpbmRBdHRyaWJ1dGVzLnB1c2goW25vZGUsIHRleHQsIHZhcmlhYmxlc10pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9iaW5kTWFwSW5kZXguaGFzKG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRNYXBJbmRleC5zZXQobm9kZSwgbmV3IFNldCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGJpbmRNYXBJbmRleEVudHJpZXMgPSB0aGlzLl9iaW5kTWFwSW5kZXguZ2V0KG5vZGUpO1xuICAgICAgICAgICAgICAgIGJpbmRNYXBJbmRleEVudHJpZXMuYWRkKHZhcmlhYmxlTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLCB2YXJpYWJsZU5hbWUpID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLCB2YXJpYWJsZU5hbWUpLnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIF9idWlsZFNldHRlclZhcmlhYmxlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIFRPRE86IFBlcmZvcm1hbmNlIHNhdmUgZXZhbHVhdGVkIGZ1bmN0aW9uIG9iamVjdHMgaW4gdGhlIGJpbmQgbWFwcGluZyBhbmQganVzdCBjYWxsIHRoZXNlIGluc3RlYWQgb2YgZXZhbHVhdGluZyB0aGUgZnVuY3Rpb25zIHdpdGggZXZlcnkgdXBkYXRlXG5cbmNvbnN0IF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSkge1xuICAgIC8vIENyZWF0ZXMgaW5zdGFuY2VzIG9mIHNwZWNpZmljIGF0dHJpYnV0ZSBjbGFzc2VzIGludG8gdGhlIGF0dHJpYnV0ZSBub2RlIGl0c2VsZi5cbiAgICBpZiAoc3RhcnROb2RlLmF0dHJpYnV0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgYXR0cmlidXRlTm9kZTsgYXR0cmlidXRlTm9kZSA9IHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzW2pdOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChfQWxsb3kyLmRlZmF1bHQuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLmhhcyhhdHRyaWJ1dGVOb2RlLm5hbWUpICYmIGF0dHJpYnV0ZU5vZGUuX2FsbG95QXR0cmlidXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVOb2RlLl9hbGxveUNvbXBvbmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgYXR0cmlidXRlTm9kZS5fYWxsb3lBdHRyaWJ1dGUgPSBuZXcgKF9BbGxveTIuZGVmYXVsdC5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMuZ2V0KGF0dHJpYnV0ZU5vZGUubmFtZSkpKGF0dHJpYnV0ZU5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBub2RlTGlzdCA9IHN0YXJ0Tm9kZS5jaGlsZE5vZGVzO1xuICAgIGZvciAobGV0IGkgPSAwLCBub2RlOyBub2RlID0gbm9kZUxpc3RbaV07IGkrKykge1xuICAgICAgICBfZXZhbHVhdGVBdHRyaWJ1dGVIYW5kbGVycy5jYWxsKHRoaXMsIG5vZGUpO1xuICAgIH1cbn07XG5cbmNvbnN0IF91cGRhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVOYW1lKSB7XG4gICAgaWYgKCF0aGlzLl9iaW5kTWFwLmhhcyh2YXJpYWJsZU5hbWUpKSByZXR1cm47XG5cbiAgICBmb3IgKGxldCB2YWx1ZSBvZiB0aGlzLl9iaW5kTWFwLmdldCh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgIC8vIExvb3AgdGhyb3VnaCBhbGwgbm9kZXMgaW4gd2hpY2ggdGhlIHZhcmlhYmxlIHRoYXQgdHJpZ2dlcmVkIHRoZSB1cGRhdGUgaXMgdXNlZCBpblxuICAgICAgICBsZXQgbm9kZVRvVXBkYXRlID0gdmFsdWVbMF07IC8vIFRoZSBub2RlIGluIHdoaWNoIHRoZSB2YXJpYWJsZSB0aGF0IHRyaWdnZXJlZCB0aGUgdXBkYXRlIGlzIGluLCB0aGUgdGV4dCBjYW4gYWxyZWFkeSBiZSBvdmVycml0dGVuIGJ5IHRoZSBldmFsdWF0aW9uIG9mIGV2YWxUZXh0XG4gICAgICAgIGxldCBldmFsVGV4dCA9IHZhbHVlWzFdOyAvLyBDb3VsZCBjb250YWluIG11bHRpcGxlIHZhcmlhYmxlcywgYnV0IGFsd2F5cyB0aGUgdmFyaWFibGUgdGhhdCB0cmlnZ2VyZWQgdGhlIHVwZGF0ZSB3aGljaCBpcyB2YXJpYWJsZU5hbWVcblxuICAgICAgICAvLyBDb252ZXJ0IHRoZSBub2RlVG9VcGRhdGUgdG8gYSBub24gVGV4dE5vZGUgTm9kZVxuICAgICAgICBsZXQgaHRtbE5vZGVUb1VwZGF0ZTtcbiAgICAgICAgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGUucGFyZW50RWxlbWVudDtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBBdHRyKSB7XG4gICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlID0gbm9kZVRvVXBkYXRlLm93bmVyRWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaHRtbE5vZGVUb1VwZGF0ZS5wYXJlbnRFbGVtZW50ID09PSBudWxsKSBjb250aW51ZTsgLy8gU2tpcCBub2RlcyB0aGF0IGFyZSBub3QgYWRkZWQgdG8gdGhlIHZpc2libGUgZG9tXG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFibGVzVmFyaWFibGVOYW1lIG9mIHZhbHVlWzJdKSB7XG4gICAgICAgICAgICBpZiAodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgX05vZGVBcnJheTIuZGVmYXVsdCB8fCB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGV2YWxUZXh0ID0gZXZhbFRleHQucmVwbGFjZShuZXcgUmVnRXhwKFwiXFxcXCR7XFxcXHMqdGhpc1xcXFwuXCIgKyB2YXJpYWJsZXNWYXJpYWJsZU5hbWUgKyBcIlxcXFxzKn1cIiwgXCJnXCIpLCBcIlwiKTsgLy8gUmVtb3ZlIGFscmVhZHkgYXMgbm9kZSBpZGVudGlmaWVkIGFuZCBldmFsdWF0ZWQgdmFyaWFibGVzIGZyb20gZXZhbFRleHRcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGVOYW1lID09PSB2YXJpYWJsZXNWYXJpYWJsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSBpbnN0YW5jZW9mIF9Ob2RlQXJyYXkyLmRlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0ubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbm9kZSA9IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZS5hcHBlbmRDaGlsZCh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKSB7XG4gICAgICAgICAgICBsZXQgZXZhbHVhdGVkO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgdmFyaWFibGVEZWNsYXJhdGlvblN0cmluZyA9IFwiXCI7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZGVjbGFyZWRWYXJpYWJsZU5hbWUgaW4gaHRtbE5vZGVUb1VwZGF0ZS5fdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gY2hlY2sgZm9yIGhhc093blByb3BlcnR5LCBjYXVzZSBvZiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5maWx0ZXJlZEZvckluTG9vcFxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nICs9IFwibGV0IFwiICsgZGVjbGFyZWRWYXJpYWJsZU5hbWUgKyBcIj1cIiArIEpTT04uc3RyaW5naWZ5KGh0bWxOb2RlVG9VcGRhdGUuX3ZhcmlhYmxlc1tkZWNsYXJlZFZhcmlhYmxlTmFtZV0pICsgXCI7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV2YWx1YXRlZCA9IGV2YWwodmFyaWFibGVEZWNsYXJhdGlvblN0cmluZyArIFwiYFwiICsgZXZhbFRleHQgKyBcImBcIik7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IsIGV2YWxUZXh0LCBcIm9uIG5vZGVcIiwgbm9kZVRvVXBkYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhKSB7XG4gICAgICAgICAgICAgICAgbm9kZVRvVXBkYXRlLnRleHRDb250ZW50ID0gZXZhbHVhdGVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlVG9VcGRhdGUudmFsdWUgPSBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5jb25zdCBfaXNOb2RlQ2hpbGRPZiA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkKSB7XG4gICAgaWYgKGNoaWxkLnBhcmVudEVsZW1lbnQgPT09IHBhcmVudCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGNoaWxkLnBhcmVudEVsZW1lbnQgPT09IG51bGwgfHwgY2hpbGQucGFyZW50RWxlbWVudCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBfaXNOb2RlQ2hpbGRPZihwYXJlbnQsIGNoaWxkLnBhcmVudEVsZW1lbnQpO1xufTtcblxubGV0IF9pbnN0YW5jZXMgPSBuZXcgTWFwKCk7XG5cbi8vbm9pbnNwZWN0aW9uIEpTVW51c2VkTG9jYWxTeW1ib2xzXG5jbGFzcyBDb21wb25lbnQge1xuXG4gICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRHbG9iYWxTeW1ib2xzXG4gICAgc3RhdGljIGdldEluc3RhbmNlKGVsZW1lbnRJZCkge1xuICAgICAgICByZXR1cm4gX2luc3RhbmNlcy5nZXQoZWxlbWVudElkKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3Rvcihyb290Tm9kZSwgb3B0aW9ucykge1xuICAgICAgICB0aGlzLl9yb290Tm9kZSA9IHJvb3ROb2RlO1xuICAgICAgICBvcHRpb25zLnRlbXBsYXRlTWV0aG9kID0gb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9PT0gdW5kZWZpbmVkID8gXCJhdXRvXCIgOiBvcHRpb25zLnRlbXBsYXRlTWV0aG9kO1xuXG4gICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSBcImlubGluZVwiKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShvcHRpb25zLnRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9PT0gXCJjaGlsZHJlblwiKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfWEhSUHJvdmlkZXIyLmRlZmF1bHQubG9hZChvcHRpb25zLnRlbXBsYXRlLCBudWxsLCB7IGNhY2hlOiBvcHRpb25zLmNhY2hlLCB2ZXJzaW9uOiBvcHRpb25zLnZlcnNpb24gfSkudGhlbih0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudGhlbih0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLl9yb290Tm9kZS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4uYXBwZW5kQ2hpbGQodGhpcy5fcm9vdE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4gPSBuZXcgX05vZGVBcnJheTIuZGVmYXVsdCh0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuLmNoaWxkTm9kZXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Jvb3ROb2RlLmlubmVySFRNTCArPSB0ZW1wbGF0ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICB0aGlzLl9iaW5kTWFwSW5kZXggPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICB0aGlzLl9iaW5kTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgLy90aGlzLl9iaW5kTWFwID0gX2J1aWxkQmluZE1hcC5jYWxsKHRoaXMsIHRoaXMuX3Jvb3ROb2RlKTtcbiAgICAgICAgICAgIC8vX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCB0aGlzLl9yb290Tm9kZSk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUJpbmRpbmdzKHRoaXMuX3Jvb3ROb2RlKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuYXR0YWNoZWQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoZWQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIF9pbnN0YW5jZXMuc2V0KHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQudmFsdWUsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci5zdGFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBjb21wb25lbnQgJW9cIiwgdGhpcywgZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfZGVzdHJ1Y3RvcigpIHtcbiAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgaWYgKHRoaXMuZGVzdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRGdW5jdGlvblxuICAgICAgICAgICAgdGhpcy5kZXN0cnVjdG9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZCAhPT0gdW5kZWZpbmVkICYmIF9pbnN0YW5jZXMuaGFzKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQudmFsdWUpKSB7XG4gICAgICAgICAgICBfaW5zdGFuY2VzLmRlbGV0ZSh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkLnZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkR2xvYmFsU3ltYm9sc1xuICAgIGdldEF0dHJpYnV0ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzO1xuICAgIH1cblxuICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkR2xvYmFsU3ltYm9sc1xuICAgIGdldEF0dHJpYnV0ZVZhbHVlKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuZ2V0TmFtZWRJdGVtKG5hbWUpLm5vZGVWYWx1ZTtcbiAgICB9XG5cbiAgICBnZXRUcmFuc2NsdWRlZENoaWxkcmVuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbjtcbiAgICB9XG5cbiAgICBhZGRVcGRhdGVDYWxsYmFjayh2YXJpYWJsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLnNldCh2YXJpYWJsZU5hbWUsIFtdKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIHVwZGF0ZUNhbGxiYWNrc1t1cGRhdGVDYWxsYmFja3MubGVuZ3RoXSA9IGNhbGxiYWNrO1xuXG4gICAgICAgIF9idWlsZFNldHRlclZhcmlhYmxlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICB9XG5cbiAgICAvL25vaW5zcGVjdGlvbiBKU1VudXNlZEdsb2JhbFN5bWJvbHNcbiAgICByZW1vdmVVcGRhdGVDYWxsYmFjayh2YXJpYWJsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCB1cGRhdGVDYWxsYmFja3MgPSB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgdXBkYXRlQ2FsbGJhY2tzLnNwbGljZSh1cGRhdGVDYWxsYmFja3MuaW5kZXhPZihjYWxsYmFjayksIDEpO1xuICAgIH1cblxuICAgIHVwZGF0ZUJpbmRpbmdzKHN0YXJ0Tm9kZSkge1xuICAgICAgICBfZXZhbHVhdGVBdHRyaWJ1dGVIYW5kbGVycy5jYWxsKHRoaXMsIHN0YXJ0Tm9kZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2JpbmRNYXBJbmRleC5oYXMoc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgLy8gaWYgbm9kZSB3YXMgYWxyZWFkeSBldmFsdWF0ZWRcblxuICAgICAgICAgICAgaWYgKCFfaXNOb2RlQ2hpbGRPZih0aGlzLl9yb290Tm9kZSwgc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgICAgIC8vIElmIG5vdCBhIGNoaWxkIG9mIHRoZSBjb21wb25lbnQgYW55bW9yZSwgcmVtb3ZlIGZyb20gYmluZE1hcFxuICAgICAgICAgICAgICAgIGxldCBiaW5kTWFwS2V5cyA9IHRoaXMuX2JpbmRNYXBJbmRleC5nZXQoc3RhcnROb2RlKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBiaW5kTWFwS2V5IG9mIGJpbmRNYXBLZXlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBiaW5kTWFwID0gdGhpcy5fYmluZE1hcC5nZXQoYmluZE1hcEtleSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBiaW5kTWFwLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmluZE1hcFtpXVswXSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZE1hcC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4LmRlbGV0ZShzdGFydE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF9pc05vZGVDaGlsZE9mKHRoaXMuX3Jvb3ROb2RlLCBzdGFydE5vZGUpKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIG5vZGUgaXMgbm90IGFscmVhZHkgYm91bmRcbiAgICAgICAgICAgIF9yZWN1cnNlVGV4dE5vZGVzLmNhbGwodGhpcywgc3RhcnROb2RlLCAobm9kZSwgdGV4dCkgPT4ge1xuICAgICAgICAgICAgICAgIF9zZXR1cEJpbmRNYXBGb3JOb2RlLmNhbGwodGhpcywgbm9kZSwgdGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlTGlzdCA9IHN0YXJ0Tm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQmluZGluZ3Mobm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjbG9uZU5vZGUoY29tcG9uZW50KSB7XG4gICAgICAgIGxldCByb290Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGxldCB0cmFuc2NsdWRlZENoaWxkcmVuID0gdGhpcy5nZXRUcmFuc2NsdWRlZENoaWxkcmVuKCk7XG4gICAgICAgIGZvciAobGV0IGNoaWxkIG9mIHRyYW5zY2x1ZGVkQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgIHJvb3ROb2RlLmFwcGVuZENoaWxkKGNoaWxkLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaG9sZGVyTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGhvbGRlck5vZGUuaW5uZXJIVE1MID0gXCI8XCIgKyBjb21wb25lbnQubmFtZSArIFwiPlwiICsgcm9vdE5vZGUuaW5uZXJIVE1MICsgXCI8L1wiICsgY29tcG9uZW50Lm5hbWUgKyBcIj5cIjtcblxuICAgICAgICByZXR1cm4gaG9sZGVyTm9kZS5jaGlsZE5vZGVzWzBdO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ29tcG9uZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vL25vaW5zcGVjdGlvbiBKU1VudXNlZExvY2FsU3ltYm9sc1xuY2xhc3MgTm9kZUFycmF5IGV4dGVuZHMgQXJyYXkge1xuICAgIGNvbnN0cnVjdG9yKG5vZGVMaXN0KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmIChub2RlTGlzdCBpbnN0YW5jZW9mIE5vZGVMaXN0IHx8IG5vZGVMaXN0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBub2RlTGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbaV0gPSBub2RlTGlzdFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsb25lKCkge1xuICAgICAgICBsZXQgbmV3Tm9kZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiB0aGlzKSB7XG4gICAgICAgICAgICBuZXdOb2Rlc1tuZXdOb2Rlcy5sZW5ndGhdID0gbm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IE5vZGVBcnJheShuZXdOb2Rlcyk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFycmF5OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBTdHJpbmdVdGlscyB7XG5cbiAgICBzdGF0aWMgdG9EYXNoZWQoc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMS0kMlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gU3RyaW5nVXRpbHM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9JbmRleGVkREIgPSByZXF1aXJlKFwiLi4vaW5kZXhlZC1kYi9JbmRleGVkREJcIik7XG5cbnZhciBfSW5kZXhlZERCMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0luZGV4ZWREQik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNsYXNzIENhY2hlIHtcbiAgICBzdGF0aWMgZ2V0KHVybCwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkID8gdmVyc2lvbiA6IDA7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoQ2FjaGUubWVtb3J5W3VybF0pIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKENhY2hlLm1lbW9yeVt1cmxdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENhY2hlLmluZGV4ZWREQi5nZXQodXJsLCB7IHZlcnNpb246IHZlcnNpb24gfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEuZ2V0VmFsdWVzKCkucmVzb3VyY2UpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcmV0cmlldmUgcmVzb3VyY2UgZnJvbSBJbmRleGVkREJcIiwgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgc2V0KHVybCwgZGF0YSwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkID8gdmVyc2lvbiA6IDA7XG4gICAgICAgIENhY2hlLm1lbW9yeVt1cmxdID0gZGF0YTtcbiAgICAgICAgQ2FjaGUuaW5kZXhlZERCLnNldCh1cmwsIGRhdGEsIHZlcnNpb24pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IENhY2hlO1xuQ2FjaGUubWVtb3J5ID0ge307XG5DYWNoZS5pbmRleGVkREIgPSBuZXcgX0luZGV4ZWREQjIuZGVmYXVsdChcImNhY2hlXCIsIDIsIFwicmVzb3VyY2VzXCIsIFtcInVybFwiLCBcInJlc291cmNlXCIsIFwidmVyc2lvblwiXSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xuXG52YXIgX0NhY2hlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NhY2hlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgREVGQVVMVF9NRVRIT0QgPSBcImdldFwiO1xuY29uc3QgREVGQVVMVF9NSU1FX1RZUEUgPSBudWxsOyAvLyBBdXRvbWF0aWNcbmNvbnN0IERFRkFVTFRfUkVTUE9OU0VfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuY29uc3QgREVGQVVMVF9DQUNIRV9TVEFURSA9IGZhbHNlO1xuXG5jbGFzcyBYSFJQcm92aWRlciB7XG5cbiAgICBzdGF0aWMgcG9zdCh1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwicG9zdFwiO1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgc3RhdGljIGdldCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZCh1cmwsIG51bGwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIC8vIE92ZXJ3cml0ZSB0aGlzIGFuZCBjYWxsIHN1cGVyLmxvYWQoKSBpbnNpZGVcbiAgICBzdGF0aWMgbG9hZCh1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIFhIUlByb3ZpZGVyLl9sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICBvcHRpb25zLmNhY2hlID0gb3B0aW9ucy5jYWNoZSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jYWNoZSA6IERFRkFVTFRfQ0FDSEVfU1RBVEU7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF9DYWNoZTIuZGVmYXVsdC5nZXQodXJsLCBvcHRpb25zLnZlcnNpb24pLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBYSFJQcm92aWRlci5fZG9YSFIodXJsLCBkYXRhLCBvcHRpb25zLCBvblByb2dyZXNzKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFhIUlByb3ZpZGVyLl9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBvcHRpb25zLm1ldGhvZCB8fCBERUZBVUxUX01FVEhPRDtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgICAgICBsZXQgbWltZVR5cGUgPSBvcHRpb25zLm1pbWVUeXBlIHx8IERFRkFVTFRfTUlNRV9UWVBFO1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlVHlwZSA9IG9wdGlvbnMucmVzcG9uc2VUeXBlIHx8IERFRkFVTFRfUkVTUE9OU0VfVFlQRTtcblxuICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgIGlmIChtaW1lVHlwZSkgcmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKG1pbWVUeXBlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZVR5cGUpIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gcmVzcG9uc2VUeXBlO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcihcInByb2dyZXNzXCIsIG9uUHJvZ3Jlc3MsIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9DYWNoZTIuZGVmYXVsdC5zZXQodXJsLCB0aGlzLnJlc3BvbnNlLCBvcHRpb25zLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdCh0aGlzKTtcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBYSFJQcm92aWRlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdCA9IHJlcXVpcmUoXCIuL0luZGV4ZWREQlJlc3VsdFwiKTtcblxudmFyIF9JbmRleGVkREJSZXN1bHQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCUmVzdWx0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgQUNUSU9OUyA9IHtcbiAgICBSRUFET05MWTogXCJyZWFkb25seVwiLFxuICAgIFJFQURXUklURTogXCJyZWFkd3JpdGVcIlxufTtcblxuY2xhc3MgSW5kZXhlZERCIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZU5hbWUsIGRhdGFiYXNlVmVyc2lvbiwgc3RvcmVOYW1lLCBzdHJ1Y3R1cmUpIHtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZGF0YWJhc2VWZXJzaW9uID0gZGF0YWJhc2VWZXJzaW9uO1xuICAgICAgICB0aGlzLnN0b3JlTmFtZSA9IHN0b3JlTmFtZTtcbiAgICAgICAgdGhpcy5zdG9yZUtleSA9IHN0cnVjdHVyZVswXTtcblxuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHN0cnVjdHVyZTtcbiAgICB9XG5cbiAgICBfaW5pdCgpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIub3BlbihzY29wZS5kYXRhYmFzZU5hbWUsIHNjb3BlLmRhdGFiYXNlVmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBvblN1Y2Nlc3MgaXMgZXhlY3V0ZWQgYWZ0ZXIgb251cGdyYWRlbmVlZGVkIERPTlQgcmVzb2x2ZSBoZXJlLlxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YWJhc2UgPSBldmVudC5jdXJyZW50VGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmRlbGV0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICAgICAgICAgICAgICAgICAgICBkYXRhYmFzZS5jcmVhdGVPYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUsIHsga2V5UGF0aDogc2NvcGUuc3RvcmVLZXkgfSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZGF0YWJhc2UgPSB0aGlzLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHJpZWREZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IG9wZW4gaW5kZXhlZERCICVzIGRlbGV0aW5nIGV4aXRpbmcgZGF0YWJhc2UgYW5kIHJldHJ5aW5nLi4uXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2Uoc2NvcGUuZGF0YWJhc2VOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRyaWVkRGVsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXJyb3Igd2hpbGUgZGVsZXRpbmcgaW5kZXhlZERCICVzXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmJsb2NrZWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBkZWxldGUgaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBvcGVuIGluZGV4ZWREQiAlcyBkdWUgdG8gdGhlIG9wZXJhdGlvbiBiZWluZyBibG9ja2VkXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBzY29wZS5kYXRhYmFzZS50cmFuc2FjdGlvbihzY29wZS5zdG9yZU5hbWUsIGFjdGlvbik7XG4gICAgICAgIHJldHVybiB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUpO1xuICAgIH1cblxuICAgIF9nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShzY29wZS5fX2dldFN0b3JlKGFjdGlvbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0KHVybCwgZXF1YWxzKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURPTkxZKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBldmVudC50YXJnZXQucmVzdWx0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMgPT09IHVuZGVmaW5lZCAmJiBlcXVhbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXF1YWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVxdWFscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoa2V5KSB8fCB2YWx1ZXNba2V5XSAhPT0gZXF1YWxzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBfSW5kZXhlZERCUmVzdWx0Mi5kZWZhdWx0KHZhbHVlcykpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0KGtleSwgYXJncykge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCBkYXRhID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgcHV0RGF0YSA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IHNjb3BlLnN0cnVjdHVyZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHB1dERhdGFbc2NvcGUuc3RydWN0dXJlW2ldXSA9IGRhdGFbaV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURXUklURSkudGhlbihzdG9yZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5wdXQocHV0RGF0YSk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZSh1cmwpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLnJlbW92ZSh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEluZGV4ZWREQjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuY2xhc3MgSW5kZXhlZERCUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZXMpIHtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0VmFsdWVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXM7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSW5kZXhlZERCUmVzdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5fQWxsb3kyLmRlZmF1bHQuRGF0YUJpbmRpbmcgPSBjbGFzcyBEYXRhQmluZGluZyBleHRlbmRzIE9iamVjdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhUHJvdmlkZXIsIHBhdGgsIGRvbnRDcmVhdGUpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl8gPSB7fTtcblxuICAgICAgICB0aGlzLl8uZGF0YVByb3ZpZGVyID0gZGF0YVByb3ZpZGVyO1xuICAgICAgICB0aGlzLl8ucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMuXy5pbnRlcnZhbEluZGV4ID0gbnVsbDtcblxuICAgICAgICBpZiAoIWRvbnRDcmVhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0UGF0aChwYXRoKSB7XG4gICAgICAgIHRoaXMuXy5wYXRoID0gcGF0aDtcbiAgICB9XG5cbiAgICBnZXRQYXRoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLnBhdGg7XG4gICAgfVxuXG4gICAgc2V0RGF0YVByb3ZpZGVyKGRhdGFQcm92aWRlcikge1xuICAgICAgICB0aGlzLl8uZGF0YVByb3ZpZGVyID0gZGF0YVByb3ZpZGVyO1xuICAgIH1cblxuICAgIGdldERhdGFQcm92aWRlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5kYXRhUHJvdmlkZXI7XG4gICAgfVxuXG4gICAgcGFyc2VVcGRhdGUocmVzdWx0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0Lmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB0aGlzW2tleV0gPSByZXN1bHRba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGJhc2VVcGRhdGUoKSB7XG4gICAgICAgIGxldCBwcm9taXNlID0gdGhpcy5fLmRhdGFQcm92aWRlci5nZXQodGhpcy5fLnBhdGgpO1xuICAgICAgICBwcm9taXNlLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VVcGRhdGUocmVzdWx0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZVVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgc2V0VXBkYXRlSW50ZXJ2YWwobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgIHRoaXMuXy5pbnRlcnZhbEluZGV4ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgICAgfSwgbWlsbGlzZWNvbmRzKTtcbiAgICB9XG5cbiAgICBjbGVhclVwZGF0ZUludGVydmFsKCkge1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuXy5pbnRlcnZhbEluZGV4KTtcbiAgICB9XG5cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgX2dldFNjb3BlVmFyaWFibGVzID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5fdmFyaWFibGVzKSB7XG4gICAgICAgIHJldHVybiBub2RlLl92YXJpYWJsZXM7XG4gICAgfSBlbHNlIGlmIChub2RlLl9jb21wb25lbnQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChub2RlLnBhcmVudEVsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRTY29wZVZhcmlhYmxlcyhub2RlLnBhcmVudEVsZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbmNsYXNzIEdlbmVyaWNFdmVudCBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5BdHRyaWJ1dGUge1xuICAgIC8vIFRPRE8gbWFrZSB0aGlzIHJlYWxseSBnZW5lcmljLi4uIG5vIC5vbmNsaWNrIHN0dWZmIGV0Yy5cblxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZU5vZGUpIHtcbiAgICAgICAgc3VwZXIoYXR0cmlidXRlTm9kZSk7XG5cbiAgICAgICAgbGV0IGNvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50O1xuXG4gICAgICAgIGxldCB2YXJpYWJsZXMgPSBfZ2V0U2NvcGVWYXJpYWJsZXMoYXR0cmlidXRlTm9kZS5vd25lckVsZW1lbnQpO1xuXG4gICAgICAgIGxldCBvcmlnaW5hbEZ1bmN0aW9uID0gYXR0cmlidXRlTm9kZS5vd25lckVsZW1lbnQub25jbGljaztcblxuICAgICAgICBsZXQgdmFyaWFibGVOYW1lcyA9IFtcImV2ZW50XCJdO1xuICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gY2hlY2sgZm9yIGhhc093blByb3BlcnR5LCBjYXVzZSBvZiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgICAgICAgICB2YXJpYWJsZU5hbWVzW3ZhcmlhYmxlTmFtZXMubGVuZ3RoXSA9IGRlY2xhcmVkVmFyaWFibGVOYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyaWFibGVOYW1lc1t2YXJpYWJsZU5hbWVzLmxlbmd0aF0gPSBcIihcIiArIG9yaWdpbmFsRnVuY3Rpb24gKyBcIikuY2FsbCh0aGlzLCBldmVudCk7XCI7IC8vIEFkZCB0aGUgYWN0dWFsIGZ1bmN0aW9uIGJvZHkgdG8gdGhlIGZ1bmN0aW9uIGFwcGx5IGxpc3RcblxuICAgICAgICBsZXQgbmV3RnVuY3Rpb24gPSBGdW5jdGlvbi5hcHBseShudWxsLCB2YXJpYWJsZU5hbWVzKTtcblxuICAgICAgICBhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBsZXQgdmFyaWFibGVWYWx1ZXMgPSBbZXZlbnRdO1xuICAgICAgICAgICAgZm9yIChsZXQgZGVjbGFyZWRWYXJpYWJsZU5hbWUgaW4gdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VuZmlsdGVyZWRGb3JJbkxvb3BcbiAgICAgICAgICAgICAgICB2YXJpYWJsZVZhbHVlc1t2YXJpYWJsZVZhbHVlcy5sZW5ndGhdID0gdmFyaWFibGVzW2RlY2xhcmVkVmFyaWFibGVOYW1lXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV3RnVuY3Rpb24uYXBwbHkoY29tcG9uZW50LCB2YXJpYWJsZVZhbHVlcyk7XG4gICAgICAgIH07XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBHZW5lcmljRXZlbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfR2VuZXJpY0V2ZW50ID0gcmVxdWlyZShcIi4vR2VuZXJpY0V2ZW50XCIpO1xuXG52YXIgX0dlbmVyaWNFdmVudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9HZW5lcmljRXZlbnQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jbGFzcyBPbmNsaWNrIGV4dGVuZHMgX0dlbmVyaWNFdmVudDIuZGVmYXVsdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVOb2RlKSB7XG4gICAgICAgIHN1cGVyKGF0dHJpYnV0ZU5vZGUpO1xuICAgIH1cblxufVxuX0FsbG95Mi5kZWZhdWx0LnJlZ2lzdGVyKE9uY2xpY2spOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBGT1JfVFlQRVMgPSB7XG4gICAgT0Y6IFwib2ZcIixcbiAgICBJTjogXCJpblwiXG59O1xuXG5jbGFzcyBGb3IgZXh0ZW5kcyBfQWxsb3kyLmRlZmF1bHQuQXR0cmlidXRlIHtcblxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZU5vZGUpIHtcbiAgICAgICAgc3VwZXIoYXR0cmlidXRlTm9kZSk7XG5cbiAgICAgICAgdGhpcy5tdWx0aXBsaWVkTm9kZSA9IGF0dHJpYnV0ZU5vZGUub3duZXJFbGVtZW50O1xuICAgICAgICB0aGlzLm11bHRpcGxpZWROb2RlLmF0dHJpYnV0ZXMucmVtb3ZlTmFtZWRJdGVtKFwiZm9yXCIpO1xuICAgICAgICB0aGlzLnBhcmVudE5vZGUgPSB0aGlzLm11bHRpcGxpZWROb2RlLnBhcmVudE5vZGU7XG4gICAgICAgIHRoaXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm11bHRpcGxpZWROb2RlKTtcblxuICAgICAgICB0aGlzLmNvbXBvbmVudC51cGRhdGVCaW5kaW5ncyh0aGlzLm11bHRpcGxpZWROb2RlKTtcblxuICAgICAgICB0aGlzLmFwcGVuZGVkQ2hpbGRyZW4gPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgdGhpcy5mb3JUeXBlID0gYXR0cmlidXRlTm9kZS52YWx1ZS5pbmRleE9mKFwiIGluIFwiKSAhPT0gLTEgPyBGT1JfVFlQRVMuSU4gOiBGT1JfVFlQRVMuT0Y7XG5cbiAgICAgICAgbGV0IHBhcnRzID0gYXR0cmlidXRlTm9kZS52YWx1ZS5zcGxpdChcIiBcIiArIHRoaXMuZm9yVHlwZSArIFwiIFwiKTtcbiAgICAgICAgdGhpcy50b1ZhcmlhYmxlID0gcGFydHNbMF0uc3Vic3RyaW5nKHBhcnRzWzBdLmluZGV4T2YoXCIgXCIpICsgMSkudHJpbSgpO1xuICAgICAgICB0aGlzLmZyb21WYXJpYWJsZSA9IHBhcnRzWzFdLnN1YnN0cmluZyhwYXJ0c1sxXS5pbmRleE9mKFwiLlwiKSArIDEpLnRyaW0oKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIGxldCBmcm9tID0gdGhpcy5jb21wb25lbnRbdGhpcy5mcm9tVmFyaWFibGVdO1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gZnJvbSkge1xuICAgICAgICAgICAgaWYgKCFmcm9tLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXBwZW5kZWRDaGlsZHJlbi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGxldCBuZXdOb2RlID0gdGhpcy5tdWx0aXBsaWVkTm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZS5fdmFyaWFibGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mb3JUeXBlID09IEZPUl9UWVBFUy5JTikge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLl92YXJpYWJsZXNbdGhpcy50b1ZhcmlhYmxlXSA9IGtleTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLl92YXJpYWJsZXNbdGhpcy50b1ZhcmlhYmxlXSA9IGZyb21ba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LnVwZGF0ZUJpbmRpbmdzKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kZWRDaGlsZHJlbi5zZXQoa2V5LCBuZXdOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBrZXkgb2YgdGhpcy5hcHBlbmRlZENoaWxkcmVuLmtleXMoKSkge1xuICAgICAgICAgICAgaWYgKCFmcm9tLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBsZXQgbm9kZVRvUmVtb3ZlID0gdGhpcy5hcHBlbmRlZENoaWxkcmVuLmdldChrZXkpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LnVwZGF0ZUJpbmRpbmdzKG5vZGVUb1JlbW92ZSk7XG4gICAgICAgICAgICAgICAgbm9kZVRvUmVtb3ZlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kZWRDaGlsZHJlbi5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxufVxuX0FsbG95Mi5kZWZhdWx0LnJlZ2lzdGVyKEZvcik7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmNvbnN0IGVycm9yTWVzc2FnZUxlbmd0aCA9IDUwO1xuXG5jbGFzcyBKc29uUGFyc2VFcnJvciBleHRlbmRzIEVycm9yIHtcblxuICAgIGNvbnN0cnVjdG9yKGVycm9yLCBqc29uU3RyaW5nLCAuLi5kYXRhKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGxldCBlcnJvclBvc2l0aW9uID0gZXJyb3IubWVzc2FnZS5zcGxpdChcIiBcIik7XG4gICAgICAgIGVycm9yUG9zaXRpb24gPSBlcnJvclBvc2l0aW9uW2Vycm9yUG9zaXRpb24ubGVuZ3RoIC0gMV07XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgKyBcIiAoXCIgKyBqc29uU3RyaW5nLnN1YnN0cihNYXRoLm1heChlcnJvclBvc2l0aW9uIC0gZXJyb3JNZXNzYWdlTGVuZ3RoIC8gMiwgMCksIGVycm9yTWVzc2FnZUxlbmd0aCkudHJpbSgpICsgXCIpIFwiICsgZGF0YS5qb2luKFwiIFwiKTtcbiAgICAgICAgdGhpcy5zdGFjayA9IGVycm9yLnN0YWNrO1xuICAgICAgICB0aGlzLm5hbWUgPSBlcnJvci5uYW1lO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSnNvblBhcnNlRXJyb3I7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfSnNvblBhcnNlRXJyb3IgPSByZXF1aXJlKFwiLi9Kc29uUGFyc2VFcnJvclwiKTtcblxudmFyIF9Kc29uUGFyc2VFcnJvcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Kc29uUGFyc2VFcnJvcik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbl9BbGxveTIuZGVmYXVsdC5Kc29uUHJvdmlkZXIgPSBjbGFzcyBKc29uUHJvdmlkZXIgZXh0ZW5kcyBfQWxsb3kyLmRlZmF1bHQuWEhSUHJvdmlkZXIge1xuXG4gICAgc3RhdGljIGxvYWQodXJsLCBkYXRhLCBtZXRob2QsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHN1cGVyLmxvYWQodXJsLCBkYXRhLCB7IG1ldGhvZDogbWV0aG9kLCByZXNwb25zZVR5cGU6IFwidGV4dFwiIH0sIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGpzb25QYXJzZUV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IF9Kc29uUGFyc2VFcnJvcjIuZGVmYXVsdChqc29uUGFyc2VFeGNlcHRpb24sIHJlc3BvbnNlLCB1cmwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfUmVzdFJlc291cmNlQmFzZSA9IHJlcXVpcmUoXCIuL1Jlc3RSZXNvdXJjZUJhc2VcIik7XG5cbnZhciBfUmVzdFJlc291cmNlQmFzZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9SZXN0UmVzb3VyY2VCYXNlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IHJlY3Vyc2l2ZVNldE5hbWVBbmRQYXJlbnQgPSBmdW5jdGlvbiAoaXRlbSwgbmFtZSkge1xuICAgIGlmIChpdGVtIGluc3RhbmNlb2YgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQpIHtcbiAgICAgICAgaXRlbS5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgIGl0ZW0uc2V0TmFtZShuYW1lKTtcbiAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gaXRlbS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmVjdXJzaXZlU2V0TmFtZUFuZFBhcmVudC5jYWxsKHRoaXMsIGl0ZW1baV0sIG5hbWUgKyBcIi9cIiArIGkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBpdGVtKSB7XG4gICAgICAgICAgICBpZiAoIWl0ZW0uaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHJlY3Vyc2l2ZVNldE5hbWVBbmRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2tleV0sIG5hbWUgKyBcIi9cIiArIGtleSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5fQWxsb3kyLmRlZmF1bHQuUmVzdFJlc291cmNlID0gY2xhc3MgUmVzdFJlc291cmNlIGV4dGVuZHMgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQge1xuXG4gICAgY29uc3RydWN0b3Ioc3RydWN0dXJlLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cbiAgICAgICAgZm9yIChsZXQga2V5IGluIHN0cnVjdHVyZSkge1xuICAgICAgICAgICAgaWYgKCFzdHJ1Y3R1cmUuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIGxldCBpdGVtID0gc3RydWN0dXJlW2tleV07XG4gICAgICAgICAgICByZWN1cnNpdmVTZXROYW1lQW5kUGFyZW50LmNhbGwodGhpcywgaXRlbSwga2V5KTtcbiAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH1cblxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5sZXQgdXBkYXRlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgcGFyZW50ID0gdGhpcy5nZXRQYXJlbnQoKTtcbiAgICBsZXQgcGF0aCA9IFwiL1wiICsgdGhpcy5nZXROYW1lKCk7XG4gICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICBwYXRoID0gcGFyZW50LmdldFBhdGgoKSArIHBhdGg7XG4gICAgfVxuICAgIHRoaXMuc2V0UGF0aChwYXRoKTtcbn07XG5cbmxldCBkZWVwQ2xvbmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZXN0UmVzb3VyY2VCYXNlKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuY2xvbmUoKTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YWx1ZVtpXSA9IGRlZXBDbG9uZSh2YWx1ZVtpXSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgdmFsdWVba2V5XSA9IGRlZXBDbG9uZSh2YWx1ZVtrZXldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5jbGFzcyBSZXN0UmVzb3VyY2VCYXNlIGV4dGVuZHMgX0FsbG95Mi5kZWZhdWx0LkRhdGFCaW5kaW5nIHtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgbGV0IGRhdGFQcm92aWRlcjtcbiAgICAgICAgbGV0IG9uRXJyb3I7XG4gICAgICAgIGlmIChvcHRpb25zIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICBkYXRhUHJvdmlkZXIgPSBvcHRpb25zLmRhdGFQcm92aWRlcjtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvcHRpb25zLm9uRXJyb3I7XG4gICAgICAgIH1cblxuICAgICAgICBzdXBlcihkYXRhUHJvdmlkZXIsIFwiXCIsIHRydWUpO1xuXG4gICAgICAgIHRoaXMuXy5vbkVycm9yID0gb25FcnJvcjtcblxuICAgICAgICB0aGlzLl8ubmFtZSA9IFwiXCI7XG4gICAgICAgIHRoaXMuXy5wYXJlbnQgPSBudWxsO1xuICAgIH1cblxuICAgIGdldFN0cnVjdHVyZSgpIHtcbiAgICAgICAgLy8gWWVzIHRoZXJlIGlzIG5vIHN0cnVjdHVyZSBpbiB0aGUgYmFzZSBjbGFzcywgaXQgaGFzIHRvIGJlIGltcGxlbWVudGVkIGluIHRoZSBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzIHRoaXMgaXMgbmVlZGVkIGZvciB0aGUgY2xvbmUgbWV0aG9kXG4gICAgICAgIHJldHVybiB0aGlzLl8uc3RydWN0dXJlO1xuICAgIH1cblxuICAgIGdldE9uRXJyb3IoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ub25FcnJvcjtcbiAgICB9XG5cbiAgICBzZXRPbkVycm9yKG9uRXJyb3IpIHtcbiAgICAgICAgdGhpcy5fLm9uRXJyb3IgPSBvbkVycm9yO1xuICAgIH1cblxuICAgIGdldE5hbWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ubmFtZTtcbiAgICB9XG5cbiAgICBzZXROYW1lKG5hbWUpIHtcbiAgICAgICAgdGhpcy5fLm5hbWUgPSBuYW1lO1xuXG4gICAgICAgIHVwZGF0ZVBhdGguY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBnZXRQYXJlbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ucGFyZW50O1xuICAgIH1cblxuICAgIHNldFBhcmVudChwYXJlbnQpIHtcbiAgICAgICAgdGhpcy5fLnBhcmVudCA9IHBhcmVudDtcblxuICAgICAgICB0aGlzLnNldERhdGFQcm92aWRlcihwYXJlbnQuZ2V0RGF0YVByb3ZpZGVyKCkpO1xuXG4gICAgICAgIHVwZGF0ZVBhdGguY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBwYXJzZUVycm9ycyhlcnJvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuXy5vbkVycm9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIHRoaXMuXy5vbkVycm9yKGVycm9ycyk7IC8vIERlY2lkZSBpZiBvbkVycm9yIGlzIGV4ZWN1dGVkIGZvciBldmVyeSBlcnJvciBpbiBlcnJvcnMgYXJyYXkgLyBvYmplY3RcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBhcnNlRGF0YShkYXRhKSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoIWRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHRoaXNba2V5XSA9IGRhdGFba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBhcnNlVXBkYXRlKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wYXJzZURhdGEocmVzdWx0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuZXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VFcnJvcnMocmVzdWx0LmVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzdXBlci5iYXNlVXBkYXRlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpOyAvLyBFdmFsdWF0ZSBpZiBJIGhhbmRsZSBlcnJvcnMgaGVyZSBvciBub3QuLi4gZS5nLiBjaGVjayBqc29uYXBpLm9yZyBpZiB0aGVyZSBpcyBhIHN0YW5kYXJkLi4uIGxpa2Ugb25seSBnaXZlIDIwMCBtZXNzYWdlcyBhbmQgc3R1ZmZcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgbGV0IGNvcHkgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmdldFN0cnVjdHVyZSgpLCB7XG4gICAgICAgICAgICBkYXRhUHJvdmlkZXI6IHRoaXMuZ2V0RGF0YVByb3ZpZGVyKCksXG4gICAgICAgICAgICBvbkVycm9yOiB0aGlzLmdldE9uRXJyb3IoKVxuICAgICAgICB9KTtcbiAgICAgICAgY29weS5zZXROYW1lKHRoaXMuZ2V0TmFtZSgpKTtcblxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpcykge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjb3B5W2tleV0gPSBkZWVwQ2xvbmUodGhpc1trZXldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gUmVzdFJlc291cmNlQmFzZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxudmFyIF9SZXN0UmVzb3VyY2VCYXNlID0gcmVxdWlyZShcIi4vUmVzdFJlc291cmNlQmFzZVwiKTtcblxudmFyIF9SZXN0UmVzb3VyY2VCYXNlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1Jlc3RSZXNvdXJjZUJhc2UpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5sZXQgcmVjdXJzaXZlU2V0UGFyZW50ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIF9SZXN0UmVzb3VyY2VCYXNlMi5kZWZhdWx0KSB7XG4gICAgICAgIGl0ZW0uc2V0UGFyZW50KHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBpdGVtLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2ldKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgICAgaWYgKCFpdGVtLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuX0FsbG95Mi5kZWZhdWx0LlJlc3RSZXNvdXJjZUxpc3QgPSBjbGFzcyBSZXN0UmVzb3VyY2VMaXN0IGV4dGVuZHMgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQge1xuXG4gICAgY29uc3RydWN0b3Ioc3RydWN0dXJlLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIHRoaXMuXy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgfVxuXG4gICAgcGFyc2VEYXRhKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGluZGV4OyAoaW5kZXggPSBkYXRhW2ldKSAhPT0gdW5kZWZpbmVkOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW2luZGV4XSA9IHRoaXMuZ2V0U3RydWN0dXJlKCkuY2xvbmUoKTtcbiAgICAgICAgICAgICAgICB0aGlzW2luZGV4XS5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpc1tpbmRleF0uc2V0TmFtZShpbmRleCk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzW2luZGV4XS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzW2luZGV4XSwgdGhpc1tpbmRleF1ba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgcmVjdXJzaXZlU2V0UGFyZW50LmNhbGwodGhpcywgZGF0YVtrZXldKTtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBkYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn07IiwicmVxdWlyZShcIi4vcGx1Z2lucy9kZWZhdWx0L2V2ZW50cy9PbmNsaWNrLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL2RlZmF1bHQvbG9vcHMvRm9yLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL2RhdGEtYmluZGluZy9EYXRhQmluZGluZy5qc1wiKTtcclxucmVxdWlyZShcIi4vcGx1Z2lucy9qc29uLXByb3ZpZGVyL0pzb25Qcm92aWRlci5qc1wiKTtcclxucmVxdWlyZShcIi4vcGx1Z2lucy9yZXN0LWJpbmRpbmcvUmVzdFJlc291cmNlLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL3Jlc3QtYmluZGluZy9SZXN0UmVzb3VyY2VMaXN0LmpzXCIpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2NvcmUvQWxsb3lcIikuZGVmYXVsdDsiXX0=
