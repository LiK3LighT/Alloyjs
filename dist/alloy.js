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

const _setupMappingForNode = function (node, text, bindMap) {
    let evalMatchRegExp = /\${([^}]*)}/g;
    let alreadyBound = new Set();
    let evalMatch;
    let variables = new Set();
    while (evalMatch = evalMatchRegExp.exec(text)) {
        let variablesRegExp = /\s*this\.([a-zA-Z0-9_\$]+)\s*/g;
        let variableMatch;
        while (variableMatch = variablesRegExp.exec(evalMatch[1])) {
            variables.add(variableMatch[1]);
        }

        for (let variableName of variables) {
            if (!alreadyBound.has(variableName)) {
                alreadyBound.add(variableName);
                if (!bindMap.has(variableName)) {
                    bindMap.set(variableName, []);
                }
                let bindAttributes = bindMap.get(variableName);
                bindAttributes.push([node, text, variables]);

                if (Object.getOwnPropertyDescriptor(this, variableName) === undefined || Object.getOwnPropertyDescriptor(this, variableName).set === undefined) {
                    _buildSetterVariable.call(this, variableName);
                }
            }
        }
    }
};

const _buildBindMap = function (startNode) {
    let bindMap = new Map();

    if (startNode instanceof CharacterData && startNode.textContent !== "") {
        _setupMappingForNode.call(this, startNode, startNode.textContent, bindMap);
    }
    if (startNode.attributes !== undefined) {
        for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
            if (attributeNode.value != "") {
                _setupMappingForNode.call(this, attributeNode, attributeNode.value, bindMap);
            }
        }
    }

    let nodeList = startNode.childNodes;
    for (let i = 0, node; node = nodeList[i]; i++) {
        if (!(node instanceof CharacterData) && node._component !== undefined) {
            // TODO: Performance improvement: Somehow check if it's possible also to exclude future components...
            continue;
        }
        let newBindMap = _buildBindMap.call(this, node);
        for (let [key, value] of newBindMap.entries()) {
            //noinspection JSUnusedAssignment,SillyAssignmentJS
            key = key; // Just for the silly warnings...
            //noinspection JSUnusedAssignment,SillyAssignmentJS
            value = value; // Just for the silly warnings...

            if (!bindMap.has(key)) {
                bindMap.set(key, value);
            } else {
                let bindValues = bindMap.get(key);
                bindValues = bindValues.concat(value);
                bindMap.set(key, bindValues);
            }

            for (let j = 0, item; item = value[j]; j++) {
                if (!this._bindMapIndex.has(item[0])) {
                    this._bindMapIndex.set(item[0], new Set());
                }
                let entries = this._bindMapIndex.get(item[0]);
                entries.add(key);
            }
        }
    }

    return bindMap;
};

