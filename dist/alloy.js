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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvY29yZS9BbGxveS5qcyIsImRpc3QvdGVtcC9jb3JlL2Jhc2UvQXR0cmlidXRlLmpzIiwiZGlzdC90ZW1wL2NvcmUvYmFzZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9Ob2RlQXJyYXkuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9TdHJpbmdVdGlscy5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2RhdGEtcHJvdmlkZXJzL0NhY2hlLmpzIiwiZGlzdC90ZW1wL2NvcmUvdXRpbHMvZGF0YS1wcm92aWRlcnMvWEhSUHJvdmlkZXIuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9pbmRleGVkLWRiL0luZGV4ZWREQi5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGF0YS1iaW5kaW5nL0RhdGFCaW5kaW5nLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvR2VuZXJpY0V2ZW50LmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvZGVmYXVsdC9sb29wcy9Gb3IuanMiLCJkaXN0L3RlbXAvcGx1Z2lucy9qc29uLXByb3ZpZGVyL0pzb25QYXJzZUVycm9yLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvanNvbi1wcm92aWRlci9Kc29uUHJvdmlkZXIuanMiLCJkaXN0L3RlbXAvcGx1Z2lucy9yZXN0LWJpbmRpbmcvUmVzdFJlc291cmNlLmpzIiwiZGlzdC90ZW1wL3BsdWdpbnMvcmVzdC1iaW5kaW5nL1Jlc3RSZXNvdXJjZUJhc2UuanMiLCJkaXN0L3RlbXAvcGx1Z2lucy9yZXN0LWJpbmRpbmcvUmVzdFJlc291cmNlTGlzdC5qcyIsImRpc3QvdGVtcC9zdGFuZGFsb25lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0NvbXBvbmVudCA9IHJlcXVpcmUoXCIuL2Jhc2UvQ29tcG9uZW50XCIpO1xuXG52YXIgX0NvbXBvbmVudDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Db21wb25lbnQpO1xuXG52YXIgX0F0dHJpYnV0ZSA9IHJlcXVpcmUoXCIuL2Jhc2UvQXR0cmlidXRlXCIpO1xuXG52YXIgX0F0dHJpYnV0ZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BdHRyaWJ1dGUpO1xuXG52YXIgX1N0cmluZ1V0aWxzID0gcmVxdWlyZShcIi4vdXRpbHMvU3RyaW5nVXRpbHNcIik7XG5cbnZhciBfU3RyaW5nVXRpbHMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfU3RyaW5nVXRpbHMpO1xuXG52YXIgX05vZGVBcnJheSA9IHJlcXVpcmUoXCIuL3V0aWxzL05vZGVBcnJheVwiKTtcblxudmFyIF9Ob2RlQXJyYXkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTm9kZUFycmF5KTtcblxudmFyIF9YSFJQcm92aWRlciA9IHJlcXVpcmUoXCIuL3V0aWxzL2RhdGEtcHJvdmlkZXJzL1hIUlByb3ZpZGVyXCIpO1xuXG52YXIgX1hIUlByb3ZpZGVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1hIUlByb3ZpZGVyKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IF9pc1Byb3RvdHlwZU9mID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvdG90eXBlKSB7XG4gICAgaWYgKG9iamVjdC5fX3Byb3RvX18gPT09IHByb3RvdHlwZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG9iamVjdC5fX3Byb3RvX18gIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gX2lzUHJvdG90eXBlT2Yob2JqZWN0Ll9fcHJvdG9fXywgcHJvdG90eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuY2xhc3MgQWxsb3kge1xuICAgIHN0YXRpYyByZWdpc3Rlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKF9pc1Byb3RvdHlwZU9mKGNvbXBvbmVudCwgX0NvbXBvbmVudDIuZGVmYXVsdCkpIHtcbiAgICAgICAgICAgIGxldCBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG4gICAgICAgICAgICBwcm90b3R5cGUuY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudCA9IG5ldyBjb21wb25lbnQodGhpcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmRldGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NvbXBvbmVudC5fZGVzdHJ1Y3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudC5fZGVzdHJ1Y3RvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwcm90b3R5cGUuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrID0gZnVuY3Rpb24gKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudC5hdHRyaWJ1dGVDaGFuZ2VkKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgbGV0IGRhc2hlZE5hbWUgPSBfU3RyaW5nVXRpbHMyLmRlZmF1bHQudG9EYXNoZWQoY29tcG9uZW50Lm5hbWUpO1xuICAgICAgICAgICAgd2luZG93W2NvbXBvbmVudC5uYW1lXSA9IGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChkYXNoZWROYW1lLCB7IHByb3RvdHlwZTogcHJvdG90eXBlIH0pO1xuICAgICAgICAgICAgLy9BbGxveS5fcmVnaXN0ZXJlZENvbXBvbmVudHMuYWRkKGRhc2hlZE5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKF9pc1Byb3RvdHlwZU9mKGNvbXBvbmVudCwgX0F0dHJpYnV0ZTIuZGVmYXVsdCkpIHtcbiAgICAgICAgICAgICAgICBBbGxveS5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMuc2V0KF9TdHJpbmdVdGlsczIuZGVmYXVsdC50b0Rhc2hlZChjb21wb25lbnQubmFtZSksIGNvbXBvbmVudCk7XG4gICAgICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGljIGdldChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfVxufVxuLy9BbGxveS5fcmVnaXN0ZXJlZENvbXBvbmVudHMgPSBuZXcgU2V0KCk7XG5BbGxveS5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMgPSBuZXcgTWFwKCk7XG5BbGxveS5Db21wb25lbnQgPSBfQ29tcG9uZW50Mi5kZWZhdWx0O1xuQWxsb3kuQXR0cmlidXRlID0gX0F0dHJpYnV0ZTIuZGVmYXVsdDtcbkFsbG95Lk5vZGVBcnJheSA9IF9Ob2RlQXJyYXkyLmRlZmF1bHQ7XG5BbGxveS5YSFJQcm92aWRlciA9IF9YSFJQcm92aWRlcjIuZGVmYXVsdDtcblxuZXhwb3J0cy5kZWZhdWx0ID0gQWxsb3k7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8vbm9pbnNwZWN0aW9uIEpTVW51c2VkTG9jYWxTeW1ib2xzXG5jbGFzcyBBdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50O1xuICAgICAgICBsZXQgdmFyaWFibGVzID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfXFwkXSspXFxzKi9nO1xuICAgICAgICBsZXQgdmFyaWFibGVNYXRjaDtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhhdHRyaWJ1dGVOb2RlLnZhbHVlKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJpYWJsZU1hdGNoWzFdKTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmFkZFVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTWF0Y2hbMV0sIHZhcmlhYmxlTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge31cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQXR0cmlidXRlOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfWEhSUHJvdmlkZXIgPSByZXF1aXJlKFwiLi8uLi91dGlscy9kYXRhLXByb3ZpZGVycy9YSFJQcm92aWRlclwiKTtcblxudmFyIF9YSFJQcm92aWRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9YSFJQcm92aWRlcik7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG52YXIgX05vZGVBcnJheSA9IHJlcXVpcmUoXCIuLy4uL3V0aWxzL05vZGVBcnJheVwiKTtcblxudmFyIF9Ob2RlQXJyYXkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfTm9kZUFycmF5KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgX3RyaWdnZXJVcGRhdGVDYWxsYmFja3MgPSBmdW5jdGlvbiAodmFyaWFibGVOYW1lKSB7XG4gICAgaWYgKHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgIGxldCB1cGRhdGVDYWxsYmFja3MgPSB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHVwZGF0ZUNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdXBkYXRlQ2FsbGJhY2tzW2ldKHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX3VwZGF0ZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgaWYgKHRoaXMudXBkYXRlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICB9XG59O1xuXG5jb25zdCBfYnVpbGRTZXR0ZXJWYXJpYWJsZSA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eSh2YXJpYWJsZU5hbWUpKSByZXR1cm47XG5cbiAgICB0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV0gPSB0aGlzW3ZhcmlhYmxlTmFtZV07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHZhcmlhYmxlTmFtZSwge1xuICAgICAgICBnZXQ6ICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogbmV3VmFsdWUgPT4ge1xuICAgICAgICAgICAgaWYgKG5ld1ZhbHVlIGluc3RhbmNlb2YgTm9kZUxpc3QpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBZGRpbmcgYSB2YXJpYWJsZSBvZiB0eXBlIE5vZGVMaXN0IGlzIG5vdCBzdXBwb3J0ZWQsIHBsZWFzZSBmaXJzdCBjb252ZXJ0IHRvIE5vZGVBcnJheSBieSB1c2luZyBuZXcgQWxsb3kuTm9kZUFycmF5KG5vZGVMaXN0KVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShuZXdWYWx1ZSBpbnN0YW5jZW9mIF9Ob2RlQXJyYXkyLmRlZmF1bHQpICYmICEobmV3VmFsdWUgaW5zdGFuY2VvZiBOb2RlKSAmJiBuZXdWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3h5VGVtcGxhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogKHRhcmdldCwgcHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6ICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBuZXcgUHJveHkodmFsdWUsIHByb3h5VGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldFtwcm9wZXJ0eV0gIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZSA9IG5ldyBQcm94eShuZXdWYWx1ZSwgcHJveHlUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuY29uc3QgX3NldHVwTWFwcGluZ0Zvck5vZGUgPSBmdW5jdGlvbiAobm9kZSwgdGV4dCwgYmluZE1hcCkge1xuICAgIGxldCBldmFsTWF0Y2hSZWdFeHAgPSAvXFwkeyhbXn1dKil9L2c7XG4gICAgbGV0IGFscmVhZHlCb3VuZCA9IG5ldyBTZXQoKTtcbiAgICBsZXQgZXZhbE1hdGNoO1xuICAgIGxldCB2YXJpYWJsZXMgPSBuZXcgU2V0KCk7XG4gICAgd2hpbGUgKGV2YWxNYXRjaCA9IGV2YWxNYXRjaFJlZ0V4cC5leGVjKHRleHQpKSB7XG4gICAgICAgIGxldCB2YXJpYWJsZXNSZWdFeHAgPSAvXFxzKnRoaXNcXC4oW2EtekEtWjAtOV9cXCRdKylcXHMqL2c7XG4gICAgICAgIGxldCB2YXJpYWJsZU1hdGNoO1xuICAgICAgICB3aGlsZSAodmFyaWFibGVNYXRjaCA9IHZhcmlhYmxlc1JlZ0V4cC5leGVjKGV2YWxNYXRjaFsxXSkpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlcy5hZGQodmFyaWFibGVNYXRjaFsxXSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCB2YXJpYWJsZU5hbWUgb2YgdmFyaWFibGVzKSB7XG4gICAgICAgICAgICBpZiAoIWFscmVhZHlCb3VuZC5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgIGFscmVhZHlCb3VuZC5hZGQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJpbmRNYXAuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluZE1hcC5zZXQodmFyaWFibGVOYW1lLCBbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBiaW5kQXR0cmlidXRlcyA9IGJpbmRNYXAuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgYmluZEF0dHJpYnV0ZXMucHVzaChbbm9kZSwgdGV4dCwgdmFyaWFibGVzXSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLCB2YXJpYWJsZU5hbWUpID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLCB2YXJpYWJsZU5hbWUpLnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIF9idWlsZFNldHRlclZhcmlhYmxlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5jb25zdCBfYnVpbGRCaW5kTWFwID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSkge1xuICAgIGxldCBiaW5kTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgaWYgKHN0YXJ0Tm9kZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEgJiYgc3RhcnROb2RlLnRleHRDb250ZW50ICE9PSBcIlwiKSB7XG4gICAgICAgIF9zZXR1cE1hcHBpbmdGb3JOb2RlLmNhbGwodGhpcywgc3RhcnROb2RlLCBzdGFydE5vZGUudGV4dENvbnRlbnQsIGJpbmRNYXApO1xuICAgIH1cbiAgICBpZiAoc3RhcnROb2RlLmF0dHJpYnV0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgYXR0cmlidXRlTm9kZTsgYXR0cmlidXRlTm9kZSA9IHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzW2pdOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVOb2RlLnZhbHVlICE9IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBfc2V0dXBNYXBwaW5nRm9yTm9kZS5jYWxsKHRoaXMsIGF0dHJpYnV0ZU5vZGUsIGF0dHJpYnV0ZU5vZGUudmFsdWUsIGJpbmRNYXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIG5vZGU7IG5vZGUgPSBub2RlTGlzdFtpXTsgaSsrKSB7XG4gICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhKSAmJiBub2RlLl9jb21wb25lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gVE9ETzogUGVyZm9ybWFuY2UgaW1wcm92ZW1lbnQ6IFNvbWVob3cgY2hlY2sgaWYgaXQncyBwb3NzaWJsZSBhbHNvIHRvIGV4Y2x1ZGUgZnV0dXJlIGNvbXBvbmVudHMuLi5cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXdCaW5kTWFwID0gX2J1aWxkQmluZE1hcC5jYWxsKHRoaXMsIG5vZGUpO1xuICAgICAgICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgbmV3QmluZE1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkQXNzaWdubWVudCxTaWxseUFzc2lnbm1lbnRKU1xuICAgICAgICAgICAga2V5ID0ga2V5OyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkQXNzaWdubWVudCxTaWxseUFzc2lnbm1lbnRKU1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG5cbiAgICAgICAgICAgIGlmICghYmluZE1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgYmluZFZhbHVlcyA9IGJpbmRNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgYmluZFZhbHVlcyA9IGJpbmRWYWx1ZXMuY29uY2F0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBiaW5kTWFwLnNldChrZXksIGJpbmRWYWx1ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgaXRlbTsgaXRlbSA9IHZhbHVlW2pdOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2JpbmRNYXBJbmRleC5oYXMoaXRlbVswXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4LnNldChpdGVtWzBdLCBuZXcgU2V0KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgZW50cmllcyA9IHRoaXMuX2JpbmRNYXBJbmRleC5nZXQoaXRlbVswXSk7XG4gICAgICAgICAgICAgICAgZW50cmllcy5hZGQoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBiaW5kTWFwO1xufTtcblxuY29uc3QgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMgPSBmdW5jdGlvbiAoc3RhcnROb2RlKSB7XG4gICAgaWYgKHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDAsIGF0dHJpYnV0ZU5vZGU7IGF0dHJpYnV0ZU5vZGUgPSBzdGFydE5vZGUuYXR0cmlidXRlc1tqXTsgaisrKSB7XG4gICAgICAgICAgICBpZiAoX0FsbG95Mi5kZWZhdWx0Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5oYXMoYXR0cmlidXRlTm9kZS5uYW1lKSkge1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVOb2RlLl9hbGxveUF0dHJpYnV0ZSA9IG5ldyAoX0FsbG95Mi5kZWZhdWx0Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5nZXQoYXR0cmlidXRlTm9kZS5uYW1lKSkoYXR0cmlidXRlTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIG5vZGU7IG5vZGUgPSBub2RlTGlzdFtpXTsgaSsrKSB7XG4gICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgbm9kZSk7XG4gICAgfVxufTtcblxuY29uc3QgX3VwZGF0ZSA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2JpbmRNYXAuaGFzKHZhcmlhYmxlTmFtZSkpIHJldHVybjtcblxuICAgIGZvciAobGV0IHZhbHVlIG9mIHRoaXMuX2JpbmRNYXAuZ2V0KHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBub2RlcyBpbiB3aGljaCB0aGUgdmFyaWFibGUgdGhhdCB0cmlnZ2VyZWQgdGhlIHVwZGF0ZSBpcyB1c2VkIGluXG4gICAgICAgIGxldCBub2RlVG9VcGRhdGUgPSB2YWx1ZVswXTsgLy8gVGhlIG5vZGUgaW4gd2hpY2ggdGhlIHZhcmlhYmxlIHRoYXQgdHJpZ2dlcmVkIHRoZSB1cGRhdGUgaXMgaW4sIHRoZSB0ZXh0IGNhbiBhbHJlYWR5IGJlIG92ZXJyaXR0ZW4gYnkgdGhlIGV2YWx1YXRpb24gb2YgZXZhbFRleHRcbiAgICAgICAgbGV0IGV2YWxUZXh0ID0gdmFsdWVbMV07IC8vIENvdWxkIGNvbnRhaW4gbXVsdGlwbGUgdmFyaWFibGVzLCBidXQgYWx3YXlzIHRoZSB2YXJpYWJsZSB0aGF0IHRyaWdnZXJlZCB0aGUgdXBkYXRlIHdoaWNoIGlzIHZhcmlhYmxlTmFtZVxuXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIG5vZGVUb1VwZGF0ZSB0byBhIG5vbiBUZXh0Tm9kZSBOb2RlXG4gICAgICAgIGxldCBodG1sTm9kZVRvVXBkYXRlO1xuICAgICAgICBpZiAobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSkge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZS5wYXJlbnRFbGVtZW50O1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIEF0dHIpIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGUub3duZXJFbGVtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChodG1sTm9kZVRvVXBkYXRlLnBhcmVudEVsZW1lbnQgPT09IG51bGwpIGNvbnRpbnVlOyAvLyBTa2lwIG5vZGVzIHRoYXQgYXJlIG5vdCBhZGRlZCB0byB0aGUgdmlzaWJsZSBkb21cblxuICAgICAgICBmb3IgKGxldCB2YXJpYWJsZXNWYXJpYWJsZU5hbWUgb2YgdmFsdWVbMl0pIHtcbiAgICAgICAgICAgIGlmICh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBfTm9kZUFycmF5Mi5kZWZhdWx0IHx8IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgZXZhbFRleHQgPSBldmFsVGV4dC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJcXFxcJHtcXFxccyp0aGlzXFxcXC5cIiArIHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSArIFwiXFxcXHMqfVwiLCBcImdcIiksIFwiXCIpOyAvLyBSZW1vdmUgYWxyZWFkeSBhcyBub2RlIGlkZW50aWZpZWQgYW5kIGV2YWx1YXRlZCB2YXJpYWJsZXMgZnJvbSBldmFsVGV4dFxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZU5hbWUgPT09IHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgX05vZGVBcnJheTIuZGVmYXVsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBub2RlID0gdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlLmFwcGVuZENoaWxkKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHtcbiAgICAgICAgICAgIGxldCBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCB2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nID0gXCJcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiBodG1sTm9kZVRvVXBkYXRlLl92YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbmZpbHRlcmVkRm9ySW5Mb29wXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlRGVjbGFyYXRpb25TdHJpbmcgKz0gXCJsZXQgXCIgKyBkZWNsYXJlZFZhcmlhYmxlTmFtZSArIFwiPVwiICsgSlNPTi5zdHJpbmdpZnkoaHRtbE5vZGVUb1VwZGF0ZS5fdmFyaWFibGVzW2RlY2xhcmVkVmFyaWFibGVOYW1lXSkgKyBcIjtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXZhbHVhdGVkID0gZXZhbCh2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nICsgXCJgXCIgKyBldmFsVGV4dCArIFwiYFwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvciwgZXZhbFRleHQsIFwib24gbm9kZVwiLCBub2RlVG9VcGRhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpIHtcbiAgICAgICAgICAgICAgICBub2RlVG9VcGRhdGUudGV4dENvbnRlbnQgPSBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVUb1VwZGF0ZS52YWx1ZSA9IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IF9pc05vZGVDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUucGFyZW50RWxlbWVudCA9PT0gdGhpcy5fcm9vdE5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChub2RlLnBhcmVudEVsZW1lbnQgPT09IG51bGwgfHwgbm9kZS5wYXJlbnRFbGVtZW50ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIF9pc05vZGVDaGlsZC5jYWxsKHRoaXMsIG5vZGUucGFyZW50RWxlbWVudCk7XG59O1xuXG5sZXQgX2luc3RhbmNlcyA9IG5ldyBNYXAoKTtcblxuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIENvbXBvbmVudCB7XG5cbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoZWxlbWVudElkKSB7XG4gICAgICAgIHJldHVybiBfaW5zdGFuY2VzLmdldChlbGVtZW50SWQpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHJvb3ROb2RlLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX3Jvb3ROb2RlID0gcm9vdE5vZGU7XG4gICAgICAgIG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPSBvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSB1bmRlZmluZWQgPyBcImF1dG9cIiA6IG9wdGlvbnMudGVtcGxhdGVNZXRob2Q7XG5cbiAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IFwiaW5saW5lXCIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSBcImNoaWxkcmVuXCIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9YSFJQcm92aWRlcjIuZGVmYXVsdC5sb2FkKG9wdGlvbnMudGVtcGxhdGUsIG51bGwsIHsgY2FjaGU6IG9wdGlvbnMuY2FjaGUsIHZlcnNpb246IG9wdGlvbnMudmVyc2lvbiB9KS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuX3Jvb3ROb2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbi5hcHBlbmRDaGlsZCh0aGlzLl9yb290Tm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IG5ldyBfTm9kZUFycmF5Mi5kZWZhdWx0KHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4uY2hpbGROb2Rlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcm9vdE5vZGUuaW5uZXJIVE1MICs9IHRlbXBsYXRlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRNYXBJbmRleCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLl9iaW5kTWFwKTtcbiAgICAgICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2hlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hlZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgX2luc3RhbmNlcy5zZXQodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLnN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIGNvbXBvbmVudCAlb1wiLCB0aGlzLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIF9kZXN0cnVjdG9yKCkge1xuICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICBpZiAodGhpcy5kZXN0cnVjdG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZEZ1bmN0aW9uXG4gICAgICAgICAgICB0aGlzLmRlc3RydWN0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkICE9PSB1bmRlZmluZWQgJiYgX2luc3RhbmNlcy5oYXModGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSkpIHtcbiAgICAgICAgICAgIF9pbnN0YW5jZXMuZGVsZXRlKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQudmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0VHJhbnNjbHVkZWRDaGlsZHJlbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW47XG4gICAgfVxuXG4gICAgYWRkVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5zZXQodmFyaWFibGVOYW1lLCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICB1cGRhdGVDYWxsYmFja3NbdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aF0gPSBjYWxsYmFjaztcblxuICAgICAgICBfYnVpbGRTZXR0ZXJWYXJpYWJsZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmVtb3ZlVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIHVwZGF0ZUNhbGxiYWNrcy5zcGxpY2UodXBkYXRlQ2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spLCAxKTtcbiAgICB9XG5cbiAgICB1cGRhdGVCaW5kaW5ncyhzdGFydE5vZGUpIHtcbiAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCBzdGFydE5vZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLl9iaW5kTWFwSW5kZXguaGFzKHN0YXJ0Tm9kZSkpIHtcblxuICAgICAgICAgICAgaWYgKCFfaXNOb2RlQ2hpbGQuY2FsbCh0aGlzLCBzdGFydE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgbm90IGEgY2hpbGQgb2YgdGhlIGNvbXBvbmVudCBhbnltb3JlLCByZW1vdmUgZnJvbSBiaW5kTWFwXG4gICAgICAgICAgICAgICAgbGV0IGJpbmRNYXBLZXlzID0gdGhpcy5fYmluZE1hcEluZGV4LmdldChzdGFydE5vZGUpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGJpbmRNYXBLZXkgb2YgYmluZE1hcEtleXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJpbmRNYXAgPSB0aGlzLl9iaW5kTWFwLmdldChiaW5kTWFwS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IGJpbmRNYXAubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiaW5kTWFwW2ldWzBdID09PSBzdGFydE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kTWFwLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwSW5kZXguZGVsZXRlKHN0YXJ0Tm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgbGV0IG5ld0JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgc3RhcnROb2RlKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIG5ld0JpbmRNYXAuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICAgICAga2V5ID0ga2V5OyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VudXNlZEFzc2lnbm1lbnQsU2lsbHlBc3NpZ25tZW50SlNcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlOyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fYmluZE1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkQmluZFZhbHVlcyA9IHRoaXMuX2JpbmRNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgICAgIG91dGVyQmluZFZhbHVlTG9vcDogZm9yIChsZXQgaiA9IDAsIG5ld0JpbmRWYWx1ZTsgbmV3QmluZFZhbHVlID0gdmFsdWVbal07IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIG9sZEJpbmRWYWx1ZTsgb2xkQmluZFZhbHVlID0gb2xkQmluZFZhbHVlc1tpXTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEJpbmRWYWx1ZSA9PT0gbmV3QmluZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyQmluZFZhbHVlTG9vcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG9sZEJpbmRWYWx1ZXNbb2xkQmluZFZhbHVlcy5sZW5ndGhdID0gbmV3QmluZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBub2RlOyBub2RlID0gbm9kZUxpc3RbaV07IGkrKykge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVCaW5kaW5ncyhub2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ29tcG9uZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vL25vaW5zcGVjdGlvbiBKU1VudXNlZExvY2FsU3ltYm9sc1xuY2xhc3MgTm9kZUFycmF5IGV4dGVuZHMgQXJyYXkge1xuICAgIGNvbnN0cnVjdG9yKG5vZGVMaXN0KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmIChub2RlTGlzdCBpbnN0YW5jZW9mIE5vZGVMaXN0IHx8IG5vZGVMaXN0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBub2RlTGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbaV0gPSBub2RlTGlzdFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNsb25lKCkge1xuICAgICAgICBsZXQgbmV3Tm9kZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbm9kZSBvZiB0aGlzKSB7XG4gICAgICAgICAgICBuZXdOb2Rlc1tuZXdOb2Rlcy5sZW5ndGhdID0gbm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IE5vZGVBcnJheShuZXdOb2Rlcyk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFycmF5OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBTdHJpbmdVdGlscyB7XG5cbiAgICBzdGF0aWMgdG9EYXNoZWQoc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMS0kMlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gU3RyaW5nVXRpbHM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9JbmRleGVkREIgPSByZXF1aXJlKFwiLi4vaW5kZXhlZC1kYi9JbmRleGVkREJcIik7XG5cbnZhciBfSW5kZXhlZERCMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0luZGV4ZWREQik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNsYXNzIENhY2hlIHtcbiAgICBzdGF0aWMgZ2V0KHVybCwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkID8gdmVyc2lvbiA6IDA7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoQ2FjaGUubWVtb3J5W3VybF0pIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKENhY2hlLm1lbW9yeVt1cmxdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENhY2hlLmluZGV4ZWREQi5nZXQodXJsLCB7IHZlcnNpb246IHZlcnNpb24gfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEuZ2V0VmFsdWVzKCkucmVzb3VyY2UpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcmV0cmlldmUgcmVzb3VyY2UgZnJvbSBJbmRleGVkREJcIiwgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgc2V0KHVybCwgZGF0YSwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiAhPT0gdW5kZWZpbmVkID8gdmVyc2lvbiA6IDA7XG4gICAgICAgIENhY2hlLm1lbW9yeVt1cmxdID0gZGF0YTtcbiAgICAgICAgQ2FjaGUuaW5kZXhlZERCLnNldCh1cmwsIGRhdGEsIHZlcnNpb24pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IENhY2hlO1xuQ2FjaGUubWVtb3J5ID0ge307XG5DYWNoZS5pbmRleGVkREIgPSBuZXcgX0luZGV4ZWREQjIuZGVmYXVsdChcImNhY2hlXCIsIDIsIFwicmVzb3VyY2VzXCIsIFtcInVybFwiLCBcInJlc291cmNlXCIsIFwidmVyc2lvblwiXSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xuXG52YXIgX0NhY2hlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NhY2hlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgREVGQVVMVF9NRVRIT0QgPSBcImdldFwiO1xuY29uc3QgREVGQVVMVF9NSU1FX1RZUEUgPSBudWxsOyAvLyBBdXRvbWF0aWNcbmNvbnN0IERFRkFVTFRfUkVTUE9OU0VfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuY29uc3QgREVGQVVMVF9DQUNIRV9TVEFURSA9IGZhbHNlO1xuXG5jbGFzcyBYSFJQcm92aWRlciB7XG5cbiAgICBzdGF0aWMgcG9zdCh1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IFwicG9zdFwiO1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgc3RhdGljIGdldCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZCh1cmwsIG51bGwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIC8vIE92ZXJ3cml0ZSB0aGlzIGFuZCBjYWxsIHN1cGVyLmxvYWQoKSBpbnNpZGVcbiAgICBzdGF0aWMgbG9hZCh1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIFhIUlByb3ZpZGVyLl9sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9sb2FkKHVybCwgZGF0YSwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICBvcHRpb25zLmNhY2hlID0gb3B0aW9ucy5jYWNoZSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jYWNoZSA6IERFRkFVTFRfQ0FDSEVfU1RBVEU7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF9DYWNoZTIuZGVmYXVsdC5nZXQodXJsLCBvcHRpb25zLnZlcnNpb24pLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBYSFJQcm92aWRlci5fZG9YSFIodXJsLCBkYXRhLCBvcHRpb25zLCBvblByb2dyZXNzKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFhIUlByb3ZpZGVyLl9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9kb1hIUih1cmwsIGRhdGEsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBvcHRpb25zLm1ldGhvZCB8fCBERUZBVUxUX01FVEhPRDtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgICAgICBsZXQgbWltZVR5cGUgPSBvcHRpb25zLm1pbWVUeXBlIHx8IERFRkFVTFRfTUlNRV9UWVBFO1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlVHlwZSA9IG9wdGlvbnMucmVzcG9uc2VUeXBlIHx8IERFRkFVTFRfUkVTUE9OU0VfVFlQRTtcblxuICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgIGlmIChtaW1lVHlwZSkgcmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKG1pbWVUeXBlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZVR5cGUpIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gcmVzcG9uc2VUeXBlO1xuICAgICAgICAgICAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcihcInByb2dyZXNzXCIsIG9uUHJvZ3Jlc3MsIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9DYWNoZTIuZGVmYXVsdC5zZXQodXJsLCB0aGlzLnJlc3BvbnNlLCBvcHRpb25zLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdCh0aGlzKTtcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBYSFJQcm92aWRlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdCA9IHJlcXVpcmUoXCIuL0luZGV4ZWREQlJlc3VsdFwiKTtcblxudmFyIF9JbmRleGVkREJSZXN1bHQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCUmVzdWx0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgQUNUSU9OUyA9IHtcbiAgICBSRUFET05MWTogXCJyZWFkb25seVwiLFxuICAgIFJFQURXUklURTogXCJyZWFkd3JpdGVcIlxufTtcblxuY2xhc3MgSW5kZXhlZERCIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZU5hbWUsIGRhdGFiYXNlVmVyc2lvbiwgc3RvcmVOYW1lLCBzdHJ1Y3R1cmUpIHtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZGF0YWJhc2VWZXJzaW9uID0gZGF0YWJhc2VWZXJzaW9uO1xuICAgICAgICB0aGlzLnN0b3JlTmFtZSA9IHN0b3JlTmFtZTtcbiAgICAgICAgdGhpcy5zdG9yZUtleSA9IHN0cnVjdHVyZVswXTtcblxuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHN0cnVjdHVyZTtcbiAgICB9XG5cbiAgICBfaW5pdCgpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIub3BlbihzY29wZS5kYXRhYmFzZU5hbWUsIHNjb3BlLmRhdGFiYXNlVmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBvblN1Y2Nlc3MgaXMgZXhlY3V0ZWQgYWZ0ZXIgb251cGdyYWRlbmVlZGVkIERPTlQgcmVzb2x2ZSBoZXJlLlxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YWJhc2UgPSBldmVudC5jdXJyZW50VGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmRlbGV0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICAgICAgICAgICAgICAgICAgICBkYXRhYmFzZS5jcmVhdGVPYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUsIHsga2V5UGF0aDogc2NvcGUuc3RvcmVLZXkgfSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZGF0YWJhc2UgPSB0aGlzLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHJpZWREZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IG9wZW4gaW5kZXhlZERCICVzIGRlbGV0aW5nIGV4aXRpbmcgZGF0YWJhc2UgYW5kIHJldHJ5aW5nLi4uXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2Uoc2NvcGUuZGF0YWJhc2VOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRyaWVkRGVsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXJyb3Igd2hpbGUgZGVsZXRpbmcgaW5kZXhlZERCICVzXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmJsb2NrZWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBkZWxldGUgaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBvcGVuIGluZGV4ZWREQiAlcyBkdWUgdG8gdGhlIG9wZXJhdGlvbiBiZWluZyBibG9ja2VkXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBzY29wZS5kYXRhYmFzZS50cmFuc2FjdGlvbihzY29wZS5zdG9yZU5hbWUsIGFjdGlvbik7XG4gICAgICAgIHJldHVybiB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUpO1xuICAgIH1cblxuICAgIF9nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShzY29wZS5fX2dldFN0b3JlKGFjdGlvbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0KHVybCwgZXF1YWxzKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURPTkxZKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBldmVudC50YXJnZXQucmVzdWx0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMgPT09IHVuZGVmaW5lZCAmJiBlcXVhbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXF1YWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVxdWFscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoa2V5KSB8fCB2YWx1ZXNba2V5XSAhPT0gZXF1YWxzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBfSW5kZXhlZERCUmVzdWx0Mi5kZWZhdWx0KHZhbHVlcykpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0KGtleSwgYXJncykge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCBkYXRhID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgcHV0RGF0YSA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IHNjb3BlLnN0cnVjdHVyZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHB1dERhdGFbc2NvcGUuc3RydWN0dXJlW2ldXSA9IGRhdGFbaV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURXUklURSkudGhlbihzdG9yZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5wdXQocHV0RGF0YSk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZSh1cmwpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLnJlbW92ZSh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEluZGV4ZWREQjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuY2xhc3MgSW5kZXhlZERCUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZXMpIHtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0VmFsdWVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXM7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSW5kZXhlZERCUmVzdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5fQWxsb3kyLmRlZmF1bHQuRGF0YUJpbmRpbmcgPSBjbGFzcyBEYXRhQmluZGluZyBleHRlbmRzIE9iamVjdCB7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXRhUHJvdmlkZXIsIHBhdGgsIGRvbnRDcmVhdGUpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl8gPSB7fTtcblxuICAgICAgICB0aGlzLl8uZGF0YVByb3ZpZGVyID0gZGF0YVByb3ZpZGVyO1xuICAgICAgICB0aGlzLl8ucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMuXy5pbnRlcnZhbEluZGV4ID0gbnVsbDtcblxuICAgICAgICBpZiAoIWRvbnRDcmVhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0UGF0aChwYXRoKSB7XG4gICAgICAgIHRoaXMuXy5wYXRoID0gcGF0aDtcbiAgICB9XG5cbiAgICBnZXRQYXRoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLnBhdGg7XG4gICAgfVxuXG4gICAgc2V0RGF0YVByb3ZpZGVyKGRhdGFQcm92aWRlcikge1xuICAgICAgICB0aGlzLl8uZGF0YVByb3ZpZGVyID0gZGF0YVByb3ZpZGVyO1xuICAgIH1cblxuICAgIGdldERhdGFQcm92aWRlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXy5kYXRhUHJvdmlkZXI7XG4gICAgfVxuXG4gICAgcGFyc2VVcGRhdGUocmVzdWx0KSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0Lmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB0aGlzW2tleV0gPSByZXN1bHRba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGJhc2VVcGRhdGUoKSB7XG4gICAgICAgIGxldCBwcm9taXNlID0gdGhpcy5fLmRhdGFQcm92aWRlci5nZXQodGhpcy5fLnBhdGgpO1xuICAgICAgICBwcm9taXNlLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VVcGRhdGUocmVzdWx0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmFzZVVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgc2V0VXBkYXRlSW50ZXJ2YWwobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgIHRoaXMuXy5pbnRlcnZhbEluZGV4ID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgICAgfSwgbWlsbGlzZWNvbmRzKTtcbiAgICB9XG5cbiAgICBjbGVhclVwZGF0ZUludGVydmFsKCkge1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuXy5pbnRlcnZhbEluZGV4KTtcbiAgICB9XG5cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IF9nZXRTY29wZVZhcmlhYmxlcyA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUuX3ZhcmlhYmxlcykge1xuICAgICAgICByZXR1cm4gbm9kZS5fdmFyaWFibGVzO1xuICAgIH0gZWxzZSBpZiAobm9kZS5fY29tcG9uZW50KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAobm9kZS5wYXJlbnRFbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBfZ2V0U2NvcGVWYXJpYWJsZXMobm9kZS5wYXJlbnRFbGVtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG5jbGFzcyBHZW5lcmljRXZlbnQgZXh0ZW5kcyBfQWxsb3kyLmRlZmF1bHQuQXR0cmlidXRlIHtcblxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZU5vZGUpIHtcbiAgICAgICAgc3VwZXIoYXR0cmlidXRlTm9kZSk7XG5cbiAgICAgICAgbGV0IGNvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50O1xuXG4gICAgICAgIGxldCB2YXJpYWJsZXMgPSBfZ2V0U2NvcGVWYXJpYWJsZXMoYXR0cmlidXRlTm9kZS5vd25lckVsZW1lbnQpO1xuXG4gICAgICAgIGxldCBvcmlnaW5hbEZ1bmN0aW9uID0gYXR0cmlidXRlTm9kZS5vd25lckVsZW1lbnQub25jbGljaztcblxuICAgICAgICBsZXQgdmFyaWFibGVOYW1lcyA9IFtcImV2ZW50XCJdO1xuICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiB2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gY2hlY2sgZm9yIGhhc093blByb3BlcnR5LCBjYXVzZSBvZiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgICAgICAgICB2YXJpYWJsZU5hbWVzW3ZhcmlhYmxlTmFtZXMubGVuZ3RoXSA9IGRlY2xhcmVkVmFyaWFibGVOYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyaWFibGVOYW1lc1t2YXJpYWJsZU5hbWVzLmxlbmd0aF0gPSBcIihcIiArIG9yaWdpbmFsRnVuY3Rpb24gKyBcIikuY2FsbCh0aGlzLCBldmVudCk7XCI7IC8vIEFkZCB0aGUgYWN0dWFsIGZ1bmN0aW9uIGJvZHkgdG8gdGhlIGZ1bmN0aW9uIGFwcGx5IGxpc3RcblxuICAgICAgICBsZXQgbmV3RnVuY3Rpb24gPSBGdW5jdGlvbi5hcHBseShudWxsLCB2YXJpYWJsZU5hbWVzKTtcblxuICAgICAgICBhdHRyaWJ1dGVOb2RlLm93bmVyRWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBsZXQgdmFyaWFibGVWYWx1ZXMgPSBbZXZlbnRdO1xuICAgICAgICAgICAgZm9yIChsZXQgZGVjbGFyZWRWYXJpYWJsZU5hbWUgaW4gdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VuZmlsdGVyZWRGb3JJbkxvb3BcbiAgICAgICAgICAgICAgICB2YXJpYWJsZVZhbHVlc1t2YXJpYWJsZVZhbHVlcy5sZW5ndGhdID0gdmFyaWFibGVzW2RlY2xhcmVkVmFyaWFibGVOYW1lXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV3RnVuY3Rpb24uYXBwbHkoY29tcG9uZW50LCB2YXJpYWJsZVZhbHVlcyk7XG4gICAgICAgIH07XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBHZW5lcmljRXZlbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNvbnN0IEZPUl9UWVBFUyA9IHtcbiAgICBPRjogXCJvZlwiLFxuICAgIElOOiBcImluXCJcbn07XG5cbmNsYXNzIEZvciBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5BdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICBzdXBlcihhdHRyaWJ1dGVOb2RlKTtcblxuICAgICAgICB0aGlzLm11bHRpcGxpZWROb2RlID0gYXR0cmlidXRlTm9kZS5vd25lckVsZW1lbnQ7XG4gICAgICAgIHRoaXMubXVsdGlwbGllZE5vZGUuYXR0cmlidXRlcy5yZW1vdmVOYW1lZEl0ZW0oXCJmb3JcIik7XG4gICAgICAgIHRoaXMucGFyZW50Tm9kZSA9IHRoaXMubXVsdGlwbGllZE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgdGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubXVsdGlwbGllZE5vZGUpO1xuXG4gICAgICAgIHRoaXMuY29tcG9uZW50LnVwZGF0ZUJpbmRpbmdzKHRoaXMubXVsdGlwbGllZE5vZGUpO1xuXG4gICAgICAgIHRoaXMuYXBwZW5kZWRDaGlsZHJlbiA9IG5ldyBNYXAoKTtcblxuICAgICAgICB0aGlzLmZvclR5cGUgPSBhdHRyaWJ1dGVOb2RlLnZhbHVlLmluZGV4T2YoXCIgaW4gXCIpICE9PSAtMSA/IEZPUl9UWVBFUy5JTiA6IEZPUl9UWVBFUy5PRjtcblxuICAgICAgICBsZXQgcGFydHMgPSBhdHRyaWJ1dGVOb2RlLnZhbHVlLnNwbGl0KFwiIFwiICsgdGhpcy5mb3JUeXBlICsgXCIgXCIpO1xuICAgICAgICB0aGlzLnRvVmFyaWFibGUgPSBwYXJ0c1swXS5zdWJzdHJpbmcocGFydHNbMF0uaW5kZXhPZihcIiBcIikgKyAxKS50cmltKCk7XG4gICAgICAgIHRoaXMuZnJvbVZhcmlhYmxlID0gcGFydHNbMV0uc3Vic3RyaW5nKHBhcnRzWzFdLmluZGV4T2YoXCIuXCIpICsgMSkudHJpbSgpO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygndGVzdCcpO1xuICAgICAgICBsZXQgZnJvbSA9IHRoaXMuY29tcG9uZW50W3RoaXMuZnJvbVZhcmlhYmxlXTtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGZyb20pIHtcbiAgICAgICAgICAgIGlmICghZnJvbS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmFwcGVuZGVkQ2hpbGRyZW4uaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3Tm9kZSA9IHRoaXMubXVsdGlwbGllZE5vZGUuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAgICAgICAgIG5ld05vZGUuX3ZhcmlhYmxlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZm9yVHlwZSA9PSBGT1JfVFlQRVMuSU4pIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5fdmFyaWFibGVzW3RoaXMudG9WYXJpYWJsZV0gPSBrZXk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5fdmFyaWFibGVzW3RoaXMudG9WYXJpYWJsZV0gPSBmcm9tW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChuZXdOb2RlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudC51cGRhdGVCaW5kaW5ncyhuZXdOb2RlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZGVkQ2hpbGRyZW4uc2V0KGtleSwgbmV3Tm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQga2V5IG9mIHRoaXMuYXBwZW5kZWRDaGlsZHJlbi5rZXlzKCkpIHtcbiAgICAgICAgICAgIGlmICghZnJvbS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5vZGVUb1JlbW92ZSA9IHRoaXMuYXBwZW5kZWRDaGlsZHJlbi5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudC51cGRhdGVCaW5kaW5ncyhub2RlVG9SZW1vdmUpO1xuICAgICAgICAgICAgICAgIG5vZGVUb1JlbW92ZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZGVkQ2hpbGRyZW4uZGVsZXRlKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn1cbl9BbGxveTIuZGVmYXVsdC5yZWdpc3RlcihGb3IpOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jb25zdCBlcnJvck1lc3NhZ2VMZW5ndGggPSA1MDtcblxuY2xhc3MgSnNvblBhcnNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG5cbiAgICBjb25zdHJ1Y3RvcihlcnJvciwganNvblN0cmluZywgLi4uZGF0YSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBsZXQgZXJyb3JQb3NpdGlvbiA9IGVycm9yLm1lc3NhZ2Uuc3BsaXQoXCIgXCIpO1xuICAgICAgICBlcnJvclBvc2l0aW9uID0gZXJyb3JQb3NpdGlvbltlcnJvclBvc2l0aW9uLmxlbmd0aCAtIDFdO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlICsgXCIgKFwiICsganNvblN0cmluZy5zdWJzdHIoTWF0aC5tYXgoZXJyb3JQb3NpdGlvbiAtIGVycm9yTWVzc2FnZUxlbmd0aCAvIDIsIDApLCBlcnJvck1lc3NhZ2VMZW5ndGgpLnRyaW0oKSArIFwiKSBcIiArIGRhdGEuam9pbihcIiBcIik7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgICAgICAgdGhpcy5uYW1lID0gZXJyb3IubmFtZTtcbiAgICB9XG5cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEpzb25QYXJzZUVycm9yOyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG52YXIgX0pzb25QYXJzZUVycm9yID0gcmVxdWlyZShcIi4vSnNvblBhcnNlRXJyb3JcIik7XG5cbnZhciBfSnNvblBhcnNlRXJyb3IyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSnNvblBhcnNlRXJyb3IpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5fQWxsb3kyLmRlZmF1bHQuSnNvblByb3ZpZGVyID0gY2xhc3MgSnNvblByb3ZpZGVyIGV4dGVuZHMgX0FsbG95Mi5kZWZhdWx0LlhIUlByb3ZpZGVyIHtcblxuICAgIHN0YXRpYyBsb2FkKHVybCwgZGF0YSwgbWV0aG9kLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzdXBlci5sb2FkKHVybCwgZGF0YSwgeyBtZXRob2Q6IG1ldGhvZCwgcmVzcG9uc2VUeXBlOiBcInRleHRcIiB9LCBvblByb2dyZXNzKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChqc29uUGFyc2VFeGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBfSnNvblBhcnNlRXJyb3IyLmRlZmF1bHQoanNvblBhcnNlRXhjZXB0aW9uLCByZXNwb25zZSwgdXJsKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uLy4uL2NvcmUvQWxsb3lcIik7XG5cbnZhciBfQWxsb3kyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQWxsb3kpO1xuXG52YXIgX1Jlc3RSZXNvdXJjZUJhc2UgPSByZXF1aXJlKFwiLi9SZXN0UmVzb3VyY2VCYXNlXCIpO1xuXG52YXIgX1Jlc3RSZXNvdXJjZUJhc2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfUmVzdFJlc291cmNlQmFzZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmxldCByZWN1cnNpdmVTZXROYW1lQW5kUGFyZW50ID0gZnVuY3Rpb24gKGl0ZW0sIG5hbWUpIHtcbiAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIF9SZXN0UmVzb3VyY2VCYXNlMi5kZWZhdWx0KSB7XG4gICAgICAgIGl0ZW0uc2V0UGFyZW50KHRoaXMpO1xuICAgICAgICBpdGVtLnNldE5hbWUobmFtZSk7XG4gICAgfSBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IGl0ZW0ubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHJlY3Vyc2l2ZVNldE5hbWVBbmRQYXJlbnQuY2FsbCh0aGlzLCBpdGVtW2ldLCBuYW1lICsgXCIvXCIgKyBpKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gaXRlbSkge1xuICAgICAgICAgICAgaWYgKCFpdGVtLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICByZWN1cnNpdmVTZXROYW1lQW5kUGFyZW50LmNhbGwodGhpcywgaXRlbVtrZXldLCBuYW1lICsgXCIvXCIgKyBrZXkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuX0FsbG95Mi5kZWZhdWx0LlJlc3RSZXNvdXJjZSA9IGNsYXNzIFJlc3RSZXNvdXJjZSBleHRlbmRzIF9SZXN0UmVzb3VyY2VCYXNlMi5kZWZhdWx0IHtcblxuICAgIGNvbnN0cnVjdG9yKHN0cnVjdHVyZSwgb3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICBsZXQgaW5zdGFuY2UgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBzdHJ1Y3R1cmUpIHtcbiAgICAgICAgICAgIGlmICghc3RydWN0dXJlLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBsZXQgaXRlbSA9IHN0cnVjdHVyZVtrZXldO1xuICAgICAgICAgICAgcmVjdXJzaXZlU2V0TmFtZUFuZFBhcmVudC5jYWxsKHRoaXMsIGl0ZW0sIGtleSk7XG4gICAgICAgICAgICBpbnN0YW5jZVtrZXldID0gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9XG5cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi8uLi9jb3JlL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IHVwZGF0ZVBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHBhcmVudCA9IHRoaXMuZ2V0UGFyZW50KCk7XG4gICAgbGV0IHBhdGggPSBcIi9cIiArIHRoaXMuZ2V0TmFtZSgpO1xuICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgcGF0aCA9IHBhcmVudC5nZXRQYXRoKCkgKyBwYXRoO1xuICAgIH1cbiAgICB0aGlzLnNldFBhdGgocGF0aCk7XG59O1xuXG5sZXQgZGVlcENsb25lID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUmVzdFJlc291cmNlQmFzZSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLmNsb25lKCk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFsdWVbaV0gPSBkZWVwQ2xvbmUodmFsdWVbaV0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgIHZhbHVlW2tleV0gPSBkZWVwQ2xvbmUodmFsdWVba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuY2xhc3MgUmVzdFJlc291cmNlQmFzZSBleHRlbmRzIF9BbGxveTIuZGVmYXVsdC5EYXRhQmluZGluZyB7XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIGxldCBkYXRhUHJvdmlkZXI7XG4gICAgICAgIGxldCBvbkVycm9yO1xuICAgICAgICBpZiAob3B0aW9ucyBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgZGF0YVByb3ZpZGVyID0gb3B0aW9ucy5kYXRhUHJvdmlkZXI7XG4gICAgICAgICAgICBvbkVycm9yID0gb3B0aW9ucy5vbkVycm9yO1xuICAgICAgICB9XG5cbiAgICAgICAgc3VwZXIoZGF0YVByb3ZpZGVyLCBcIlwiLCB0cnVlKTtcblxuICAgICAgICB0aGlzLl8ub25FcnJvciA9IG9uRXJyb3I7XG5cbiAgICAgICAgdGhpcy5fLm5hbWUgPSBcIlwiO1xuICAgICAgICB0aGlzLl8ucGFyZW50ID0gbnVsbDtcbiAgICB9XG5cbiAgICBnZXRTdHJ1Y3R1cmUoKSB7XG4gICAgICAgIC8vIFllcyB0aGVyZSBpcyBubyBzdHJ1Y3R1cmUgaW4gdGhlIGJhc2UgY2xhc3MsIGl0IGhhcyB0byBiZSBpbXBsZW1lbnRlZCBpbiB0aGUgaW1wbGVtZW50YXRpb24gY2xhc3NlcyB0aGlzIGlzIG5lZWRlZCBmb3IgdGhlIGNsb25lIG1ldGhvZFxuICAgICAgICByZXR1cm4gdGhpcy5fLnN0cnVjdHVyZTtcbiAgICB9XG5cbiAgICBnZXRPbkVycm9yKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLm9uRXJyb3I7XG4gICAgfVxuXG4gICAgc2V0T25FcnJvcihvbkVycm9yKSB7XG4gICAgICAgIHRoaXMuXy5vbkVycm9yID0gb25FcnJvcjtcbiAgICB9XG5cbiAgICBnZXROYW1lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLm5hbWU7XG4gICAgfVxuXG4gICAgc2V0TmFtZShuYW1lKSB7XG4gICAgICAgIHRoaXMuXy5uYW1lID0gbmFtZTtcblxuICAgICAgICB1cGRhdGVQYXRoLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZ2V0UGFyZW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fLnBhcmVudDtcbiAgICB9XG5cbiAgICBzZXRQYXJlbnQocGFyZW50KSB7XG4gICAgICAgIHRoaXMuXy5wYXJlbnQgPSBwYXJlbnQ7XG5cbiAgICAgICAgdGhpcy5zZXREYXRhUHJvdmlkZXIocGFyZW50LmdldERhdGFQcm92aWRlcigpKTtcblxuICAgICAgICB1cGRhdGVQYXRoLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgcGFyc2VFcnJvcnMoZXJyb3JzKSB7XG4gICAgICAgIGlmICh0aGlzLl8ub25FcnJvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl8ub25FcnJvcihlcnJvcnMpOyAvLyBEZWNpZGUgaWYgb25FcnJvciBpcyBleGVjdXRlZCBmb3IgZXZlcnkgZXJyb3IgaW4gZXJyb3JzIGFycmF5IC8gb2JqZWN0XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwYXJzZURhdGEoZGF0YSkge1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB0aGlzW2tleV0gPSBkYXRhW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwYXJzZVVwZGF0ZShyZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VEYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0LmVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnBhcnNlRXJyb3JzKHJlc3VsdC5lcnJvcnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc3VwZXIuYmFzZVVwZGF0ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcyk7XG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTsgLy8gRXZhbHVhdGUgaWYgSSBoYW5kbGUgZXJyb3JzIGhlcmUgb3Igbm90Li4uIGUuZy4gY2hlY2sganNvbmFwaS5vcmcgaWYgdGhlcmUgaXMgYSBzdGFuZGFyZC4uLiBsaWtlIG9ubHkgZ2l2ZSAyMDAgbWVzc2FnZXMgYW5kIHN0dWZmXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGxldCBjb3B5ID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5nZXRTdHJ1Y3R1cmUoKSwge1xuICAgICAgICAgICAgZGF0YVByb3ZpZGVyOiB0aGlzLmdldERhdGFQcm92aWRlcigpLFxuICAgICAgICAgICAgb25FcnJvcjogdGhpcy5nZXRPbkVycm9yKClcbiAgICAgICAgfSk7XG4gICAgICAgIGNvcHkuc2V0TmFtZSh0aGlzLmdldE5hbWUoKSk7XG5cbiAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgY29weVtrZXldID0gZGVlcENsb25lKHRoaXNba2V5XSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29weTtcbiAgICB9XG5cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IFJlc3RSZXNvdXJjZUJhc2U7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfQWxsb3kgPSByZXF1aXJlKFwiLi4vLi4vY29yZS9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfUmVzdFJlc291cmNlQmFzZSA9IHJlcXVpcmUoXCIuL1Jlc3RSZXNvdXJjZUJhc2VcIik7XG5cbnZhciBfUmVzdFJlc291cmNlQmFzZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9SZXN0UmVzb3VyY2VCYXNlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IHJlY3Vyc2l2ZVNldFBhcmVudCA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBfUmVzdFJlc291cmNlQmFzZTIuZGVmYXVsdCkge1xuICAgICAgICBpdGVtLnNldFBhcmVudCh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gaXRlbS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmVjdXJzaXZlU2V0UGFyZW50LmNhbGwodGhpcywgaXRlbVtpXSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGl0ZW0gaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIGl0ZW0pIHtcbiAgICAgICAgICAgIGlmICghaXRlbS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgcmVjdXJzaXZlU2V0UGFyZW50LmNhbGwodGhpcywgaXRlbVtrZXldKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbl9BbGxveTIuZGVmYXVsdC5SZXN0UmVzb3VyY2VMaXN0ID0gY2xhc3MgUmVzdFJlc291cmNlTGlzdCBleHRlbmRzIF9SZXN0UmVzb3VyY2VCYXNlMi5kZWZhdWx0IHtcblxuICAgIGNvbnN0cnVjdG9yKHN0cnVjdHVyZSwgb3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICB0aGlzLl8uc3RydWN0dXJlID0gc3RydWN0dXJlO1xuXG4gICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKHRoaXMpO1xuICAgIH1cblxuICAgIHBhcnNlRGF0YShkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBpbmRleDsgKGluZGV4ID0gZGF0YVtpXSkgIT09IHVuZGVmaW5lZDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tpbmRleF0gPSB0aGlzLmdldFN0cnVjdHVyZSgpLmNsb25lKCk7XG4gICAgICAgICAgICAgICAgdGhpc1tpbmRleF0uc2V0UGFyZW50KHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXNbaW5kZXhdLnNldE5hbWUoaW5kZXgpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpc1tpbmRleF0uaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlU2V0UGFyZW50LmNhbGwodGhpc1tpbmRleF0sIHRoaXNbaW5kZXhdW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmICghZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZVNldFBhcmVudC5jYWxsKHRoaXMsIGRhdGFba2V5XSk7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG59OyIsInJlcXVpcmUoXCIuL3BsdWdpbnMvZGVmYXVsdC9ldmVudHMvR2VuZXJpY0V2ZW50LmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL2RlZmF1bHQvbG9vcHMvRm9yLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL2RhdGEtYmluZGluZy9EYXRhQmluZGluZy5qc1wiKTtcclxucmVxdWlyZShcIi4vcGx1Z2lucy9qc29uLXByb3ZpZGVyL0pzb25Qcm92aWRlci5qc1wiKTtcclxucmVxdWlyZShcIi4vcGx1Z2lucy9yZXN0LWJpbmRpbmcvUmVzdFJlc291cmNlLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9wbHVnaW5zL3Jlc3QtYmluZGluZy9SZXN0UmVzb3VyY2VMaXN0LmpzXCIpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2NvcmUvQWxsb3lcIikuZGVmYXVsdDsiXX0=
