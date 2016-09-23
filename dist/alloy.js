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
            if (newValue instanceof NodeList) {
                throw new Error("Adding a variable of type NodeList is not supported, please first convert to NodeArray by using new Alloy.NodeArray(nodeList)");
            } else if (!(newValue instanceof _NodeArray2.default) && !(newValue instanceof Node) && newValue instanceof Object) {
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

let _getScopeVariables = function (node) {
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
        //console.log('test');
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
},{"../../../core/Alloy":1}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{"../../core/Alloy":1,"./JsonParseError":13}],15:[function(require,module,exports){
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
},{"../../core/Alloy":1,"./RestResourceBase":16}],16:[function(require,module,exports){
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
},{"../../core/Alloy":1}],17:[function(require,module,exports){
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
},{"../../core/Alloy":1,"./RestResourceBase":16}],18:[function(require,module,exports){
require("./plugins/default/events/GenericEvent.js");
require("./plugins/default/loops/For.js");
require("./plugins/data-binding/DataBinding.js");
require("./plugins/json-provider/JsonProvider.js");
require("./plugins/rest-binding/RestResource.js");
require("./plugins/rest-binding/RestResourceList.js");
module.exports = require("./core/Alloy").default;
},{"./core/Alloy":1,"./plugins/data-binding/DataBinding.js":10,"./plugins/default/events/GenericEvent.js":11,"./plugins/default/loops/For.js":12,"./plugins/json-provider/JsonProvider.js":14,"./plugins/rest-binding/RestResource.js":15,"./plugins/rest-binding/RestResourceList.js":17}]},{},[18])(18)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvY29yZS9BbGxveS5qcyIsImRpc3QvdGVtcC9jb3JlL2Jhc2UvQXR0cmlidXRlLmpzIiwiZGlzdC90ZW1wL2NvcmUvYmFzZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9Ob2RlQXJyYXkuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9TdHJpbmdVdGlscy5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2RhdGEtcHJvdmlkZXJzL0NhY2hlLmpzIiwiZGlzdC90ZW1wL2NvcmUvdXRpbHMvZGF0YS1wcm92aWRlcnMvWEhSUHJvdmlkZXIuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9pbmRleGVkLWRiL0luZGV4ZWREQi5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGF0YS1iaW5kaW5nL0RhdGFCaW5kaW5nLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvR2VuZXJpY0V2ZW50LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9sb29wcy9Gb3IuanMiLCJkaXN0L3RlbXAvcGx1Z2lucy9qc29uLXByb3ZpZGVyL0pzb25QYXJzZUVycm9yLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvanNvbi1wcm92aWRlci9Kc29uUHJvdmlkZXIuanMiLCJkaXN0L3RlbXAvcGx1Z2lucy9yZXN0LWJpbmRpbmcvUmVzdFJlc291cmNlLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZUJhc2UuanMiLCJkaXN0L3RlbXAvcGx1Z2lucy9yZXN0LWJpbmRpbmcvUmVzdFJlc291cmNlTGlzdC5qcyIsImRpc3QvdGVtcC9zdGFuZGFsb25lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0NvbXBvbmVudCA9IHJlcXVpcmUoXCIuL2Jhc2UvQ29tcG9uZW50XCIpO1xuXG52YXIgX0NvbXBvbmVudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Db21wb25lbnQpO1xuXG52YXIgX0F0dHJpYnV0ZSA9IHJlcXVpcmUoXCIuL2Jhc2UvQXR0cmlidXRlXCIpO1xuXG52YXIgX0F0dHJpYnV0ZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BdHRyaWJ1dGUpO1xuXG52YXIgX1N0cmluZ1V0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMvU3RyaW5nVXRpbHNcIik7XG5cbnZhciBfU3RyaW5nVXRpbHMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyaW5nVXRpbHMpO1xuXG52YXIgX05vZGVBcnJheSA9IHJlcXVpcmUoXCIuL3V0aWxzL05vZGVBcnJheVwiKTtcblxudmFyIF9Ob2RlQXJyYXkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTm9kZUFycmF5KTtcblxudmFyIF9YSFJQcm92aWRlciA9IHJlcXVpcmUoXCIuL3V0aWxzL2RhdGEtcHJvdmlkZXJzL1hIUlByb3ZpZGVyXCIpO1xuXG52YXIgX1hIUlByb3ZpZGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1hIUlByb3ZpZGVyKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IF9pc1Byb3RvdHlwZU9mID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvdG90eXBlKSB7XG4gICAgaWYgKG9iamVjdC5fX3Byb3RvX18gPT09IHByb3RvdHlwZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG9iamVjdC5fX3Byb3RvX18gIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gX2lzUHJvdG90eXBlT2Yob2JqZWN0Ll9fcHJvdG9fXywgcHJvdG90eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuY2xhc3MgQWxsb3kge1xuICAgIHN0YXRpYyByZWdpc3Rlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKF9pc1Byb3RvdHlwZU9mKGNvbXBvbmVudCwgX0NvbXBvbmVudDIuZGVmYXVsdCkpIHtcbiAgICAgICAgICAgIGxldCBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG4gICAgICAgICAgICBwcm90b3R5cGUuY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudCA9IG5ldyBjb21wb25lbnQodGhpcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmRldGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NvbXBvbmVudC5fZGVzdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudC5fZGVzdHJ1Y3RvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwcm90b3R5cGUuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrID0gZnVuY3Rpb24gKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudC5hdHRyaWJ1dGVDaGFuZ2VkKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHByb3RvdHlwZS5jbG9uZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudC5jbG9uZU5vZGUodGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBsZXQgZGFzaGVkTmFtZSA9IF9TdHJpbmdVdGlsczIuZGVmYXVsdC50b0Rhc2hlZChjb21wb25lbnQubmFtZSk7XG4gICAgICAgICAgICB3aW5kb3dbY29tcG9uZW50Lm5hbWVdID0gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KGRhc2hlZE5hbWUsIHsgcHJvdG90eXBlOiBwcm90b3R5cGUgfSk7XG4gICAgICAgICAgICAvL0FsbG95Ll9yZWdpc3RlcmVkQ29tcG9uZW50cy5hZGQoZGFzaGVkTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2lzUHJvdG90eXBlT2YoY29tcG9uZW50LCBfQXR0cmlidXRlMi5kZWZhdWx0KSkge1xuICAgICAgICAgICAgICAgIEFsbG95Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5zZXQoX1N0cmluZ1V0aWxzMi5kZWZhdWx0LnRvRGFzaGVkKGNvbXBvbmVudC5uYW1lKSwgY29tcG9uZW50KTtcbiAgICAgICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0aWMgZ2V0KHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9XG59XG4vL0FsbG95Ll9yZWdpc3RlcmVkQ29tcG9uZW50cyA9IG5ldyBTZXQoKTtcbkFsbG95Ll9yZWdpc3RlcmVkQXR0cmlidXRlcyA9IG5ldyBNYXAoKTtcbkFsbG95LkNvbXBvbmVudCA9IF9Db21wb25lbnQyLmRlZmF1bHQ7XG5BbGxveS5BdHRyaWJ1dGUgPSBfQXR0cmlidXRlMi5kZWZhdWx0O1xuQWxsb3kuTm9kZUFycmF5ID0gX05vZGVBcnJheTIuZGVmYXVsdDtcbkFsbG95LlhIUlByb3ZpZGVyID0gX1hIUlByb3ZpZGVyMi5kZWZhdWx0O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBBbGxveTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIEF0dHJpYnV0ZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVOb2RlKSB7XG4gICAgICAgIHRoaXMuY29tcG9uZW50ID0gYXR0cmlidXRlTm9kZS5fYWxsb3lDb21wb25lbnQ7XG4gICAgICAgIGxldCB2YXJpYWJsZXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIGxldCB2YXJpYWJsZXNSZWdFeHAgPSAvXFxzKnRoaXNcXC4oW2EtekEtWjAtOV9cXCRdKylcXHMqL2c7XG4gICAgICAgIGxldCB2YXJpYWJsZU1hdGNoO1xuICAgICAgICB3aGlsZSAodmFyaWFibGVNYXRjaCA9IHZhcmlhYmxlc1JlZ0V4cC5leGVjKGF0dHJpYnV0ZU5vZGUudmFsdWUpKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuYWRkKHZhcmlhYmxlTWF0Y2hbMV0pO1xuICAgICAgICAgICAgdGhpcy5jb21wb25lbnQuYWRkVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVNYXRjaFsxXSwgdmFyaWFibGVOYW1lID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7fVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBBdHRyaWJ1dGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9YSFJQcm92aWRlciA9IHJlcXVpcmUoXCIuLy4uL3V0aWxzL2RhdGEtcHJvdmlkZXJzL1hIUlByb3ZpZGVyXCIpO1xuXG52YXIgX1hIUlByb3ZpZGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1hIUlByb3ZpZGVyKTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfTm9kZUFycmF5ID0gcmVxdWlyZShcIi4vLi4vdXRpbHMvTm9kZUFycmF5XCIpO1xuXG52YXIgX05vZGVBcnJheTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Ob2RlQXJyYXkpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBfdHJpZ2dlclVwZGF0ZUNhbGxiYWNrcyA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAodGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1cGRhdGVDYWxsYmFja3NbaV0odmFyaWFibGVOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfdXBkYXRlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICBpZiAodGhpcy51cGRhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLnVwZGF0ZSh2YXJpYWJsZU5hbWUpO1xuICAgIH1cbn07XG5cbmNvbnN0IF9idWlsZFNldHRlclZhcmlhYmxlID0gZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KHZhcmlhYmxlTmFtZSkpIHJldHVybjtcblxuICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IHRoaXNbdmFyaWFibGVOYW1lXTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdmFyaWFibGVOYW1lLCB7XG4gICAgICAgIGdldDogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBuZXdWYWx1ZSA9PiB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgaW5zdGFuY2VvZiBOb2RlTGlzdCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFkZGluZyBhIHZhcmlhYmxlIG9mIHR5cGUgTm9kZUxpc3QgaXMgbm90IHN1cHBvcnRlZCwgcGxlYXNlIGZpcnN0IGNvbnZlcnQgdG8gTm9kZUFycmF5IGJ5IHVzaW5nIG5ldyBBbGxveS5Ob2RlQXJyYXkobm9kZUxpc3QpXCIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghKG5ld1ZhbHVlIGluc3RhbmNlb2YgX05vZGVBcnJheTIuZGVmYXVsdCkgJiYgIShuZXdWYWx1ZSBpbnN0YW5jZW9mIE5vZGUpICYmIG5ld1ZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJveHlUZW1wbGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0OiAodGFyZ2V0LCBwcm9wZXJ0eSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogKHRhcmdldCwgcHJvcGVydHksIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG5ldyBQcm94eSh2YWx1ZSwgcHJveHlUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0W3Byb3BlcnR5XSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RyaWdnZXJVcGRhdGVDYWxsYmFja3MuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3IFByb3h5KG5ld1ZhbHVlLCBwcm94eVRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV0gIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgX3RyaWdnZXJVcGRhdGVDYWxsYmFja3MuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5jb25zdCBfc2V0dXBNYXBwaW5nRm9yTm9kZSA9IGZ1bmN0aW9uIChub2RlLCB0ZXh0LCBiaW5kTWFwKSB7XG4gICAgbGV0IGV2YWxNYXRjaFJlZ0V4cCA9IC9cXCR7KFtefV0qKX0vZztcbiAgICBsZXQgYWxyZWFkeUJvdW5kID0gbmV3IFNldCgpO1xuICAgIGxldCBldmFsTWF0Y2g7XG4gICAgbGV0IHZhcmlhYmxlcyA9IG5ldyBTZXQoKTtcbiAgICB3aGlsZSAoZXZhbE1hdGNoID0gZXZhbE1hdGNoUmVnRXhwLmV4ZWModGV4dCkpIHtcbiAgICAgICAgbGV0IHZhcmlhYmxlc1JlZ0V4cCA9IC9cXHMqdGhpc1xcLihbYS16QS1aMC05X1xcJF0rKVxccyovZztcbiAgICAgICAgbGV0IHZhcmlhYmxlTWF0Y2g7XG4gICAgICAgIHdoaWxlICh2YXJpYWJsZU1hdGNoID0gdmFyaWFibGVzUmVnRXhwLmV4ZWMoZXZhbE1hdGNoWzFdKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJpYWJsZU1hdGNoWzFdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IHZhcmlhYmxlTmFtZSBvZiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgIGlmICghYWxyZWFkeUJvdW5kLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgYWxyZWFkeUJvdW5kLmFkZCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGlmICghYmluZE1hcC5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBiaW5kTWFwLnNldCh2YXJpYWJsZU5hbWUsIFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGJpbmRBdHRyaWJ1dGVzID0gYmluZE1hcC5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICBiaW5kQXR0cmlidXRlcy5wdXNoKFtub2RlLCB0ZXh0LCB2YXJpYWJsZXNdKTtcblxuICAgICAgICAgICAgICAgIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMsIHZhcmlhYmxlTmFtZSkgPT09IHVuZGVmaW5lZCB8fCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMsIHZhcmlhYmxlTmFtZSkuc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgX2J1aWxkU2V0dGVyVmFyaWFibGUuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IF9idWlsZEJpbmRNYXAgPSBmdW5jdGlvbiAoc3RhcnROb2RlKSB7XG4gICAgbGV0IGJpbmRNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBpZiAoc3RhcnROb2RlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSAmJiBzdGFydE5vZGUudGV4dENvbnRlbnQgIT09IFwiXCIpIHtcbiAgICAgICAgX3NldHVwTWFwcGluZ0Zvck5vZGUuY2FsbCh0aGlzLCBzdGFydE5vZGUsIHN0YXJ0Tm9kZS50ZXh0Q29udGVudCwgYmluZE1hcCk7XG4gICAgfVxuICAgIGlmIChzdGFydE5vZGUuYXR0cmlidXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwLCBhdHRyaWJ1dGVOb2RlOyBhdHRyaWJ1dGVOb2RlID0gc3RhcnROb2RlLmF0dHJpYnV0ZXNbal07IGorKykge1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZU5vZGUudmFsdWUgIT0gXCJcIikge1xuICAgICAgICAgICAgICAgIF9zZXR1cE1hcHBpbmdGb3JOb2RlLmNhbGwodGhpcywgYXR0cmlidXRlTm9kZSwgYXR0cmlidXRlTm9kZS52YWx1ZSwgYmluZE1hcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgbm9kZUxpc3QgPSBzdGFydE5vZGUuY2hpbGROb2RlcztcbiAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpICYmIG5vZGUuX2NvbXBvbmVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBQZXJmb3JtYW5jZSBpbXByb3ZlbWVudDogU29tZWhvdyBjaGVjayBpZiBpdCdzIHBvc3NpYmxlIGFsc28gdG8gZXhjbHVkZSBmdXR1cmUgY29tcG9uZW50cy4uLlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG5ld0JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgbm9kZSk7XG4gICAgICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBuZXdCaW5kTWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICBrZXkgPSBrZXk7IC8vIEp1c3QgZm9yIHRoZSBzaWxseSB3YXJuaW5ncy4uLlxuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlOyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cblxuICAgICAgICAgICAgaWYgKCFiaW5kTWFwLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgYmluZE1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBiaW5kVmFsdWVzID0gYmluZE1hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBiaW5kVmFsdWVzID0gYmluZFZhbHVlcy5jb25jYXQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KGtleSwgYmluZFZhbHVlcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBpdGVtOyBpdGVtID0gdmFsdWVbal07IGorKykge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fYmluZE1hcEluZGV4LmhhcyhpdGVtWzBdKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwSW5kZXguc2V0KGl0ZW1bMF0sIG5ldyBTZXQoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBlbnRyaWVzID0gdGhpcy5fYmluZE1hcEluZGV4LmdldChpdGVtWzBdKTtcbiAgICAgICAgICAgICAgICBlbnRyaWVzLmFkZChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGJpbmRNYXA7XG59O1xuXG5jb25zdCBfZXZhbHVhdGVBdHRyaWJ1dGVIYW5kbGVycyA9IGZ1bmN0aW9uIChzdGFydE5vZGUpIHtcbiAgICBpZiAoc3RhcnROb2RlLmF0dHJpYnV0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgYXR0cmlidXRlTm9kZTsgYXR0cmlidXRlTm9kZSA9IHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzW2pdOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChfQWxsb3kyLmRlZmF1bHQuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLmhhcyhhdHRyaWJ1dGVOb2RlLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgYXR0cmlidXRlTm9kZS5fYWxsb3lDb21wb25lbnQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZU5vZGUuX2FsbG95QXR0cmlidXRlID0gbmV3IChfQWxsb3kyLmRlZmF1bHQuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLmdldChhdHRyaWJ1dGVOb2RlLm5hbWUpKShhdHRyaWJ1dGVOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgbm9kZUxpc3QgPSBzdGFydE5vZGUuY2hpbGROb2RlcztcbiAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCBub2RlKTtcbiAgICB9XG59O1xuXG5jb25zdCBfdXBkYXRlID0gZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSkge1xuICAgIGlmICghdGhpcy5fYmluZE1hcC5oYXModmFyaWFibGVOYW1lKSkgcmV0dXJuO1xuXG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdGhpcy5fYmluZE1hcC5nZXQodmFyaWFibGVOYW1lKSkge1xuICAgICAgICAvLyBMb29wIHRocm91Z2ggYWxsIG5vZGVzIGluIHdoaWNoIHRoZSB2YXJpYWJsZSB0aGF0IHRyaWdnZXJlZCB0aGUgdXBkYXRlIGlzIHVzZWQgaW5cbiAgICAgICAgbGV0IG5vZGVUb1VwZGF0ZSA9IHZhbHVlWzBdOyAvLyBUaGUgbm9kZSBpbiB3aGljaCB0aGUgdmFyaWFibGUgdGhhdCB0cmlnZ2VyZWQgdGhlIHVwZGF0ZSBpcyBpbiwgdGhlIHRleHQgY2FuIGFscmVhZHkgYmUgb3ZlcnJpdHRlbiBieSB0aGUgZXZhbHVhdGlvbiBvZiBldmFsVGV4dFxuICAgICAgICBsZXQgZXZhbFRleHQgPSB2YWx1ZVsxXTsgLy8gQ291bGQgY29udGFpbiBtdWx0aXBsZSB2YXJpYWJsZXMsIGJ1dCBhbHdheXMgdGhlIHZhcmlhYmxlIHRoYXQgdHJpZ2dlcmVkIHRoZSB1cGRhdGUgd2hpY2ggaXMgdmFyaWFibGVOYW1lXG5cbiAgICAgICAgLy8gQ29udmVydCB0aGUgbm9kZVRvVXBkYXRlIHRvIGEgbm9uIFRleHROb2RlIE5vZGVcbiAgICAgICAgbGV0IGh0bWxOb2RlVG9VcGRhdGU7XG4gICAgICAgIGlmIChub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhKSB7XG4gICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlID0gbm9kZVRvVXBkYXRlLnBhcmVudEVsZW1lbnQ7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgQXR0cikge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZS5vd25lckVsZW1lbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlID0gbm9kZVRvVXBkYXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGh0bWxOb2RlVG9VcGRhdGUucGFyZW50RWxlbWVudCA9PT0gbnVsbCkgY29udGludWU7IC8vIFNraXAgbm9kZXMgdGhhdCBhcmUgbm90IGFkZGVkIHRvIHRoZSB2aXNpYmxlIGRvbVxuXG4gICAgICAgIGZvciAobGV0IHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSBvZiB2YWx1ZVsyXSkge1xuICAgICAgICAgICAgaWYgKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSBpbnN0YW5jZW9mIF9Ob2RlQXJyYXkyLmRlZmF1bHQgfHwgdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBldmFsVGV4dCA9IGV2YWxUZXh0LnJlcGxhY2UobmV3IFJlZ0V4cChcIlxcXFwke1xcXFxzKnRoaXNcXFxcLlwiICsgdmFyaWFibGVzVmFyaWFibGVOYW1lICsgXCJcXFxccyp9XCIsIFwiZ1wiKSwgXCJcIik7IC8vIFJlbW92ZSBhbHJlYWR5IGFzIG5vZGUgaWRlbnRpZmllZCBhbmQgZXZhbHVhdGVkIHZhcmlhYmxlcyBmcm9tIGV2YWxUZXh0XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlTmFtZSA9PT0gdmFyaWFibGVzVmFyaWFibGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBfTm9kZUFycmF5Mi5kZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5vZGUgPSB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV1baV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUuYXBwZW5kQ2hpbGQodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSkge1xuICAgICAgICAgICAgbGV0IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhcmlhYmxlRGVjbGFyYXRpb25TdHJpbmcgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGRlY2xhcmVkVmFyaWFibGVOYW1lIGluIGh0bWxOb2RlVG9VcGRhdGUuX3ZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGNoZWNrIGZvciBoYXNPd25Qcm9wZXJ0eSwgY2F1c2Ugb2YgT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgICAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VuZmlsdGVyZWRGb3JJbkxvb3BcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVEZWNsYXJhdGlvblN0cmluZyArPSBcImxldCBcIiArIGRlY2xhcmVkVmFyaWFibGVOYW1lICsgXCI9XCIgKyBKU09OLnN0cmluZ2lmeShodG1sTm9kZVRvVXBkYXRlLl92YXJpYWJsZXNbZGVjbGFyZWRWYXJpYWJsZU5hbWVdKSArIFwiO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBldmFsdWF0ZWQgPSBldmFsKHZhcmlhYmxlRGVjbGFyYXRpb25TdHJpbmcgKyBcImBcIiArIGV2YWxUZXh0ICsgXCJgXCIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yLCBldmFsVGV4dCwgXCJvbiBub2RlXCIsIG5vZGVUb1VwZGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSkge1xuICAgICAgICAgICAgICAgIG5vZGVUb1VwZGF0ZS50ZXh0Q29udGVudCA9IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVRvVXBkYXRlLnZhbHVlID0gZXZhbHVhdGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuY29uc3QgX2lzTm9kZUNoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5wYXJlbnRFbGVtZW50ID09PSB0aGlzLl9yb290Tm9kZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG5vZGUucGFyZW50RWxlbWVudCA9PT0gbnVsbCB8fCBub2RlLnBhcmVudEVsZW1lbnQgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgbm9kZS5wYXJlbnRFbGVtZW50KTtcbn07XG5cbmxldCBfaW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuXG4vL25vaW5zcGVjdGlvbiBKU1VudXNlZExvY2FsU3ltYm9sc1xuY2xhc3MgQ29tcG9uZW50IHtcblxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZShlbGVtZW50SWQpIHtcbiAgICAgICAgcmV0dXJuIF9pbnN0YW5jZXMuZ2V0KGVsZW1lbnRJZCk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Iocm9vdE5vZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fcm9vdE5vZGUgPSByb290Tm9kZTtcbiAgICAgICAgb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9IG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IHVuZGVmaW5lZCA/IFwiYXV0b1wiIDogb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZDtcblxuICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9PT0gXCJpbmxpbmVcIikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUob3B0aW9ucy50ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IFwiY2hpbGRyZW5cIikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX1hIUlByb3ZpZGVyMi5kZWZhdWx0LmxvYWQob3B0aW9ucy50ZW1wbGF0ZSwgbnVsbCwgeyBjYWNoZTogb3B0aW9ucy5jYWNoZSwgdmVyc2lvbjogb3B0aW9ucy52ZXJzaW9uIH0pLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5fcm9vdE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuLmFwcGVuZENoaWxkKHRoaXMuX3Jvb3ROb2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuID0gbmV3IF9Ob2RlQXJyYXkyLmRlZmF1bHQodGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbi5jaGlsZE5vZGVzKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yb290Tm9kZS5pbm5lckhUTUwgKz0gdGVtcGxhdGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4ID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5fYmluZE1hcCA9IF9idWlsZEJpbmRNYXAuY2FsbCh0aGlzLCB0aGlzLl9yb290Tm9kZSk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMuX2JpbmRNYXApO1xuICAgICAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCB0aGlzLl9yb290Tm9kZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFjaGVkIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaGVkKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBfaW5zdGFuY2VzLnNldCh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkLnZhbHVlLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyb3Iuc3RhY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgY29tcG9uZW50ICVvXCIsIHRoaXMsIGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX2Rlc3RydWN0b3IoKSB7XG4gICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgIGlmICh0aGlzLmRlc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkRnVuY3Rpb25cbiAgICAgICAgICAgIHRoaXMuZGVzdHJ1Y3RvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQgIT09IHVuZGVmaW5lZCAmJiBfaW5zdGFuY2VzLmhhcyh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkLnZhbHVlKSkge1xuICAgICAgICAgICAgX2luc3RhbmNlcy5kZWxldGUodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRBdHRyaWJ1dGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcztcbiAgICB9XG5cbiAgICBnZXRBdHRyaWJ1dGVWYWx1ZShuYW1lKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmdldE5hbWVkSXRlbShuYW1lKS5ub2RlVmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0VHJhbnNjbHVkZWRDaGlsZHJlbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW47XG4gICAgfVxuXG4gICAgYWRkVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5zZXQodmFyaWFibGVOYW1lLCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICB1cGRhdGVDYWxsYmFja3NbdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aF0gPSBjYWxsYmFjaztcblxuICAgICAgICBfYnVpbGRTZXR0ZXJWYXJpYWJsZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmVtb3ZlVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIHVwZGF0ZUNhbGxiYWNrcy5zcGxpY2UodXBkYXRlQ2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spLCAxKTtcbiAgICB9XG5cbiAgICB1cGRhdGVCaW5kaW5ncyhzdGFydE5vZGUpIHtcbiAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCBzdGFydE5vZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLl9iaW5kTWFwSW5kZXguaGFzKHN0YXJ0Tm9kZSkpIHtcblxuICAgICAgICAgICAgaWYgKCFfaXNOb2RlQ2hpbGQuY2FsbCh0aGlzLCBzdGFydE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgbm90IGEgY2hpbGQgb2YgdGhlIGNvbXBvbmVudCBhbnltb3JlLCByZW1vdmUgZnJvbSBiaW5kTWFwXG4gICAgICAgICAgICAgICAgbGV0IGJpbmRNYXBLZXlzID0gdGhpcy5fYmluZE1hcEluZGV4LmdldChzdGFydE5vZGUpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGJpbmRNYXBLZXkgb2YgYmluZE1hcEtleXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJpbmRNYXAgPSB0aGlzLl9iaW5kTWFwLmdldChiaW5kTWFwS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IGJpbmRNYXAubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiaW5kTWFwW2ldWzBdID09PSBzdGFydE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kTWFwLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwSW5kZXguZGVsZXRlKHN0YXJ0Tm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgbGV0IG5ld0JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgc3RhcnROb2RlKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIG5ld0JpbmRNYXAuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICAgICAga2V5ID0ga2V5OyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VudXNlZEFzc2lnbm1lbnQsU2lsbHlBc3NpZ25tZW50SlNcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlOyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fYmluZE1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkQmluZFZhbHVlcyA9IHRoaXMuX2JpbmRNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgICAgIG91dGVyQmluZFZhbHVlTG9vcDogZm9yIChsZXQgaiA9IDAsIG5ld0JpbmRWYWx1ZTsgbmV3QmluZFZhbHVlID0gdmFsdWVbal07IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIG9sZEJpbmRWYWx1ZTsgb2xkQmluZFZhbHVlID0gb2xkQmluZFZhbHVlc1tpXTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEJpbmRWYWx1ZSA9PT0gbmV3QmluZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyQmluZFZhbHVlTG9vcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG9sZEJpbmRWYWx1ZXNbb2xkQmluZFZhbHVlcy5sZW5ndGhdID0gbmV3QmluZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBub2RlOyBub2RlID0gbm9kZUxpc3RbaV07IGkrKykge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVCaW5kaW5ncyhub2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsb25lTm9kZShjb21wb25lbnQpIHtcbiAgICAgICAgbGV0IHJvb3ROb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgbGV0IHRyYW5zY2x1ZGVkQ2hpbGRyZW4gPSB0aGlzLmdldFRyYW5zY2x1ZGVkQ2hpbGRyZW4oKTtcbiAgICAgICAgZm9yIChsZXQgY2hpbGQgb2YgdHJhbnNjbHVkZWRDaGlsZHJlbikge1xuICAgICAgICAgICAgcm9vdE5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQuY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBob2xkZXJOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgaG9sZGVyTm9kZS5pbm5lckhUTUwgPSBcIjxcIiArIGNvbXBvbmVudC5uYW1lICsgXCI+XCIgKyByb290Tm9kZS5pbm5lckhUTUwgKyBcIjwvXCIgKyBjb21wb25lbnQubmFtZSArIFwiPlwiO1xuXG4gICAgICAgIHJldHVybiBob2xkZXJOb2RlLmNoaWxkTm9kZXNbMF07XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBDb21wb25lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8vbm9pbnNwZWN0aW9uIEpTVW51c2VkTG9jYWxTeW1ib2xzXG5jbGFzcyBOb2RlQXJyYXkgZXh0ZW5kcyBBcnJheSB7XG4gICAgY29uc3RydWN0b3Iobm9kZUxpc3QpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgaWYgKG5vZGVMaXN0IGluc3RhbmNlb2YgTm9kZUxpc3QgfHwgbm9kZUxpc3QgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IG5vZGVMaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tpXSA9IG5vZGVMaXN0W2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGxldCBuZXdOb2RlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBub2RlIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIG5ld05vZGVzW25ld05vZGVzLmxlbmd0aF0gPSBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgTm9kZUFycmF5KG5ld05vZGVzKTtcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBOb2RlQXJyYXk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmNsYXNzIFN0cmluZ1V0aWxzIHtcblxuICAgIHN0YXRpYyB0b0Rhc2hlZChzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCBcIiQxLSQyXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBTdHJpbmdVdGlsczsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0luZGV4ZWREQiA9IHJlcXVpcmUoXCIuLi9pbmRleGVkLWRiL0luZGV4ZWREQlwiKTtcblxudmFyIF9JbmRleGVkREIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY2xhc3MgQ2FjaGUge1xuICAgIHN0YXRpYyBnZXQodXJsLCB2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uICE9PSB1bmRlZmluZWQgPyB2ZXJzaW9uIDogMDtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChDYWNoZS5tZW1vcnlbdXJsXSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoQ2FjaGUubWVtb3J5W3VybF0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQ2FjaGUuaW5kZXhlZERCLmdldCh1cmwsIHsgdmVyc2lvbjogdmVyc2lvbiB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS5nZXRWYWx1ZXMoKS5yZXNvdXJjZSk7XG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yICE9PSB1bmRlZmluZWQpIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byByZXRyaWV2ZSByZXNvdXJjZSBmcm9tIEluZGV4ZWREQlwiLCBlcnJvcik7XG5cbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0YXRpYyBzZXQodXJsLCBkYXRhLCB2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uICE9PSB1bmRlZmluZWQgPyB2ZXJzaW9uIDogMDtcbiAgICAgICAgQ2FjaGUubWVtb3J5W3VybF0gPSBkYXRhO1xuICAgICAgICBDYWNoZS5pbmRleGVkREIuc2V0KHVybCwgZGF0YSwgdmVyc2lvbik7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ2FjaGU7XG5DYWNoZS5tZW1vcnkgPSB7fTtcbkNhY2hlLmluZGV4ZWREQiA9IG5ldyBfSW5kZXhlZERCMi5kZWZhdWx0KFwiY2FjaGVcIiwgMiwgXCJyZXNvdXJjZXNcIiwgW1widXJsXCIsIFwicmVzb3VyY2VcIiwgXCJ2ZXJzaW9uXCJdKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0NhY2hlID0gcmVxdWlyZShcIi4vQ2FjaGVcIik7XG5cbnZhciBfQ2FjaGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2FjaGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBERUZBVUxUX01FVEhPRCA9IFwiZ2V0XCI7XG5jb25zdCBERUZBVUxUX01JTUVfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuY29uc3QgREVGQVVMVF9SRVNQT05TRV9UWVBFID0gbnVsbDsgLy8gQXV0b21hdGljXG5jb25zdCBERUZBVUxUX0NBQ0hFX1NUQVRFID0gZmFsc2U7XG5cbmNsYXNzIFhIUlByb3ZpZGVyIHtcblxuICAgIHN0YXRpYyBwb3N0KHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdW5kZWZpbmVkKSBvcHRpb25zID0ge307XG4gICAgICAgIG9wdGlvbnMubWV0aG9kID0gXCJwb3N0XCI7XG4gICAgICAgIHJldHVybiB0aGlzLmxvYWQodXJsLCBkYXRhLCBvcHRpb25zLCBvblByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZ2V0KHVybCwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKHVybCwgbnVsbCwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgLy8gT3ZlcndyaXRlIHRoaXMgYW5kIGNhbGwgc3VwZXIubG9hZCgpIGluc2lkZVxuICAgIHN0YXRpYyBsb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gWEhSUHJvdmlkZXIuX2xvYWQodXJsLCBkYXRhLCBvcHRpb25zLCBvblByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX2xvYWQodXJsLCBkYXRhLCBvcHRpb25zLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucyA9PT0gdW5kZWZpbmVkKSBvcHRpb25zID0ge307XG5cbiAgICAgICAgICAgIG9wdGlvbnMuY2FjaGUgPSBvcHRpb25zLmNhY2hlICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNhY2hlIDogREVGQVVMVF9DQUNIRV9TVEFURTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNhY2hlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgX0NhY2hlMi5kZWZhdWx0LmdldCh1cmwsIG9wdGlvbnMudmVyc2lvbikudGhlbihyZXNvbHZlKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIFhIUlByb3ZpZGVyLl9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgWEhSUHJvdmlkZXIuX2RvWEhSKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX2RvWEhSKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IG1ldGhvZCA9IG9wdGlvbnMubWV0aG9kIHx8IERFRkFVTFRfTUVUSE9EO1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgICAgIGxldCBtaW1lVHlwZSA9IG9wdGlvbnMubWltZVR5cGUgfHwgREVGQVVMVF9NSU1FX1RZUEU7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2VUeXBlID0gb3B0aW9ucy5yZXNwb25zZVR5cGUgfHwgREVGQVVMVF9SRVNQT05TRV9UWVBFO1xuXG4gICAgICAgICAgICBsZXQgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgaWYgKG1pbWVUeXBlKSByZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUobWltZVR5cGUpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlVHlwZSkgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSByZXNwb25zZVR5cGU7XG4gICAgICAgICAgICByZXF1ZXN0Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAob25Qcm9ncmVzcykgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwicHJvZ3Jlc3NcIiwgb25Qcm9ncmVzcywgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX0NhY2hlMi5kZWZhdWx0LnNldCh1cmwsIHRoaXMucmVzcG9uc2UsIG9wdGlvbnMudmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IFhIUlByb3ZpZGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfSW5kZXhlZERCUmVzdWx0ID0gcmVxdWlyZShcIi4vSW5kZXhlZERCUmVzdWx0XCIpO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JbmRleGVkREJSZXN1bHQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBBQ1RJT05TID0ge1xuICAgIFJFQURPTkxZOiBcInJlYWRvbmx5XCIsXG4gICAgUkVBRFdSSVRFOiBcInJlYWR3cml0ZVwiXG59O1xuXG5jbGFzcyBJbmRleGVkREIge1xuICAgIGNvbnN0cnVjdG9yKGRhdGFiYXNlTmFtZSwgZGF0YWJhc2VWZXJzaW9uLCBzdG9yZU5hbWUsIHN0cnVjdHVyZSkge1xuICAgICAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRhdGFiYXNlTmFtZTtcbiAgICAgICAgdGhpcy5kYXRhYmFzZVZlcnNpb24gPSBkYXRhYmFzZVZlcnNpb247XG4gICAgICAgIHRoaXMuc3RvcmVOYW1lID0gc3RvcmVOYW1lO1xuICAgICAgICB0aGlzLnN0b3JlS2V5ID0gc3RydWN0dXJlWzBdO1xuXG4gICAgICAgIHRoaXMuc3RydWN0dXJlID0gc3RydWN0dXJlO1xuICAgIH1cblxuICAgIF9pbml0KCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKHNjb3BlLmRhdGFiYXNlTmFtZSwgc2NvcGUuZGF0YWJhc2VWZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG9uU3VjY2VzcyBpcyBleGVjdXRlZCBhZnRlciBvbnVwZ3JhZGVuZWVkZWQgRE9OVCByZXNvbHZlIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhYmFzZSA9IGV2ZW50LmN1cnJlbnRUYXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2UuZGVsZXRlT2JqZWN0U3RvcmUoc2NvcGUuc3RvcmVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHt9XG4gICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmNyZWF0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSwgeyBrZXlQYXRoOiBzY29wZS5zdG9yZUtleSB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5kYXRhYmFzZSA9IHRoaXMucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS50cmllZERlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXMgZGVsZXRpbmcgZXhpdGluZyBkYXRhYmFzZSBhbmQgcmV0cnlpbmcuLi5cIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IGluZGV4ZWREQi5kZWxldGVEYXRhYmFzZShzY29wZS5kYXRhYmFzZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudHJpZWREZWxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLl9pbml0KCkudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJFcnJvciB3aGlsZSBkZWxldGluZyBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkbid0IGRlbGV0ZSBpbmRleGVkREIgJXMgZHVlIHRvIHRoZSBvcGVyYXRpb24gYmVpbmcgYmxvY2tlZFwiLCBzY29wZS5kYXRhYmFzZU5hbWUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkIG5vdCBvcGVuIGluZGV4ZWREQiAlc1wiLCBzY29wZS5kYXRhYmFzZU5hbWUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25ibG9ja2VkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkbid0IG9wZW4gaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2dldFN0b3JlKGFjdGlvbikge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCB0cmFuc2FjdGlvbiA9IHNjb3BlLmRhdGFiYXNlLnRyYW5zYWN0aW9uKHNjb3BlLnN0b3JlTmFtZSwgYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgfVxuXG4gICAgX2dldFN0b3JlKGFjdGlvbikge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoc2NvcGUuaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjb3BlLl9pbml0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2NvcGUuX19nZXRTdG9yZShhY3Rpb24pKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXQodXJsLCBlcXVhbHMpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRE9OTFkpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlcyA9PT0gdW5kZWZpbmVkICYmIGVxdWFscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBlcXVhbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXF1YWxzLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlcy5oYXNPd25Qcm9wZXJ0eShrZXkpIHx8IHZhbHVlc1trZXldICE9PSBlcXVhbHNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IF9JbmRleGVkREJSZXN1bHQyLmRlZmF1bHQodmFsdWVzKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzZXQoa2V5LCBhcmdzKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgbGV0IGRhdGEgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBwdXREYXRhID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gc2NvcGUuc3RydWN0dXJlLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcHV0RGF0YVtzY29wZS5zdHJ1Y3R1cmVbaV1dID0gZGF0YVtpXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLnB1dChwdXREYXRhKTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IHJlc29sdmU7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVtb3ZlKHVybCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzY29wZS5fZ2V0U3RvcmUoQUNUSU9OUy5SRUFEV1JJVEUpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUucmVtb3ZlKHVybCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzY29wZS5fZ2V0U3RvcmUoQUNUSU9OUy5SRUFEV1JJVEUpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IHJlc29sdmU7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSW5kZXhlZERCOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBJbmRleGVkREJSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlcykge1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXRWYWx1ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlcztcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBJbmRleGVkREJSZXN1bHQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbl9BbGxveTIuZGVmYXVsdC5EYXRhQmluZGluZyA9IGNsYXNzIERhdGFCaW5kaW5nIGV4dGVuZHMgT2JqZWN0IHtcblxuICAgIGNvbnN0cnVjdG9yKGRhdGFQcm92aWRlciwgcGF0aCwgZG9udENyZWF0ZSkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuXyA9IHt9O1xuXG4gICAgICAgIHRoaXMuXy5kYXRhUHJvdmlkZXIgPSBkYXRhUHJvdmlkZXI7XG4gICAgICAgIHRoaXMuXy5wYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5fLmludGVydmFsSW5kZXggPSBudWxsO1xuXG4gICAgICAgIGlmICghZG9udENyZWF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRQYXRoKHBhdGgpIHtcbiAgICAgICAgdGhpcy5fLnBhdGggPSBwYXRoO1xuICAgIH1cblxuICAgIGdldFBhdGgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ucGF0aDtcbiAgICB9XG5cbiAgICBzZXREYXRhUHJvdmlkZXIoZGF0YVByb3ZpZGVyKSB7XG4gICAgICAgIHRoaXMuXy5kYXRhUHJvdmlkZXIgPSBkYXRhUHJvdmlkZXI7XG4gICAgfVxuXG4gICAgZ2V0RGF0YVByb3ZpZGVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLmRhdGFQcm92aWRlcjtcbiAgICB9XG5cbiAgICBwYXJzZVVwZGF0ZShyZXN1bHQpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHRoaXNba2V5XSA9IHJlc3VsdFtrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYmFzZVVwZGF0ZSgpIHtcbiAgICAgICAgbGV0IHByb21pc2UgPSB0aGlzLl8uZGF0YVByb3ZpZGVyLmdldCh0aGlzLl8ucGF0aCk7XG4gICAgICAgIHByb21pc2UudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgdGhpcy5wYXJzZVVwZGF0ZShyZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5iYXNlVXBkYXRlKCk7XG4gICAgfVxuXG4gICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBzZXRVcGRhdGVJbnRlcnZhbChtaWxsaXNlY29uZHMpIHtcbiAgICAgICAgdGhpcy5fLmludGVydmFsSW5kZXggPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgICB9LCBtaWxsaXNlY29uZHMpO1xuICAgIH1cblxuICAgIGNsZWFyVXBkYXRlSW50ZXJ2YWwoKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5fLmludGVydmFsSW5kZXgpO1xuICAgIH1cblxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5sZXQgX2dldFNjb3BlVmFyaWFibGVzID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5fdmFyaWFibGVzKSB7XG4gICAgICAgIHJldHVybiBub2RlLl92YXJpYWJsZXM7XG4gICAgfSBlbHNlIGlmIChub2RlLl9jb21wb25lbnQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChub2RlLnBhcmVudEVsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRTY29wZVZhcmlhYmxlcyhub2RlLnBhcmVudEVsZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbmNsYXNzIEdlbmVyaWNFdmVudCBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5BdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICBzdXBlcihhdHRyaWJ1dGVOb2RlKTtcblxuICAgICAgICBsZXQgY29tcG9uZW50ID0gdGhpcy5jb21wb25lbnQ7XG5cbiAgICAgICAgbGV0IHZhcmlhYmxlcyA9IF9nZXRTY29wZVZhcmlhYmxlcyhhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudCk7XG5cbiAgICAgICAgbGV0IG9yaWdpbmFsRnVuY3Rpb24gPSBhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudC5vbmNsaWNrO1xuXG4gICAgICAgIGxldCB2YXJpYWJsZU5hbWVzID0gW1wiZXZlbnRcIl07XG4gICAgICAgIGZvciAobGV0IGRlY2xhcmVkVmFyaWFibGVOYW1lIGluIHZhcmlhYmxlcykge1xuICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgIHZhcmlhYmxlTmFtZXNbdmFyaWFibGVOYW1lcy5sZW5ndGhdID0gZGVjbGFyZWRWYXJpYWJsZU5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXJpYWJsZU5hbWVzW3ZhcmlhYmxlTmFtZXMubGVuZ3RoXSA9IFwiKFwiICsgb3JpZ2luYWxGdW5jdGlvbiArIFwiKS5jYWxsKHRoaXMsIGV2ZW50KTtcIjsgLy8gQWRkIHRoZSBhY3R1YWwgZnVuY3Rpb24gYm9keSB0byB0aGUgZnVuY3Rpb24gYXBwbHkgbGlzdFxuXG4gICAgICAgIGxldCBuZXdGdW5jdGlvbiA9IEZ1bmN0aW9uLmFwcGx5KG51bGwsIHZhcmlhYmxlTmFtZXMpO1xuXG4gICAgICAgIGF0dHJpYnV0ZU5vZGUub3duZXJFbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGxldCB2YXJpYWJsZVZhbHVlcyA9IFtldmVudF07XG4gICAgICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGNoZWNrIGZvciBoYXNPd25Qcm9wZXJ0eSwgY2F1c2Ugb2YgT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5maWx0ZXJlZEZvckluTG9vcFxuICAgICAgICAgICAgICAgIHZhcmlhYmxlVmFsdWVzW3ZhcmlhYmxlVmFsdWVzLmxlbmd0aF0gPSB2YXJpYWJsZXNbZGVjbGFyZWRWYXJpYWJsZU5hbWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXdGdW5jdGlvbi5hcHBseShjb21wb25lbnQsIHZhcmlhYmxlVmFsdWVzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEdlbmVyaWNFdmVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgRk9SX1RZUEVTID0ge1xuICAgIE9GOiBcIm9mXCIsXG4gICAgSU46IFwiaW5cIlxufTtcblxuY2xhc3MgRm9yIGV4dGVuZHMgX0FsbG95Mi5kZWZhdWx0LkF0dHJpYnV0ZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVOb2RlKSB7XG4gICAgICAgIHN1cGVyKGF0dHJpYnV0ZU5vZGUpO1xuXG4gICAgICAgIHRoaXMubXVsdGlwbGllZE5vZGUgPSBhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudDtcbiAgICAgICAgdGhpcy5tdWx0aXBsaWVkTm9kZS5hdHRyaWJ1dGVzLnJlbW92ZU5hbWVkSXRlbShcImZvclwiKTtcbiAgICAgICAgdGhpcy5wYXJlbnROb2RlID0gdGhpcy5tdWx0aXBsaWVkTm9kZS5wYXJlbnROb2RlO1xuICAgICAgICB0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5tdWx0aXBsaWVkTm9kZSk7XG5cbiAgICAgICAgdGhpcy5jb21wb25lbnQudXBkYXRlQmluZGluZ3ModGhpcy5tdWx0aXBsaWVkTm9kZSk7XG5cbiAgICAgICAgdGhpcy5hcHBlbmRlZENoaWxkcmVuID0gbmV3IE1hcCgpO1xuXG4gICAgICAgIHRoaXMuZm9yVHlwZSA9IGF0dHJpYnV0ZU5vZGUudmFsdWUuaW5kZXhPZihcIiBpbiBcIikgIT09IC0xID8gRk9SX1RZUEVTLklOIDogRk9SX1RZUEVTLk9GO1xuXG4gICAgICAgIGxldCBwYXJ0cyA9IGF0dHJpYnV0ZU5vZGUudmFsdWUuc3BsaXQoXCIgXCIgKyB0aGlzLmZvclR5cGUgKyBcIiBcIik7XG4gICAgICAgIHRoaXMudG9WYXJpYWJsZSA9IHBhcnRzWzBdLnN1YnN0cmluZyhwYXJ0c1swXS5pbmRleE9mKFwiIFwiKSArIDEpLnRyaW0oKTtcbiAgICAgICAgdGhpcy5mcm9tVmFyaWFibGUgPSBwYXJ0c1sxXS5zdWJzdHJpbmcocGFydHNbMV0uaW5kZXhPZihcIi5cIikgKyAxKS50cmltKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCd0ZXN0Jyk7XG4gICAgICAgIGxldCBmcm9tID0gdGhpcy5jb21wb25lbnRbdGhpcy5mcm9tVmFyaWFibGVdO1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gZnJvbSkge1xuICAgICAgICAgICAgaWYgKCFmcm9tLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXBwZW5kZWRDaGlsZHJlbi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGxldCBuZXdOb2RlID0gdGhpcy5tdWx0aXBsaWVkTm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZS5fdmFyaWFibGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mb3JUeXBlID09IEZPUl9UWVBFUy5JTikge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLl92YXJpYWJsZXNbdGhpcy50b1ZhcmlhYmxlXSA9IGtleTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLl92YXJpYWJsZXNbdGhpcy50b1ZhcmlhYmxlXSA9IGZyb21ba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmFwcGVuZENoaWxkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LnVwZGF0ZUJpbmRpbmdzKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kZWRDaGlsZHJlbi5zZXQoa2V5LCBuZXdOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBrZXkgb2YgdGhpcy5hcHBlbmRlZENoaWxkcmVuLmtleXMoKSkge1xuICAgICAgICAgICAgaWYgKCFmcm9tLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBsZXQgbm9kZVRvUmVtb3ZlID0gdGhpcy5hcHBlbmRlZENoaWxkcmVuLmdldChrZXkpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LnVwZGF0ZUJpbmRpbmdzKG5vZGVUb1JlbW92ZSk7XG4gICAgICAgICAgICAgICAgbm9kZVRvUmVtb3ZlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kZWRDaGlsZHJlbi5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxufVxuX0FsbG95Mi5kZWZhdWx0LnJlZ2lzdGVyKEZvcik7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmNvbnN0IGVycm9yTWVzc2FnZUxlbmd0aCA9IDUwO1xuXG5jbGFzcyBKc29uUGFyc2VFcnJvciBleHRlbmRzIEVycm9yIHtcblxuICAgIGNvbnN0cnVjdG9yKGVycm9yLCBqc29uU3RyaW5nLCAuLi5kYXRhKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGxldCBlcnJvclBvc2l0aW9uID0gZXJyb3IubWVzc2FnZS5zcGxpdChcIiBcIik7XG4gICAgICAgIGVycm9yUG9zaXRpb24gPSBlcnJvclBvc2l0aW9uW2Vycm9yUG9zaXRpb24ubGVuZ3RoIC0gMV07XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgKyBcIiAoXCIgKyBqc29uU3RyaW5nLnN1YnN0cihNYXRoLm1heChlcnJvclBvc2l0aW9uIC0gZXJyb3JNZXNzYWdlTGVuZ3RoIC8gMiwgMCksIGVycm9yTWVzc2FnZUxlbmd0aCkudHJpbSgpICsgXCIpIFwiICsgZGF0YS5qb2luKFwiIFwiKTtcbiAgICAgICAgdGhpcy5zdGFjayA9IGVycm9yLnN0YWNrO1xuICAgICAgICB0aGlzLm5hbWUgPSBlcnJvci5uYW1lO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSnNvblBhcnNlRXJyb3I7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfSnNvblBhcnNlRXJyb3IgPSByZXF1aXJlKFwiLi9Kc29uUGFyc2VFcnJvclwiKTtcblxudmFyIF9Kc29uUGFyc2VFcnJvcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Kc29uUGFyc2VFcnJvcik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbl9BbGxveTIuZGVmYXVsdC5Kc29uUHJvdmlkZXIgPSBjbGFzcyBKc29uUHJvdmlkZXIgZXh0ZW5kcyBfQWxsb3kyLmRlZmF1bHQuWEhSUHJvdmlkZXIge1xuXG4gICAgc3RhdGljIGxvYWQodXJsLCBkYXRhLCBtZXRob2QsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHN1cGVyLmxvYWQodXJsLCBkYXRhLCB7IG1ldGhvZDogbWV0aG9kLCByZXNwb25zZVR5cGU6IFwidGV4dFwiIH0sIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGpzb25QYXJzZUV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IF9Kc29uUGFyc2VFcnJvcjIuZGVmYXVsdChqc29uUGFyc2VFeGNlcHRpb24sIHJlc3BvbnNlLCB1cmwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfUmVzdFJlc291cmNlQmFzZSA9IHJlcXVpcmUoXCIuL1Jlc3RSZXNvdXJjZUJhc2VcIik7XG5cbnZhciBfUmVzdFJlc291cmNlQmFzZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9SZXN0UmVzb3VyY2VCYXNlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IHJlY3Vyc2l2ZVNldE5hbWVBbmRQYXJlbnQgPSBmdW5jdGlvbiAoaXRlbSwgbmFtZSkge1xuICAgIGlmIChpdGVtIGluc3RhbmNlb2YgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQpIHtcbiAgICAgICAgaXRlbS5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgIGl0ZW0uc2V0TmFtZShuYW1lKTtcbiAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gaXRlbS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmVjdXJzaXZlU2V0TmFtZUFuZFBhcmVudC5jYWxsKHRoaXMsIGl0ZW1baV0sIG5hbWUgKyBcIi9cIiArIGkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBpdGVtKSB7XG4gICAgICAgICAgICBpZiAoIWl0ZW0uaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHJlY3Vyc2l2ZVNldE5hbWVBbmRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2tleV0sIG5hbWUgKyBcIi9cIiArIGtleSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5fQWxsb3kyLmRlZmF1bHQuUmVzdFJlc291cmNlID0gY2xhc3MgUmVzdFJlc291cmNlIGV4dGVuZHMgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQge1xuXG4gICAgY29uc3RydWN0b3Ioc3RydWN0dXJlLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cbiAgICAgICAgZm9yIChsZXQga2V5IGluIHN0cnVjdHVyZSkge1xuICAgICAgICAgICAgaWYgKCFzdHJ1Y3R1cmUuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIGxldCBpdGVtID0gc3RydWN0dXJlW2tleV07XG4gICAgICAgICAgICByZWN1cnNpdmVTZXROYW1lQW5kUGFyZW50LmNhbGwodGhpcywgaXRlbSwga2V5KTtcbiAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH1cblxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5sZXQgdXBkYXRlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgcGFyZW50ID0gdGhpcy5nZXRQYXJlbnQoKTtcbiAgICBsZXQgcGF0aCA9IFwiL1wiICsgdGhpcy5nZXROYW1lKCk7XG4gICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgICBwYXRoID0gcGFyZW50LmdldFBhdGgoKSArIHBhdGg7XG4gICAgfVxuICAgIHRoaXMuc2V0UGF0aChwYXRoKTtcbn07XG5cbmxldCBkZWVwQ2xvbmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZXN0UmVzb3VyY2VCYXNlKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuY2xvbmUoKTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YWx1ZVtpXSA9IGRlZXBDbG9uZSh2YWx1ZVtpXSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgdmFsdWVba2V5XSA9IGRlZXBDbG9uZSh2YWx1ZVtrZXldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5jbGFzcyBSZXN0UmVzb3VyY2VCYXNlIGV4dGVuZHMgX0FsbG95Mi5kZWZhdWx0LkRhdGFCaW5kaW5nIHtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgbGV0IGRhdGFQcm92aWRlcjtcbiAgICAgICAgbGV0IG9uRXJyb3I7XG4gICAgICAgIGlmIChvcHRpb25zIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICBkYXRhUHJvdmlkZXIgPSBvcHRpb25zLmRhdGFQcm92aWRlcjtcbiAgICAgICAgICAgIG9uRXJyb3IgPSBvcHRpb25zLm9uRXJyb3I7XG4gICAgICAgIH1cblxuICAgICAgICBzdXBlcihkYXRhUHJvdmlkZXIsIFwiXCIsIHRydWUpO1xuXG4gICAgICAgIHRoaXMuXy5vbkVycm9yID0gb25FcnJvcjtcblxuICAgICAgICB0aGlzLl8ubmFtZSA9IFwiXCI7XG4gICAgICAgIHRoaXMuXy5wYXJlbnQgPSBudWxsO1xuICAgIH1cblxuICAgIGdldFN0cnVjdHVyZSgpIHtcbiAgICAgICAgLy8gWWVzIHRoZXJlIGlzIG5vIHN0cnVjdHVyZSBpbiB0aGUgYmFzZSBjbGFzcywgaXQgaGFzIHRvIGJlIGltcGxlbWVudGVkIGluIHRoZSBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzIHRoaXMgaXMgbmVlZGVkIGZvciB0aGUgY2xvbmUgbWV0aG9kXG4gICAgICAgIHJldHVybiB0aGlzLl8uc3RydWN0dXJlO1xuICAgIH1cblxuICAgIGdldE9uRXJyb3IoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ub25FcnJvcjtcbiAgICB9XG5cbiAgICBzZXRPbkVycm9yKG9uRXJyb3IpIHtcbiAgICAgICAgdGhpcy5fLm9uRXJyb3IgPSBvbkVycm9yO1xuICAgIH1cblxuICAgIGdldE5hbWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ubmFtZTtcbiAgICB9XG5cbiAgICBzZXROYW1lKG5hbWUpIHtcbiAgICAgICAgdGhpcy5fLm5hbWUgPSBuYW1lO1xuXG4gICAgICAgIHVwZGF0ZVBhdGguY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBnZXRQYXJlbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl8ucGFyZW50O1xuICAgIH1cblxuICAgIHNldFBhcmVudChwYXJlbnQpIHtcbiAgICAgICAgdGhpcy5fLnBhcmVudCA9IHBhcmVudDtcblxuICAgICAgICB0aGlzLnNldERhdGFQcm92aWRlcihwYXJlbnQuZ2V0RGF0YVByb3ZpZGVyKCkpO1xuXG4gICAgICAgIHVwZGF0ZVBhdGguY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBwYXJzZUVycm9ycyhlcnJvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuXy5vbkVycm9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIHRoaXMuXy5vbkVycm9yKGVycm9ycyk7IC8vIERlY2lkZSBpZiBvbkVycm9yIGlzIGV4ZWN1dGVkIGZvciBldmVyeSBlcnJvciBpbiBlcnJvcnMgYXJyYXkgLyBvYmplY3RcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBhcnNlRGF0YShkYXRhKSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoIWRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHRoaXNba2V5XSA9IGRhdGFba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBhcnNlVXBkYXRlKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wYXJzZURhdGEocmVzdWx0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuZXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VFcnJvcnMocmVzdWx0LmVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzdXBlci5iYXNlVXBkYXRlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpOyAvLyBFdmFsdWF0ZSBpZiBJIGhhbmRsZSBlcnJvcnMgaGVyZSBvciBub3QuLi4gZS5nLiBjaGVjayBqc29uYXBpLm9yZyBpZiB0aGVyZSBpcyBhIHN0YW5kYXJkLi4uIGxpa2Ugb25seSBnaXZlIDIwMCBtZXNzYWdlcyBhbmQgc3R1ZmZcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgbGV0IGNvcHkgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmdldFN0cnVjdHVyZSgpLCB7XG4gICAgICAgICAgICBkYXRhUHJvdmlkZXI6IHRoaXMuZ2V0RGF0YVByb3ZpZGVyKCksXG4gICAgICAgICAgICBvbkVycm9yOiB0aGlzLmdldE9uRXJyb3IoKVxuICAgICAgICB9KTtcbiAgICAgICAgY29weS5zZXROYW1lKHRoaXMuZ2V0TmFtZSgpKTtcblxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpcykge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjb3B5W2tleV0gPSBkZWVwQ2xvbmUodGhpc1trZXldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gUmVzdFJlc291cmNlQmFzZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxudmFyIF9SZXN0UmVzb3VyY2VCYXNlID0gcmVxdWlyZShcIi4vUmVzdFJlc291cmNlQmFzZVwiKTtcblxudmFyIF9SZXN0UmVzb3VyY2VCYXNlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1Jlc3RSZXNvdXJjZUJhc2UpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5sZXQgcmVjdXJzaXZlU2V0UGFyZW50ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIF9SZXN0UmVzb3VyY2VCYXNlMi5kZWZhdWx0KSB7XG4gICAgICAgIGl0ZW0uc2V0UGFyZW50KHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBpdGVtLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2ldKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgICAgaWYgKCFpdGVtLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuX0FsbG95Mi5kZWZhdWx0LlJlc3RSZXNvdXJjZUxpc3QgPSBjbGFzcyBSZXN0UmVzb3VyY2VMaXN0IGV4dGVuZHMgX1Jlc3RSZXNvdXJjZUJhc2UyLmRlZmF1bHQge1xuXG4gICAgY29uc3RydWN0b3Ioc3RydWN0dXJlLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIHRoaXMuXy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgfVxuXG4gICAgcGFyc2VEYXRhKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGluZGV4OyAoaW5kZXggPSBkYXRhW2ldKSAhPT0gdW5kZWZpbmVkOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW2luZGV4XSA9IHRoaXMuZ2V0U3RydWN0dXJlKCkuY2xvbmUoKTtcbiAgICAgICAgICAgICAgICB0aGlzW2luZGV4XS5zZXRQYXJlbnQodGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpc1tpbmRleF0uc2V0TmFtZShpbmRleCk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzW2luZGV4XS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmVTZXRQYXJlbnQuY2FsbCh0aGlzW2luZGV4XSwgdGhpc1tpbmRleF1ba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgcmVjdXJzaXZlU2V0UGFyZW50LmNhbGwodGhpcywgZGF0YVtrZXldKTtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBkYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn07IiwicmVxdWlyZShcIi4vcGx1Z2lucy9kZWZhdWx0L2V2ZW50cy9HZW5lcmljRXZlbnQuanNcIik7XHJcbnJlcXVpcmUoXCIuL3BsdWdpbnMvZGVmYXVsdC9sb29wcy9Gb3IuanNcIik7XHJcbnJlcXVpcmUoXCIuL3BsdWdpbnMvZGF0YS1iaW5kaW5nL0RhdGFCaW5kaW5nLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL2pzb24tcHJvdmlkZXIvSnNvblByb3ZpZGVyLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL3Jlc3QtYmluZGluZy9SZXN0UmVzb3VyY2UuanNcIik7XHJcbnJlcXVpcmUoXCIuL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZUxpc3QuanNcIik7XHJcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vY29yZS9BbGxveVwiKS5kZWZhdWx0OyJdfQ==