const _evaluateAttributeHandlers = function (startNode) {
    // Creates instances of specific attribute classes into the attribute node itself.
    if (startNode.attributes !== undefined) {
        for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
            if (_Alloy2.default._registeredAttributes.has(attributeNode.name)) {
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

const _isNodeChild = function (node) {
    if (node.parentElement === this._rootNode) {
        return true;
    }
    if (node.parentElement === null || node.parentElement === document.body) {
        return false;
    }
    return _isNodeChild.call(this, node.parentElement);
};

let _instances = new Map();

//noinspection JSUnusedLocalSymbols
class Component {

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
            this._bindMap = _buildBindMap.call(this, this._rootNode);
            //console.log(this._bindMap);
            _evaluateAttributeHandlers.call(this, this._rootNode);

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

    getAttributes() {
        return this._rootNode.attributes;
    }

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

    removeUpdateCallback(variableName, callback) {
        let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
        updateCallbacks.splice(updateCallbacks.indexOf(callback), 1);
    }

    updateBindings(startNode) {
        _evaluateAttributeHandlers.call(this, startNode);

        if (this._bindMapIndex.has(startNode)) {

            if (!_isNodeChild.call(this, startNode)) {
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
        } else if (_isNodeChild.call(this, startNode)) {
            let newBindMap = _buildBindMap.call(this, startNode);

            for (let [key, value] of newBindMap.entries()) {
                //noinspection JSUnusedAssignment,SillyAssignmentJS
                key = key; // Just for the silly warnings...
                //noinspection JSUnusedAssignment,SillyAssignmentJS
                value = value; // Just for the silly warnings...

                if (!this._bindMap.has(key)) {
                    this._bindMap.set(key, value);
                } else {
                    let oldBindValues = this._bindMap.get(key);
                    outerBindValueLoop: for (let j = 0, newBindValue; newBindValue = value[j]; j++) {
                        for (let i = 0, oldBindValue; oldBindValue = oldBindValues[i]; i++) {
                            if (oldBindValue === newBindValue) {
                                continue outerBindValueLoop;
                            }
                        }

                        oldBindValues[oldBindValues.length] = newBindValue;
                    }
                }
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvY29yZS9BbGxveS5qcyIsImRpc3QvdGVtcC9jb3JlL2Jhc2UvQXR0cmlidXRlLmpzIiwiZGlzdC90ZW1wL2NvcmUvYmFzZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9Ob2RlQXJyYXkuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9TdHJpbmdVdGlscy5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2RhdGEtcHJvdmlkZXJzL0NhY2hlLmpzIiwiZGlzdC90ZW1wL2NvcmUvdXRpbHMvZGF0YS1wcm92aWRlcnMvWEhSUHJvdmlkZXIuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9pbmRleGVkLWRiL0luZGV4ZWREQi5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGF0YS1iaW5kaW5nL0RhdGFCaW5kaW5nLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvR2VuZXJpY0V2ZW50LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvT25jbGljay5qcyIsImRpc3QvdGVtcC9wbHVnaW5zL2RlZmF1bHQvbG9vcHMvRm9yLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvanNvbi1wcm92aWRlci9Kc29uUGFyc2VFcnJvci5qcyIsImRpc3QvdGVtcC9wbHVnaW5zL2pzb24tcHJvdmlkZXIvSnNvblByb3ZpZGVyLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZS5qcyIsImRpc3QvdGVtcC9wbHVnaW5zL3Jlc3QtYmluZGluZy9SZXN0UmVzb3VyY2VCYXNlLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZUxpc3QuanMiLCJkaXN0L3RlbXAvc3RhbmRhbG9uZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0NvbXBvbmVudCA9IHJlcXVpcmUoXCIuL2Jhc2UvQ29tcG9uZW50XCIpO1xuXG52YXIgX0NvbXBvbmVudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Db21wb25lbnQpO1xuXG52YXIgX0F0dHJpYnV0ZSA9IHJlcXVpcmUoXCIuL2Jhc2UvQXR0cmlidXRlXCIpO1xuXG52YXIgX0F0dHJpYnV0ZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BdHRyaWJ1dGUpO1xuXG52YXIgX1N0cmluZ1V0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMvU3RyaW5nVXRpbHNcIik7XG5cbnZhciBfU3RyaW5nVXRpbHMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyaW5nVXRpbHMpO1xuXG52YXIgX05vZGVBcnJheSA9IHJlcXVpcmUoXCIuL3V0aWxzL05vZGVBcnJheVwiKTtcblxudmFyIF9Ob2RlQXJyYXkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTm9kZUFycmF5KTtcblxudmFyIF9YSFJQcm92aWRlciA9IHJlcXVpcmUoXCIuL3V0aWxzL2RhdGEtcHJvdmlkZXJzL1hIUlByb3ZpZGVyXCIpO1xuXG52YXIgX1hIUlByb3ZpZGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1hIUlByb3ZpZGVyKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IF9pc1Byb3RvdHlwZU9mID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvdG90eXBlKSB7XG4gICAgaWYgKG9iamVjdC5fX3Byb3RvX18gPT09IHByb3RvdHlwZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG9iamVjdC5fX3Byb3RvX18gIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gX2lzUHJvdG90eXBlT2Yob2JqZWN0Ll9fcHJvdG9fXywgcHJvdG90eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuY2xhc3MgQWxsb3kge1xuICAgIHN0YXRpYyByZWdpc3Rlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKF9pc1Byb3RvdHlwZU9mKGNvbXBvbmVudCwgX0NvbXBvbmVudDIuZGVmYXVsdCkpIHtcbiAgICAgICAgICAgIGxldCBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG4gICAgICAgICAgICBwcm90b3R5cGUuY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudCA9IG5ldyBjb21wb25lbnQodGhpcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmRldGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NvbXBvbmVudC5fZGVzdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudC5fZGVzdHJ1Y3RvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwcm90b3R5cGUuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrID0gZnVuY3Rpb24gKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudC5hdHRyaWJ1dGVDaGFuZ2VkKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHByb3RvdHlwZS5jbG9uZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudC5jbG9uZU5vZGUodGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBsZXQgZGFzaGVkTmFtZSA9IF9TdHJpbmdVdGlsczIuZGVmYXVsdC50b0Rhc2hlZChjb21wb25lbnQubmFtZSk7XG4gICAgICAgICAgICB3aW5kb3dbY29tcG9uZW50Lm5hbWVdID0gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KGRhc2hlZE5hbWUsIHsgcHJvdG90eXBlOiBwcm90b3R5cGUgfSk7XG4gICAgICAgICAgICAvL0FsbG95Ll9yZWdpc3RlcmVkQ29tcG9uZW50cy5hZGQoZGFzaGVkTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2lzUHJvdG90eXBlT2YoY29tcG9uZW50LCBfQXR0cmlidXRlMi5kZWZhdWx0KSkge1xuICAgICAgICAgICAgICAgIEFsbG95Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5zZXQoX1N0cmluZ1V0aWxzMi5kZWZhdWx0LnRvRGFzaGVkKGNvbXBvbmVudC5uYW1lKSwgY29tcG9uZW50KTtcbiAgICAgICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0aWMgZ2V0KHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9XG59XG4vL0FsbG95Ll9yZWdpc3RlcmVkQ29tcG9uZW50cyA9IG5ldyBTZXQoKTtcbkFsbG95Ll9yZWdpc3RlcmVkQXR0cmlidXRlcyA9IG5ldyBNYXAoKTtcbkFsbG95LkNvbXBvbmVudCA9IF9Db21wb25lbnQyLmRlZmF1bHQ7XG5BbGxveS5BdHRyaWJ1dGUgPSBfQXR0cmlidXRlMi5kZWZhdWx0O1xuQWxsb3kuTm9kZUFycmF5ID0gX05vZGVBcnJheTIuZGVmYXVsdDtcbkFsbG95LlhIUlByb3ZpZGVyID0gX1hIUlByb3ZpZGVyMi5kZWZhdWx0O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBBbGxveTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIEF0dHJpYnV0ZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVOb2RlKSB7XG4gICAgICAgIHRoaXMuY29tcG9uZW50ID0gYXR0cmlidXRlTm9kZS5fYWxsb3lDb21wb25lbnQ7XG4gICAgICAgIGxldCB2YXJpYWJsZXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIGxldCB2YXJpYWJsZXNSZWdFeHAgPSAvXFxzKnRoaXNcXC4oW2EtekEtWjAtOV9cXCRdKylcXHMqL2c7XG4gICAgICAgIGxldCB2YXJpYWJsZU1hdGNoO1xuICAgICAgICB3aGlsZSAodmFyaWFibGVNYXRjaCA9IHZhcmlhYmxlc1JlZ0V4cC5leGVjKGF0dHJpYnV0ZU5vZGUudmFsdWUpKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuYWRkKHZhcmlhYmxlTWF0Y2hbMV0pO1xuICAgICAgICAgICAgdGhpcy5jb21wb25lbnQuYWRkVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVNYXRjaFsxXSwgdmFyaWFibGVOYW1lID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7fVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBBdHRyaWJ1dGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9YSFJQcm92aWRlciA9IHJlcXVpcmUoXCIuLy4uL3V0aWxzL2RhdGEtcHJvdmlkZXJzL1hIUlByb3ZpZGVyXCIpO1xuXG52YXIgX1hIUlByb3ZpZGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1hIUlByb3ZpZGVyKTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfTm9kZUFycmF5ID0gcmVxdWlyZShcIi4vLi4vdXRpbHMvTm9kZUFycmF5XCIpO1xuXG52YXIgX05vZGVBcnJheTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Ob2RlQXJyYXkpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBfdHJpZ2dlclVwZGF0ZUNhbGxiYWNrcyA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAodGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1cGRhdGVDYWxsYmFja3NbaV0odmFyaWFibGVOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfdXBkYXRlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICBpZiAodGhpcy51cGRhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLnVwZGF0ZSh2YXJpYWJsZU5hbWUpO1xuICAgIH1cbn07XG5cbmNvbnN0IF9idWlsZFNldHRlclZhcmlhYmxlID0gZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KHZhcmlhYmxlTmFtZSkpIHJldHVybjtcblxuICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IHRoaXNbdmFyaWFibGVOYW1lXTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdmFyaWFibGVOYW1lLCB7XG4gICAgICAgIGdldDogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBuZXdWYWx1ZSA9PiB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUuY29uc3RydWN0b3IgPT09IE9iamVjdCB8fCBuZXdWYWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJveHlUZW1wbGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0OiAodGFyZ2V0LCBwcm9wZXJ0eSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogKHRhcmdldCwgcHJvcGVydHksIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG5ldyBQcm94eSh2YWx1ZSwgcHJveHlUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0W3Byb3BlcnR5XSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RyaWdnZXJVcGRhdGVDYWxsYmFja3MuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3IFByb3h5KG5ld1ZhbHVlLCBwcm94eVRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV0gIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgX3RyaWdnZXJVcGRhdGVDYWxsYmFja3MuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5jb25zdCBfc2V0dXBNYXBwaW5nRm9yTm9kZSA9IGZ1bmN0aW9uIChub2RlLCB0ZXh0LCBiaW5kTWFwKSB7XG4gICAgbGV0IGV2YWxNYXRjaFJlZ0V4cCA9IC9cXCR7KFtefV0qKX0vZztcbiAgICBsZXQgYWxyZWFkeUJvdW5kID0gbmV3IFNldCgpO1xuICAgIGxldCBldmFsTWF0Y2g7XG4gICAgbGV0IHZhcmlhYmxlcyA9IG5ldyBTZXQoKTtcbiAgICB3aGlsZSAoZXZhbE1hdGNoID0gZXZhbE1hdGNoUmVnRXhwLmV4ZWModGV4dCkpIHtcbiAgICAgICAgbGV0IHZhcmlhYmxlc1JlZ0V4cCA9IC9cXHMqdGhpc1xcLihbYS16QS1aMC05X1xcJF0rKVxccyovZztcbiAgICAgICAgbGV0IHZhcmlhYmxlTWF0Y2g7XG4gICAgICAgIHdoaWxlICh2YXJpYWJsZU1hdGNoID0gdmFyaWFibGVzUmVnRXhwLmV4ZWMoZXZhbE1hdGNoWzFdKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJpYWJsZU1hdGNoWzFdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IHZhcmlhYmxlTmFtZSBvZiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgIGlmICghYWxyZWFkeUJvdW5kLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgYWxyZWFkeUJvdW5kLmFkZCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGlmICghYmluZE1hcC5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBiaW5kTWFwLnNldCh2YXJpYWJsZU5hbWUsIFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGJpbmRBdHRyaWJ1dGVzID0gYmluZE1hcC5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICBiaW5kQXR0cmlidXRlcy5wdXNoKFtub2RlLCB0ZXh0LCB2YXJpYWJsZXNdKTtcblxuICAgICAgICAgICAgICAgIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMsIHZhcmlhYmxlTmFtZSkgPT09IHVuZGVmaW5lZCB8fCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMsIHZhcmlhYmxlTmFtZSkuc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgX2J1aWxkU2V0dGVyVmFyaWFibGUuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IF9idWlsZEJpbmRNYXAgPSBmdW5jdGlvbiAoc3RhcnROb2RlKSB7XG4gICAgbGV0IGJpbmRNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBpZiAoc3RhcnROb2RlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSAmJiBzdGFydE5vZGUudGV4dENvbnRlbnQgIT09IFwiXCIpIHtcbiAgICAgICAgX3NldHVwTWFwcGluZ0Zvck5vZGUuY2FsbCh0aGlzLCBzdGFydE5vZGUsIHN0YXJ0Tm9kZS50ZXh0Q29udGVudCwgYmluZE1hcCk7XG4gICAgfVxuICAgIGlmIChzdGFydE5vZGUuYXR0cmlidXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwLCBhdHRyaWJ1dGVOb2RlOyBhdHRyaWJ1dGVOb2RlID0gc3RhcnROb2RlLmF0dHJpYnV0ZXNbal07IGorKykge1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZU5vZGUudmFsdWUgIT0gXCJcIikge1xuICAgICAgICAgICAgICAgIF9zZXR1cE1hcHBpbmdGb3JOb2RlLmNhbGwodGhpcywgYXR0cmlidXRlTm9kZSwgYXR0cmlidXRlTm9kZS52YWx1ZSwgYmluZE1hcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgbm9kZUxpc3QgPSBzdGFydE5vZGUuY2hpbGROb2RlcztcbiAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpICYmIG5vZGUuX2NvbXBvbmVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBQZXJmb3JtYW5jZSBpbXByb3ZlbWVudDogU29tZWhvdyBjaGVjayBpZiBpdCdzIHBvc3NpYmxlIGFsc28gdG8gZXhjbHVkZSBmdXR1cmUgY29tcG9uZW50cy4uLlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG5ld0JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgbm9kZSk7XG4gICAgICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBuZXdCaW5kTWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICBrZXkgPSBrZXk7IC8vIEp1c3QgZm9yIHRoZSBzaWxseSB3YXJuaW5ncy4uLlxuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlOyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cblxuICAgICAgICAgICAgaWYgKCFiaW5kTWFwLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgYmluZE1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBiaW5kVmFsdWVzID0gYmluZE1hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBiaW5kVmFsdWVzID0gYmluZFZhbHVlcy5jb25jYXQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KGtleSwgYmluZFZhbHVlcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBpdGVtOyBpdGVtID0gdmFsdWVbal07IGorKykge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fYmluZE1hcEluZGV4LmhhcyhpdGVtWzBdKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwSW5kZXguc2V0KGl0ZW1bMF0sIG5ldyBTZXQoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBlbnRyaWVzID0gdGhpcy5fYmluZE1hcEluZGV4LmdldChpdGVtWzBdKTtcbiAgICAgICAgICAgICAgICBlbnRyaWVzLmFkZChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGJpbmRNYXA7XG59O1xuXG5jb25zdCBfZXZhbHVhdGVBdHRyaWJ1dGVIYW5kbGVycyA9IGZ1bmN0aW9uIChzdGFydE5vZGUpIHtcbiAgICAvLyBDcmVhdGVzIGluc3RhbmNlcyBvZiBzcGVjaWZpYyBhdHRyaWJ1dGUgY2xhc3NlcyBpbnRvIHRoZSBhdHRyaWJ1dGUgbm9kZSBpdHNlbGYuXG4gICAgaWYgKHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDAsIGF0dHJpYnV0ZU5vZGU7IGF0dHJpYnV0ZU5vZGUgPSBzdGFydE5vZGUuYXR0cmlidXRlc1tqXTsgaisrKSB7XG4gICAgICAgICAgICBpZiAoX0FsbG95Mi5kZWZhdWx0Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5oYXMoYXR0cmlidXRlTm9kZS5uYW1lKSkge1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVOb2RlLl9hbGxveUF0dHJpYnV0ZSA9IG5ldyAoX0FsbG95Mi5kZWZhdWx0Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5nZXQoYXR0cmlidXRlTm9kZS5uYW1lKSkoYXR0cmlidXRlTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIG5vZGU7IG5vZGUgPSBub2RlTGlzdFtpXTsgaSsrKSB7XG4gICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgbm9kZSk7XG4gICAgfVxufTtcblxuY29uc3QgX3VwZGF0ZSA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2JpbmRNYXAuaGFzKHZhcmlhYmxlTmFtZSkpIHJldHVybjtcblxuICAgIGZvciAobGV0IHZhbHVlIG9mIHRoaXMuX2JpbmRNYXAuZ2V0KHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBub2RlcyBpbiB3aGljaCB0aGUgdmFyaWFibGUgdGhhdCB0cmlnZ2VyZWQgdGhlIHVwZGF0ZSBpcyB1c2VkIGluXG4gICAgICAgIGxldCBub2RlVG9VcGRhdGUgPSB2YWx1ZVswXTsgLy8gVGhlIG5vZGUgaW4gd2hpY2ggdGhlIHZhcmlhYmxlIHRoYXQgdHJpZ2dlcmVkIHRoZSB1cGRhdGUgaXMgaW4sIHRoZSB0ZXh0IGNhbiBhbHJlYWR5IGJlIG92ZXJyaXR0ZW4gYnkgdGhlIGV2YWx1YXRpb24gb2YgZXZhbFRleHRcbiAgICAgICAgbGV0IGV2YWxUZXh0ID0gdmFsdWVbMV07IC8vIENvdWxkIGNvbnRhaW4gbXVsdGlwbGUgdmFyaWFibGVzLCBidXQgYWx3YXlzIHRoZSB2YXJpYWJsZSB0aGF0IHRyaWdnZXJlZCB0aGUgdXBkYXRlIHdoaWNoIGlzIHZhcmlhYmxlTmFtZVxuXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIG5vZGVUb1VwZGF0ZSB0byBhIG5vbiBUZXh0Tm9kZSBOb2RlXG4gICAgICAgIGxldCBodG1sTm9kZVRvVXBkYXRlO1xuICAgICAgICBpZiAobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSkge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZS5wYXJlbnRFbGVtZW50O1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIEF0dHIpIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGUub3duZXJFbGVtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChodG1sTm9kZVRvVXBkYXRlLnBhcmVudEVsZW1lbnQgPT09IG51bGwpIGNvbnRpbnVlOyAvLyBTa2lwIG5vZGVzIHRoYXQgYXJlIG5vdCBhZGRlZCB0byB0aGUgdmlzaWJsZSBkb21cblxuICAgICAgICBmb3IgKGxldCB2YXJpYWJsZXNWYXJpYWJsZU5hbWUgb2YgdmFsdWVbMl0pIHtcbiAgICAgICAgICAgIGlmICh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBfTm9kZUFycmF5Mi5kZWZhdWx0IHx8IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgZXZhbFRleHQgPSBldmFsVGV4dC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJcXFxcJHtcXFxccyp0aGlzXFxcXC5cIiArIHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSArIFwiXFxcXHMqfVwiLCBcImdcIiksIFwiXCIpOyAvLyBSZW1vdmUgYWxyZWFkeSBhcyBub2RlIGlkZW50aWZpZWQgYW5kIGV2YWx1YXRlZCB2YXJpYWJsZXMgZnJvbSBldmFsVGV4dFxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZU5hbWUgPT09IHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgX05vZGVBcnJheTIuZGVmYXVsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBub2RlID0gdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlLmFwcGVuZENoaWxkKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHtcbiAgICAgICAgICAgIGxldCBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCB2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nID0gXCJcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiBodG1sTm9kZVRvVXBkYXRlLl92YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbmZpbHRlcmVkRm9ySW5Mb29wXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlRGVjbGFyYXRpb25TdHJpbmcgKz0gXCJsZXQgXCIgKyBkZWNsYXJlZFZhcmlhYmxlTmFtZSArIFwiPVwiICsgSlNPTi5zdHJpbmdpZnkoaHRtbE5vZGVUb1VwZGF0ZS5fdmFyaWFibGVzW2RlY2xhcmVkVmFyaWFibGVOYW1lXSkgKyBcIjtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXZhbHVhdGVkID0gZXZhbCh2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nICsgXCJgXCIgKyBldmFsVGV4dCArIFwiYFwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvciwgZXZhbFRleHQsIFwib24gbm9kZVwiLCBub2RlVG9VcGRhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpIHtcbiAgICAgICAgICAgICAgICBub2RlVG9VcGRhdGUudGV4dENvbnRlbnQgPSBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVUb1VwZGF0ZS52YWx1ZSA9IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IF9pc05vZGVDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUucGFyZW50RWxlbWVudCA9PT0gdGhpcy5fcm9vdE5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChub2RlLnBhcmVudEVsZW1lbnQgPT09IG51bGwgfHwgbm9kZS5wYXJlbnRFbGVtZW50ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIF9pc05vZGVDaGlsZC5jYWxsKHRoaXMsIG5vZGUucGFyZW50RWxlbWVudCk7XG59O1xuXG5sZXQgX2luc3RhbmNlcyA9IG5ldyBNYXAoKTtcblxuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIENvbXBvbmVudCB7XG5cbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoZWxlbWVudElkKSB7XG4gICAgICAgIHJldHVybiBfaW5zdGFuY2VzLmdldChlbGVtZW50SWQpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHJvb3ROb2RlLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX3Jvb3ROb2RlID0gcm9vdE5vZGU7XG4gICAgICAgIG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPSBvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSB1bmRlZmluZWQgPyBcImF1dG9cIiA6IG9wdGlvbnMudGVtcGxhdGVNZXRob2Q7XG5cbiAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IFwiaW5saW5lXCIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSBcImNoaWxkcmVuXCIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9YSFJQcm92aWRlcjIuZGVmYXVsdC5sb2FkKG9wdGlvbnMudGVtcGxhdGUsIG51bGwsIHsgY2FjaGU6IG9wdGlvbnMuY2FjaGUsIHZlcnNpb246IG9wdGlvbnMudmVyc2lvbiB9KS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuX3Jvb3ROb2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbi5hcHBlbmRDaGlsZCh0aGlzLl9yb290Tm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IG5ldyBfTm9kZUFycmF5Mi5kZWZhdWx0KHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4uY2hpbGROb2Rlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcm9vdE5vZGUuaW5uZXJIVE1MICs9IHRlbXBsYXRlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRNYXBJbmRleCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLl9iaW5kTWFwKTtcbiAgICAgICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2hlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hlZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgX2luc3RhbmNlcy5zZXQodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLnN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIGNvbXBvbmVudCAlb1wiLCB0aGlzLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIF9kZXN0cnVjdG9yKCkge1xuICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICBpZiAodGhpcy5kZXN0cnVjdG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZEZ1bmN0aW9uXG4gICAgICAgICAgICB0aGlzLmRlc3RydWN0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkICE9PSB1bmRlZmluZWQgJiYgX2luc3RhbmNlcy5oYXModGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSkpIHtcbiAgICAgICAgICAgIF9pbnN0YW5jZXMuZGVsZXRlKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQudmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0QXR0cmlidXRlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXM7XG4gICAgfVxuXG4gICAgZ2V0QXR0cmlidXRlVmFsdWUobmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5nZXROYW1lZEl0ZW0obmFtZSkubm9kZVZhbHVlO1xuICAgIH1cblxuICAgIGdldFRyYW5zY2x1ZGVkQ2hpbGRyZW4oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuO1xuICAgIH1cblxuICAgIGFkZFVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3Muc2V0KHZhcmlhYmxlTmFtZSwgW10pO1xuICAgICAgICB9XG4gICAgICAgIGxldCB1cGRhdGVDYWxsYmFja3MgPSB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgdXBkYXRlQ2FsbGJhY2tzW3VwZGF0ZUNhbGxiYWNrcy5sZW5ndGhdID0gY2FsbGJhY2s7XG5cbiAgICAgICAgX2J1aWxkU2V0dGVyVmFyaWFibGUuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgIH1cblxuICAgIHJlbW92ZVVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICB1cGRhdGVDYWxsYmFja3Muc3BsaWNlKHVwZGF0ZUNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKSwgMSk7XG4gICAgfVxuXG4gICAgdXBkYXRlQmluZGluZ3Moc3RhcnROb2RlKSB7XG4gICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgc3RhcnROb2RlKTtcblxuICAgICAgICBpZiAodGhpcy5fYmluZE1hcEluZGV4LmhhcyhzdGFydE5vZGUpKSB7XG5cbiAgICAgICAgICAgIGlmICghX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgICAgIC8vIElmIG5vdCBhIGNoaWxkIG9mIHRoZSBjb21wb25lbnQgYW55bW9yZSwgcmVtb3ZlIGZyb20gYmluZE1hcFxuICAgICAgICAgICAgICAgIGxldCBiaW5kTWFwS2V5cyA9IHRoaXMuX2JpbmRNYXBJbmRleC5nZXQoc3RhcnROb2RlKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBiaW5kTWFwS2V5IG9mIGJpbmRNYXBLZXlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBiaW5kTWFwID0gdGhpcy5fYmluZE1hcC5nZXQoYmluZE1hcEtleSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBiaW5kTWFwLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmluZE1hcFtpXVswXSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZE1hcC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4LmRlbGV0ZShzdGFydE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF9pc05vZGVDaGlsZC5jYWxsKHRoaXMsIHN0YXJ0Tm9kZSkpIHtcbiAgICAgICAgICAgIGxldCBuZXdCaW5kTWFwID0gX2J1aWxkQmluZE1hcC5jYWxsKHRoaXMsIHN0YXJ0Tm9kZSk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBuZXdCaW5kTWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkQXNzaWdubWVudCxTaWxseUFzc2lnbm1lbnRKU1xuICAgICAgICAgICAgICAgIGtleSA9IGtleTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2JpbmRNYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZEJpbmRWYWx1ZXMgPSB0aGlzLl9iaW5kTWFwLmdldChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBvdXRlckJpbmRWYWx1ZUxvb3A6IGZvciAobGV0IGogPSAwLCBuZXdCaW5kVmFsdWU7IG5ld0JpbmRWYWx1ZSA9IHZhbHVlW2pdOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBvbGRCaW5kVmFsdWU7IG9sZEJpbmRWYWx1ZSA9IG9sZEJpbmRWYWx1ZXNbaV07IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbGRCaW5kVmFsdWUgPT09IG5ld0JpbmRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBvdXRlckJpbmRWYWx1ZUxvb3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRCaW5kVmFsdWVzW29sZEJpbmRWYWx1ZXMubGVuZ3RoXSA9IG5ld0JpbmRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlTGlzdCA9IHN0YXJ0Tm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQmluZGluZ3Mobm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjbG9uZU5vZGUoY29tcG9uZW50KSB7XG4gICAgICAgIGxldCByb290Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGxldCB0cmFuc2NsdWRlZENoaWxkcmVuID0gdGhpcy5nZXRUcmFuc2NsdWRlZENoaWxkcmVuKCk7XG4gICAgICAgIGZvciAobGV0IGNoaWxkIG9mIHRyYW5zY2x1ZGVkQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgIHJvb3ROb2RlLmFwcGVuZENoaWxkKGNoaWxkLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaG9sZGVyTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGhvbGRlck5vZGUuaW5uZXJIVE1MID0gXCI8XCIgKyBjb21wb25lbnQubmFtZSArIFwiPlwiICsgcm9vdE5vZGUuaW5uZXJIVE1MICsgXCI8L1wiICsgY29tcG9uZW50Lm5hbWUgKyBcIj5cIjtcblxuICAgICAgICByZXR1cm4gaG9sZGVyTm9kZS5jaGlsZE5vZGVzWzBdO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ29tcG9uZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vL25vaW5zcGVjdGlvbiBKU1VudXNlZExvY2FsU3ltYm9sc1xuY2xhc3MgTm9kZUFycmF5IGV4dGVuZHMgQXJyYXkge1xuICAgIGNvbnN0cnVjdG9yKG5vZGVMaXN0KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmIChub2RlTGlzdCBpbnN0YW5jZW9mIE5vZGVMaXN0IHx8IG5vZGVMaXN0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBub2RlTGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbaV0gPSBub2RlTGlzdFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsb25lKCkge1xuICAgICAgICBsZXQgbmV3Tm9kZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiB0aGlzKSB7XG4gICAgICAgICAgICBuZXdOb2Rlc1tuZXdOb2Rlcy5sZW5ndGhdID0gbm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IE5vZGVBcnJheShuZXdOb2Rlcyk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFycmF5OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBTdHJpbmdVdGlscyB7XG5cbiAgICBzdGF0aWMgdG9EYXNoZWQoc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMS0kMlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gU3RyaW5nVXRpbHM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9JbmRleGVkREIgPSByZXF1aXJlKFwiLi4vaW5kZXhlZC1kYi9JbmRleGVkREJcIik7XG5cbnZhciBfSW5kZXhlZERCMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0luZGV4ZWREQik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNsYXNzIENhY2hlIHtcbiAgICBzdGF0aWMgZ2V0KHVybCwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkID8gdmVyc2lvbiA6IDA7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoQ2FjaGUubWVtb3J5W3VybF0pIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKENhY2hlLm1lbW9yeVt1cmxdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENhY2hlLmluZGV4ZWREQi5nZXQodXJsLCB7IHZlcnNpb246IHZlcnNpb24gfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEuZ2V0VmFsdWVzKCkucmVzb3VyY2UpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcmV0cmlldmUgcmVzb3VyY2UgZnJvbSBJbmRleGVkREJcIiwgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgc2V0KHVybCwgZGF0YSwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkID8gdmVyc2lvbiA6IDA7XG4gICAgICAgIENhY2hlLm1lbW9yeVt1cmxdID0gZGF0YTtcbiAgICAgICAgQ2FjaGUuaW5kZXhlZERCLnNldCh1cmwsIGRhdGEsIHZlcnNpb24pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IENhY2hlO1xuQ2FjaGUubWVtb3J5ID0ge307XG5DYWNoZS5pbmRleGVkREIgPSBuZXcgX0luZGV4ZWREQjIuZGVmYXVsdChcImNhY2hlXCIsIDIsIFwicmVzb3VyY2VzXCIsIFtcInVybFwiLCBcInJlc291cmNlXCIsIFwidmVyc2lvblwiXSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xuXG52YXIgX0NhY2hlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NhY2hlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgREVGQVVMVF9NRVRIT0QgPSBcImdldFwiO1xuY29uc3QgREVGQVVMVF9NSU1FX1RZUEUgPSBudWxsOyAvLyBBdXRvbWF0aWNcbmNvbnN0IERFRkFVTFRfUkVTUE9OU0VfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuY29uc3QgREVGQVVMVF9DQUNIRV9TVEFURSA9IGZhbHNlO1xuXG5jbGFzcyBYSFJQcm92aWRlciB7XG5cbiAgICBzdGF0aWMgcG9zdCh1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwicG9zdFwiO1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgc3RhdGljIGdldCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZCh1cmwsIG51bGwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIC8vIE92ZXJ3cml0ZSB0aGlzIGFuZCBjYWxsIHN1cGVyLmxvYWQoKSBpbnNpZGVcbiAgICBzdGF0aWMgbG9hZCh1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIFhIUlByb3ZpZGVyLl9sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICBvcHRpb25zLmNhY2hlID0gb3B0aW9ucy5jYWNoZSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jYWNoZSA6IERFRkFVTFRfQ0FDSEVfU1RBVEU7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF9DYWNoZTIuZGVmYXVsdC5nZXQodXJsLCBvcHRpb25zLnZlcnNpb24pLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBYSFJQcm92aWRlci5fZG9YSFIodXJsLCBkYXRhLCBvcHRpb25zLCBvblByb2dyZXNzKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFhIUlByb3ZpZGVyLl9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBvcHRpb25zLm1ldGhvZCB8fCBERUZBVUxUX01FVEhPRDtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgICAgICBsZXQgbWltZVR5cGUgPSBvcHRpb25zLm1pbWVUeXBlIHx8IERFRkFVTFRfTUlNRV9UWVBFO1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlVHlwZSA9IG9wdGlvbnMucmVzcG9uc2VUeXBlIHx8IERFRkFVTFRfUkVTUE9OU0VfVFlQRTtcblxuICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgIGlmIChtaW1lVHlwZSkgcmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKG1pbWVUeXBlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZVR5cGUpIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gcmVzcG9uc2VUeXBlO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcihcInByb2dyZXNzXCIsIG9uUHJvZ3Jlc3MsIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9DYWNoZTIuZGVmYXVsdC5zZXQodXJsLCB0aGlzLnJlc3BvbnNlLCBvcHRpb25zLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdCh0aGlzKTtcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBYSFJQcm92aWRlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdCA9IHJlcXVpcmUoXCIuL0luZGV4ZWREQlJlc3VsdFwiKTtcblxudmFyIF9JbmRleGVkREJSZXN1bHQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCUmVzdWx0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgQUNUSU9OUyA9IHtcbiAgICBSRUFET05MWTogXCJyZWFkb25seVwiLFxuICAgIFJFQURXUklURTogXCJyZWFkd3JpdGVcIlxufTtcblxuY2xhc3MgSW5kZXhlZERCIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZU5hbWUsIGRhdGFiYXNlVmVyc2lvbiwgc3RvcmVOYW1lLCBzdHJ1Y3R1cmUpIHtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZGF0YWJhc2VWZXJzaW9uID0gZGF0YWJhc2VWZXJzaW9uO1xuICAgICAgICB0aGlzLnN0b3JlTmFtZSA9IHN0b3JlTmFtZTtcbiAgICAgICAgdGhpcy5zdG9yZUtleSA9IHN0cnVjdHVyZVswXTtcblxuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHN0cnVjdHVyZTtcbiAgICB9XG5cbiAgICBfaW5pdCgpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIub3BlbihzY29wZS5kYXRhYmFzZU5hbWUsIHNjb3BlLmRhdGFiYXNlVmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBvblN1Y2Nlc3MgaXMgZXhlY3V0ZWQgYWZ0ZXIgb251cGdyYWRlbmVlZGVkIERPTlQgcmVzb2x2ZSBoZXJlLlxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YWJhc2UgPSBldmVudC5jdXJyZW50VGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmRlbGV0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICAgICAgICAgICAgICAgICAgICBkYXRhYmFzZS5jcmVhdGVPYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUsIHsga2V5UGF0aDogc2NvcGUuc3RvcmVLZXkgfSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZGF0YWJhc2UgPSB0aGlzLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHJpZWREZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IG9wZW4gaW5kZXhlZERCICVzIGRlbGV0aW5nIGV4aXRpbmcgZGF0YWJhc2UgYW5kIHJldHJ5aW5nLi4uXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2Uoc2NvcGUuZGF0YWJhc2VOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRyaWVkRGVsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXJyb3Igd2hpbGUgZGVsZXRpbmcgaW5kZXhlZERCICVzXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmJsb2NrZWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBkZWxldGUgaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBvcGVuIGluZGV4ZWREQiAlcyBkdWUgdG8gdGhlIG9wZXJhdGlvbiBiZWluZyBibG9ja2VkXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBzY29wZS5kYXRhYmFzZS50cmFuc2FjdGlvbihzY29wZS5zdG9yZU5hbWUsIGFjdGlvbik7XG4gICAgICAgIHJldHVybiB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUpO1xuICAgIH1cblxuICAgIF9nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShzY29wZS5fX2dldFN0b3JlKGFjdGlvbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0KHVybCwgZXF1YWxzKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURPTkxZKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBldmVudC50YXJnZXQucmVzdWx0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMgPT09IHVuZGVmaW5lZCAmJiBlcXVhbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXF1YWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVxdWFscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoa2V5KSB8fCB2YWx1ZXNba2V5XSAhPT0gZXF1YWxzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBfSW5kZXhlZERCUmVzdWx0Mi5kZWZhdWx0KHZhbHVlcykpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0KGtleSwgYXJncykge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCBkYXRhID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgcHV0RGF0YSA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IHNjb3BlLnN0cnVjdHVyZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHB1dERhdGFbc2NvcGUuc3RydWN0dXJlW2ldXSA9IGRhdGFbaV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURXUklURSkudGhlbihzdG9yZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5wdXQocHV0RGF0YSk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZSh1cmwpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLnJlbW92ZSh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEluZGV4ZWREQjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuY2xhc3MgSW5kZXhlZERCUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZXMpIHtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0VmFsdWVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXM7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSW5kZXhlZERCUmVzdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5fQWxsb3kyLmRlZmF1bHQuRGF0YUJpbmRpbmcgPSBjbGFzcyBEYXRhQmluZGluZyBleHRlbmRzIE9iamVjdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhUHJvdmlkZXIsIHBhdGgsIGRvbnRDcmVhdGUpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl8gPSB7fTtcblxuICAgICAgICB0aGlzLl8uZGF0YVByb3ZpZGVyID0gZGF0YVByb3ZpZGVyO1xuICAgICAgICB0aGlzLl8ucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMuXy5pbnRlcnZhbEluZGV4ID0gbnVsbDtcblxuICAgICAgICBpZiAoIWRvbnRDcmVhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0UGF0aChwYXRoKSB7XG4gICAgICAgIHRoaXMuXy5wYXRoID0gcGF0aDtcbiAgICB9XG5cbiAgICBnZXRQYXRoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLnBhdGg7XG4gICAgfVxuXG4gICAgc2V0RGF0YVByb3ZpZGVyKGRhdGFQcm92aWRlcikge1xuICAgICAgICB0aGlzLl8uZGF0YVByb3ZpZGVyID0gZGF0YVByb3ZpZGVyO1xuICAgIH1cblxuICAgIGdldERhdGFQcm92aWRlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5kYXRhUHJvdmlkZXI7XG4gICAgfVxuXG4gICAgcGFyc2VVcGRhdGUocmVzdWx0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0Lmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB0aGlzW2tleV0gPSByZXN1bHRba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGJhc2VVcGRhdGUoKSB7XG4gICAgICAgIGxldCBwcm9taXNlID0gdGhpcy5fLmRhdGFQcm92aWRlci5nZXQodGhpcy5fLnBhdGgpO1xuICAgICAgICBwcm9taXNlLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VVcGRhdGUocmVzdWx0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZVVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgc2V0VXBkYXRlSW50ZXJ2YWwobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgIHRoaXMuXy5pbnRlcnZhbEluZGV4ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgICAgfSwgbWlsbGlzZWNvbmRzKTtcbiAgICB9XG5cbiAgICBjbGVhclVwZGF0ZUludGVydmFsKCkge1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuXy5pbnRlcnZhbEluZGV4KTtcbiAgICB9XG5cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgX2dldFNjb3BlVmFyaWFibGVzID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5fdmFyaWFibGVzKSB7XG4gICAgICAgIHJldHVybiBub2RlLl92YXJpYWJsZXM7XG4gICAgfSBlbHNlIGlmIChub2RlLl9jb21wb25lbnQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChub2RlLnBhcmVudEVsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRTY29wZVZhcmlhYmxlcyhub2RlLnBhcmVudEVsZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbmNsYXNzIEdlbmVyaWNFdmVudCBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5BdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICBzdXBlcihhdHRyaWJ1dGVOb2RlKTtcblxuICAgICAgICBsZXQgY29tcG9uZW50ID0gdGhpcy5jb21wb25lbnQ7XG5cbiAgICAgICAgbGV0IHZhcmlhYmxlcyA9IF9nZXRTY29wZVZhcmlhYmxlcyhhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudCk7XG5cbiAgICAgICAgbGV0IG9yaWdpbmFsRnVuY3Rpb24gPSBhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudC5vbmNsaWNrO1xuXG4gICAgICAgIGxldCB2YXJpYWJsZU5hbWVzID0gW1wiZXZlbnRcIl07XG4gICAgICAgIGZvciAobGV0IGRlY2xhcmVkVmFyaWFibGVOYW1lIGluIHZhcmlhYmxlcykge1xuICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgIHZhcmlhYmxlTmFtZXNbdmFyaWFibGVOYW1lcy5sZW5ndGhdID0gZGVjbGFyZWRWYXJpYWJsZU5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXJpYWJsZU5hbWVzW3ZhcmlhYmxlTmFtZXMubGVuZ3RoXSA9IFwiKFwiICsgb3JpZ2luYWxGdW5jdGlvbiArIFwiKS5jYWxsKHRoaXMsIGV2ZW50KTtcIjsgLy8gQWRkIHRoZSBhY3R1YWwgZnVuY3Rpb24gYm9keSB0byB0aGUgZnVuY3Rpb24gYXBwbHkgbGlzdFxuXG4gICAgICAgIGxldCBuZXdGdW5jdGlvbiA9IEZ1bmN0aW9uLmFwcGx5KG51bGwsIHZhcmlhYmxlTmFtZXMpO1xuXG4gICAgICAgIGF0dHJpYnV0ZU5vZGUub3duZXJFbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGxldCB2YXJpYWJsZVZhbHVlcyA9IFtldmVudF07XG4gICAgICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGNoZWNrIGZvciBoYXNPd25Qcm9wZXJ0eSwgY2F1c2Ugb2YgT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5maWx0ZXJlZEZvckluTG9vcFxuICAgICAgICAgICAgICAgIHZhcmlhYmxlVmFsdWVzW3ZhcmlhYmxlVmFsdWVzLmxlbmd0aF0gPSB2YXJpYWJsZXNbZGVjbGFyZWRWYXJpYWJsZU5hbWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXdGdW5jdGlvbi5hcHBseShjb21wb25lbnQsIHZhcmlhYmxlVmFsdWVzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEdlbmVyaWNFdmVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxudmFyIF9HZW5lcmljRXZlbnQgPSByZXF1aXJlKFwiLi9HZW5lcmljRXZlbnRcIik7XG5cbnZhciBfR2VuZXJpY0V2ZW50MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0dlbmVyaWNFdmVudCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNsYXNzIE9uY2xpY2sgZXh0ZW5kcyBfR2VuZXJpY0V2ZW50Mi5kZWZhdWx0IHtcblxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZU5vZGUpIHtcbiAgICAgICAgc3VwZXIoYXR0cmlidXRlTm9kZSk7XG4gICAgfVxuXG59XG5fQWxsb3kyLmRlZmF1bHQucmVnaXN0ZXIoT25jbGljayk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNvbnN0IEZPUl9UWVBFUyA9IHtcbiAgICBPRjogXCJvZlwiLFxuICAgIElOOiBcImluXCJcbn07XG5cbmNsYXNzIEZvciBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5BdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICBzdXBlcihhdHRyaWJ1dGVOb2RlKTtcblxuICAgICAgICB0aGlzLm11bHRpcGxpZWROb2RlID0gYXR0cmlidXRlTm9kZS5vd25lckVsZW1lbnQ7XG4gICAgICAgIHRoaXMubXVsdGlwbGllZE5vZGUuYXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW0oXCJmb3JcIik7XG4gICAgICAgIHRoaXMucGFyZW50Tm9kZSA9IHRoaXMubXVsdGlwbGllZE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgdGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubXVsdGlwbGllZE5vZGUpO1xuXG4gICAgICAgIHRoaXMuY29tcG9uZW50LnVwZGF0ZUJpbmRpbmdzKHRoaXMubXVsdGlwbGllZE5vZGUpO1xuXG4gICAgICAgIHRoaXMuYXBwZW5kZWRDaGlsZHJlbiA9IG5ldyBNYXAoKTtcblxuICAgICAgICB0aGlzLmZvclR5cGUgPSBhdHRyaWJ1dGVOb2RlLnZhbHVlLmluZGV4T2YoXCIgaW4gXCIpICE9PSAtMSA/IEZPUl9UWVBFUy5JTiA6IEZPUl9UWVBFUy5PRjtcblxuICAgICAgICBsZXQgcGFydHMgPSBhdHRyaWJ1dGVOb2RlLnZhbHVlLnNwbGl0KFwiIFwiICsgdGhpcy5mb3JUeXBlICsgXCIgXCIpO1xuICAgICAgICB0aGlzLnRvVmFyaWFibGUgPSBwYXJ0c1swXS5zdWJzdHJpbmcocGFydHNbMF0uaW5kZXhPZihcIiBcIikgKyAxKS50cmltKCk7XG4gICAgICAgIHRoaXMuZnJvbVZhcmlhYmxlID0gcGFydHNbMV0uc3Vic3RyaW5nKHBhcnRzWzFdLmluZGV4T2YoXCIuXCIpICsgMSkudHJpbSgpO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgbGV0IGZyb20gPSB0aGlzLmNvbXBvbmVudFt0aGlzLmZyb21WYXJpYWJsZV07XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBmcm9tKSB7XG4gICAgICAgICAgICBpZiAoIWZyb20uaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5hcHBlbmRlZENoaWxkcmVuLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5ld05vZGUgPSB0aGlzLm11bHRpcGxpZWROb2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBuZXdOb2RlLl92YXJpYWJsZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZvclR5cGUgPT0gRk9SX1RZUEVTLklOKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuX3ZhcmlhYmxlc1t0aGlzLnRvVmFyaWFibGVdID0ga2V5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuX3ZhcmlhYmxlc1t0aGlzLnRvVmFyaWFibGVdID0gZnJvbVtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobmV3Tm9kZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnQudXBkYXRlQmluZGluZ3MobmV3Tm9kZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRlZENoaWxkcmVuLnNldChrZXksIG5ld05vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGtleSBvZiB0aGlzLmFwcGVuZGVkQ2hpbGRyZW4ua2V5cygpKSB7XG4gICAgICAgICAgICBpZiAoIWZyb20uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGxldCBub2RlVG9SZW1vdmUgPSB0aGlzLmFwcGVuZGVkQ2hpbGRyZW4uZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnQudXBkYXRlQmluZGluZ3Mobm9kZVRvUmVtb3ZlKTtcbiAgICAgICAgICAgICAgICBub2RlVG9SZW1vdmUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRlZENoaWxkcmVuLmRlbGV0ZShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59XG5fQWxsb3kyLmRlZmF1bHQucmVnaXN0ZXIoRm9yKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuY29uc3QgZXJyb3JNZXNzYWdlTGVuZ3RoID0gNTA7XG5cbmNsYXNzIEpzb25QYXJzZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuXG4gICAgY29uc3RydWN0b3IoZXJyb3IsIGpzb25TdHJpbmcsIC4uLmRhdGEpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgbGV0IGVycm9yUG9zaXRpb24gPSBlcnJvci5tZXNzYWdlLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgZXJyb3JQb3NpdGlvbiA9IGVycm9yUG9zaXRpb25bZXJyb3JQb3NpdGlvbi5sZW5ndGggLSAxXTtcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gZXJyb3IubWVzc2FnZSArIFwiIChcIiArIGpzb25TdHJpbmcuc3Vic3RyKE1hdGgubWF4KGVycm9yUG9zaXRpb24gLSBlcnJvck1lc3NhZ2VMZW5ndGggLyAyLCAwKSwgZXJyb3JNZXNzYWdlTGVuZ3RoKS50cmltKCkgKyBcIikgXCIgKyBkYXRhLmpvaW4oXCIgXCIpO1xuICAgICAgICB0aGlzLnN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgICAgIHRoaXMubmFtZSA9IGVycm9yLm5hbWU7XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBKc29uUGFyc2VFcnJvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxudmFyIF9Kc29uUGFyc2VFcnJvciA9IHJlcXVpcmUoXCIuL0pzb25QYXJzZUVycm9yXCIpO1xuXG52YXIgX0pzb25QYXJzZUVycm9yMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0pzb25QYXJzZUVycm9yKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuX0FsbG95Mi5kZWZhdWx0Lkpzb25Qcm92aWRlciA9IGNsYXNzIEpzb25Qcm92aWRlciBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5YSFJQcm92aWRlciB7XG5cbiAgICBzdGF0aWMgbG9hZCh1cmwsIGRhdGEsIG1ldGhvZCwgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc3VwZXIubG9hZCh1cmwsIGRhdGEsIHsgbWV0aG9kOiBtZXRob2QsIHJlc3BvbnNlVHlwZTogXCJ0ZXh0XCIgfSwgb25Qcm9ncmVzcykudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoanNvblBhcnNlRXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgX0pzb25QYXJzZUVycm9yMi5kZWZhdWx0KGpzb25QYXJzZUV4Y2VwdGlvbiwgcmVzcG9uc2UsIHVybCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxudmFyIF9SZXN0UmVzb3VyY2VCYXNlID0gcmVxdWlyZShcIi4vUmVzdFJlc291cmNlQmFzZVwiKTtcblxudmFyIF9SZXN0UmVzb3VyY2VCYXNlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1Jlc3RSZXNvdXJjZUJhc2UpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5sZXQgcmVjdXJzaXZlU2V0TmFtZUFuZFBhcmVudCA9IGZ1bmN0aW9uIChpdGVtLCBuYW1lKSB7XG4gICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBfUmVzdFJlc291cmNlQmFzZTIuZGVmYXVsdCkge1xuICAgICAgICBpdGVtLnNldFBhcmVudCh0aGlzKTtcbiAgICAgICAgaXRlbS5zZXROYW1lKG5hbWUpO1xuICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBpdGVtLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICByZWN1cnNpdmVTZXROYW1lQW5kUGFyZW50LmNhbGwodGhpcywgaXRlbVtpXSwgbmFtZSArIFwiL1wiICsgaSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGl0ZW0pIHtcbiAgICAgICAgICAgIGlmICghaXRlbS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgcmVjdXJzaXZlU2V0TmFtZUFuZFBhcmVudC5jYWxsKHRoaXMsIGl0ZW1ba2V5XSwgbmFtZSArIFwiL1wiICsga2V5KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbl9BbGxveTIuZGVmYXVsdC5SZXN0UmVzb3VyY2UgPSBjbGFzcyBSZXN0UmVzb3VyY2UgZXh0ZW5kcyBfUmVzdFJlc291cmNlQmFzZTIuZGVmYXVsdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihzdHJ1Y3R1cmUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgbGV0IGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gc3RydWN0dXJlKSB7XG4gICAgICAgICAgICBpZiAoIXN0cnVjdHVyZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgbGV0IGl0ZW0gPSBzdHJ1Y3R1cmVba2V5XTtcbiAgICAgICAgICAgIHJlY3Vyc2l2ZVNldE5hbWVBbmRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtLCBrZXkpO1xuICAgICAgICAgICAgaW5zdGFuY2Vba2V5XSA9IGl0ZW07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfVxuXG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmxldCB1cGRhdGVQYXRoID0gZnVuY3Rpb24gKCkge1xuICAgIGxldCBwYXJlbnQgPSB0aGlzLmdldFBhcmVudCgpO1xuICAgIGxldCBwYXRoID0gXCIvXCIgKyB0aGlzLmdldE5hbWUoKTtcbiAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIHBhdGggPSBwYXJlbnQuZ2V0UGF0aCgpICsgcGF0aDtcbiAgICB9XG4gICAgdGhpcy5zZXRQYXRoKHBhdGgpO1xufTtcblxubGV0IGRlZXBDbG9uZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFJlc3RSZXNvdXJjZUJhc2UpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5jbG9uZSgpO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhbHVlW2ldID0gZGVlcENsb25lKHZhbHVlW2ldKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB2YWx1ZVtrZXldID0gZGVlcENsb25lKHZhbHVlW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbmNsYXNzIFJlc3RSZXNvdXJjZUJhc2UgZXh0ZW5kcyBfQWxsb3kyLmRlZmF1bHQuRGF0YUJpbmRpbmcge1xuXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICBsZXQgZGF0YVByb3ZpZGVyO1xuICAgICAgICBsZXQgb25FcnJvcjtcbiAgICAgICAgaWYgKG9wdGlvbnMgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgIGRhdGFQcm92aWRlciA9IG9wdGlvbnMuZGF0YVByb3ZpZGVyO1xuICAgICAgICAgICAgb25FcnJvciA9IG9wdGlvbnMub25FcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN1cGVyKGRhdGFQcm92aWRlciwgXCJcIiwgdHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5fLm9uRXJyb3IgPSBvbkVycm9yO1xuXG4gICAgICAgIHRoaXMuXy5uYW1lID0gXCJcIjtcbiAgICAgICAgdGhpcy5fLnBhcmVudCA9IG51bGw7XG4gICAgfVxuXG4gICAgZ2V0U3RydWN0dXJlKCkge1xuICAgICAgICAvLyBZZXMgdGhlcmUgaXMgbm8gc3RydWN0dXJlIGluIHRoZSBiYXNlIGNsYXNzLCBpdCBoYXMgdG8gYmUgaW1wbGVtZW50ZWQgaW4gdGhlIGltcGxlbWVudGF0aW9uIGNsYXNzZXMgdGhpcyBpcyBuZWVkZWQgZm9yIHRoZSBjbG9uZSBtZXRob2RcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5zdHJ1Y3R1cmU7XG4gICAgfVxuXG4gICAgZ2V0T25FcnJvcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5vbkVycm9yO1xuICAgIH1cblxuICAgIHNldE9uRXJyb3Iob25FcnJvcikge1xuICAgICAgICB0aGlzLl8ub25FcnJvciA9IG9uRXJyb3I7XG4gICAgfVxuXG4gICAgZ2V0TmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5uYW1lO1xuICAgIH1cblxuICAgIHNldE5hbWUobmFtZSkge1xuICAgICAgICB0aGlzLl8ubmFtZSA9IG5hbWU7XG5cbiAgICAgICAgdXBkYXRlUGF0aC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGdldFBhcmVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5wYXJlbnQ7XG4gICAgfVxuXG4gICAgc2V0UGFyZW50KHBhcmVudCkge1xuICAgICAgICB0aGlzLl8ucGFyZW50ID0gcGFyZW50O1xuXG4gICAgICAgIHRoaXMuc2V0RGF0YVByb3ZpZGVyKHBhcmVudC5nZXREYXRhUHJvdmlkZXIoKSk7XG5cbiAgICAgICAgdXBkYXRlUGF0aC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHBhcnNlRXJyb3JzKGVycm9ycykge1xuICAgICAgICBpZiAodGhpcy5fLm9uRXJyb3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgdGhpcy5fLm9uRXJyb3IoZXJyb3JzKTsgLy8gRGVjaWRlIGlmIG9uRXJyb3IgaXMgZXhlY3V0ZWQgZm9yIGV2ZXJ5IGVycm9yIGluIGVycm9ycyBhcnJheSAvIG9iamVjdFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGFyc2VEYXRhKGRhdGEpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGRhdGEpIHtcbiAgICAgICAgICAgIGlmICghZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGFyc2VVcGRhdGUocmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnBhcnNlRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wYXJzZUVycm9ycyhyZXN1bHQuZXJyb3JzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHN1cGVyLmJhc2VVcGRhdGUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7IC8vIEV2YWx1YXRlIGlmIEkgaGFuZGxlIGVycm9ycyBoZXJlIG9yIG5vdC4uLiBlLmcuIGNoZWNrIGpzb25hcGkub3JnIGlmIHRoZXJlIGlzIGEgc3RhbmRhcmQuLi4gbGlrZSBvbmx5IGdpdmUgMjAwIG1lc3NhZ2VzIGFuZCBzdHVmZlxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNsb25lKCkge1xuICAgICAgICBsZXQgY29weSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuZ2V0U3RydWN0dXJlKCksIHtcbiAgICAgICAgICAgIGRhdGFQcm92aWRlcjogdGhpcy5nZXREYXRhUHJvdmlkZXIoKSxcbiAgICAgICAgICAgIG9uRXJyb3I6IHRoaXMuZ2V0T25FcnJvcigpXG4gICAgICAgIH0pO1xuICAgICAgICBjb3B5LnNldE5hbWUodGhpcy5nZXROYW1lKCkpO1xuXG4gICAgICAgIGZvciAobGV0IGtleSBpbiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIGNvcHlba2V5XSA9IGRlZXBDbG9uZSh0aGlzW2tleV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBSZXN0UmVzb3VyY2VCYXNlOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG52YXIgX1Jlc3RSZXNvdXJjZUJhc2UgPSByZXF1aXJlKFwiLi9SZXN0UmVzb3VyY2VCYXNlXCIpO1xuXG52YXIgX1Jlc3RSZXNvdXJjZUJhc2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUmVzdFJlc291cmNlQmFzZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmxldCByZWN1cnNpdmVTZXRQYXJlbnQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgIGlmIChpdGVtIGluc3RhbmNlb2YgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQpIHtcbiAgICAgICAgaXRlbS5zZXRQYXJlbnQodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IGl0ZW0ubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHJlY3Vyc2l2ZVNldFBhcmVudC5jYWxsKHRoaXMsIGl0ZW1baV0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBpdGVtKSB7XG4gICAgICAgICAgICBpZiAoIWl0ZW0uaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHJlY3Vyc2l2ZVNldFBhcmVudC5jYWxsKHRoaXMsIGl0ZW1ba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5fQWxsb3kyLmRlZmF1bHQuUmVzdFJlc291cmNlTGlzdCA9IGNsYXNzIFJlc3RSZXNvdXJjZUxpc3QgZXh0ZW5kcyBfUmVzdFJlc291cmNlQmFzZTIuZGVmYXVsdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihzdHJ1Y3R1cmUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5fLnN0cnVjdHVyZSA9IHN0cnVjdHVyZTtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcbiAgICB9XG5cbiAgICBwYXJzZURhdGEoZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgaW5kZXg7IChpbmRleCA9IGRhdGFbaV0pICE9PSB1bmRlZmluZWQ7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbaW5kZXhdID0gdGhpcy5nZXRTdHJ1Y3R1cmUoKS5jbG9uZSgpO1xuICAgICAgICAgICAgICAgIHRoaXNbaW5kZXhdLnNldFBhcmVudCh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzW2luZGV4XS5zZXROYW1lKGluZGV4KTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiB0aGlzW2luZGV4XSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXNbaW5kZXhdLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZVNldFBhcmVudC5jYWxsKHRoaXNbaW5kZXhdLCB0aGlzW2luZGV4XVtrZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzLCBkYXRhW2tleV0pO1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxufTsiLCJyZXF1aXJlKFwiLi9wbHVnaW5zL2RlZmF1bHQvZXZlbnRzL09uY2xpY2suanNcIik7XHJcbnJlcXVpcmUoXCIuL3BsdWdpbnMvZGVmYXVsdC9sb29wcy9Gb3IuanNcIik7XHJcbnJlcXVpcmUoXCIuL3BsdWdpbnMvZGF0YS1iaW5kaW5nL0RhdGFCaW5kaW5nLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL2pzb24tcHJvdmlkZXIvSnNvblByb3ZpZGVyLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL3Jlc3QtYmluZGluZy9SZXN0UmVzb3VyY2UuanNcIik7XHJcbnJlcXVpcmUoXCIuL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZUxpc3QuanNcIik7XHJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vY29yZS9BbGxveVwiKS5kZWZhdWx0OyJdfQ==
