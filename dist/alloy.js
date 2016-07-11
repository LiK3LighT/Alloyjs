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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Alloy {
    static register(component) {
        if (component.__proto__ === _Component2.default) {
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
        } else if (component.__proto__ === _Attribute2.default) {
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

exports.default = Alloy;
},{"./base/Attribute":2,"./base/Component":3,"./utils/NodeArray":4,"./utils/StringUtils":5}],2:[function(require,module,exports){
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

var _XHRLoader = require("./../utils/ajax-loaders/XHRLoader");

var _XHRLoader2 = _interopRequireDefault(_XHRLoader);

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
            if (newValue instanceof Object) {
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
            if (this[variablesVariableName] instanceof NodeList || this[variablesVariableName] instanceof _NodeArray2.default || this[variablesVariableName] instanceof HTMLElement) {
                evalText = evalText.replace(new RegExp("\\${\\s*this\\." + variablesVariableName + "\\s*}", "g"), ""); // Remove already as node identified and evaluated variables from evalText
                if (variableName === variablesVariableName) {
                    if (!this._inlineAppendedChildren.has(variablesVariableName)) {
                        this._inlineAppendedChildren.set(variablesVariableName, []);
                    }
                    let appendedChildren = this._inlineAppendedChildren.get(variablesVariableName);
                    if (appendedChildren.length > 0) {
                        for (let child of appendedChildren) {
                            child.remove();
                        }
                    }
                    if (this[variablesVariableName] instanceof NodeList || this[variablesVariableName] instanceof _NodeArray2.default) {
                        for (let i = 0, length = this[variablesVariableName].length; i < length; i++) {
                            let node = this[variablesVariableName][i].cloneNode(true);
                            htmlNodeToUpdate.appendChild(node);
                            appendedChildren.push(node);
                        }
                    } else {
                        htmlNodeToUpdate.appendChild(this[variablesVariableName]);
                        appendedChildren.push(this[variablesVariableName]);
                    }
                }
            }
        }

        if (!(nodeToUpdate instanceof HTMLElement)) {
            let evaluated;
            try {
                let variableDeclarationString = "";
                for (let declaredVariableName in htmlNodeToUpdate._variables) {
                    if (!htmlNodeToUpdate._variables.hasOwnProperty(declaredVariableName)) continue;

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
                _XHRLoader2.default.load(options.template, { cache: false }).then(template => {
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
                this._transcludedChildren = this._transcludedChildren.childNodes;
                this._rootNode.innerHTML += template;
            }

            this._variableUpdateCallbacks = new Map();
            this._inlineAppendedChildren = new Map();
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
},{"../Alloy":1,"./../utils/NodeArray":4,"./../utils/ajax-loaders/XHRLoader":7}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
//noinspection JSUnusedLocalSymbols
class NodeArray extends Array {
    constructor(nodeList) {
        super();
        if (nodeList instanceof NodeList) {
            for (let i = 0, length = nodeList.length; i < length; i++) {
                this[i] = nodeList[i];
            }
        }
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
        version = version || 1;
        return new Promise((resolve, reject) => {
            if (Cache.memory[url]) {
                resolve(Cache.memory[url]);
                return;
            }

            Cache.indexedDB.get(url, { version: version }).then(data => {
                resolve(data.getValues().resource);
            }).catch(error => {
                if (error !== undefined) console.warn("Failed to retrieve resource from IndexedDB", error);

                reject();
            });
        });
    }

    static set(url, data, version) {
        version = version || 1;
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
const DEFAULT_CACHE_STATE = true;

class XHRLoader {
    static load(url, options, onProgress) {
        return new Promise((resolve, reject) => {
            if (options === undefined) options = {};

            options.cache = options.cache !== undefined ? options.cache : DEFAULT_CACHE_STATE;
            if (options.cache) {
                _Cache2.default.get(url).then(resolve).catch(function () {
                    XHRLoader._load(url, options, onProgress).then(resolve).catch(reject);
                });
            } else {
                XHRLoader._load(url, options, onProgress).then(resolve).catch(reject);
            }
        });
    }

    static _load(url, options, onProgress) {
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
                        _Cache2.default.set(url, this.response);
                    }
                    resolve(this.response);
                } else {
                    reject(this);
                }
            }, false);

            request.addEventListener("error", function () {
                reject(this);
            }, false);

            request.send();
        });
    }
}
exports.default = XHRLoader;
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

module.exports = require("./Alloy").default;
},{"./Alloy":1}]},{},[10])(10)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvQWxsb3kuanMiLCJkaXN0L3RlbXAvYmFzZS9BdHRyaWJ1dGUuanMiLCJkaXN0L3RlbXAvYmFzZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvdXRpbHMvTm9kZUFycmF5LmpzIiwiZGlzdC90ZW1wL3V0aWxzL1N0cmluZ1V0aWxzLmpzIiwiZGlzdC90ZW1wL3V0aWxzL2FqYXgtbG9hZGVycy9DYWNoZS5qcyIsImRpc3QvdGVtcC91dGlscy9hamF4LWxvYWRlcnMvWEhSTG9hZGVyLmpzIiwiZGlzdC90ZW1wL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCLmpzIiwiZGlzdC90ZW1wL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL3N0YW5kYWxvbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9Db21wb25lbnQgPSByZXF1aXJlKFwiLi9iYXNlL0NvbXBvbmVudFwiKTtcblxudmFyIF9Db21wb25lbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ29tcG9uZW50KTtcblxudmFyIF9BdHRyaWJ1dGUgPSByZXF1aXJlKFwiLi9iYXNlL0F0dHJpYnV0ZVwiKTtcblxudmFyIF9BdHRyaWJ1dGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQXR0cmlidXRlKTtcblxudmFyIF9TdHJpbmdVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzL1N0cmluZ1V0aWxzXCIpO1xuXG52YXIgX1N0cmluZ1V0aWxzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmluZ1V0aWxzKTtcblxudmFyIF9Ob2RlQXJyYXkgPSByZXF1aXJlKFwiLi91dGlscy9Ob2RlQXJyYXlcIik7XG5cbnZhciBfTm9kZUFycmF5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX05vZGVBcnJheSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNsYXNzIEFsbG95IHtcbiAgICBzdGF0aWMgcmVnaXN0ZXIoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChjb21wb25lbnQuX19wcm90b19fID09PSBfQ29tcG9uZW50Mi5kZWZhdWx0KSB7XG4gICAgICAgICAgICBsZXQgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuICAgICAgICAgICAgcHJvdG90eXBlLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQgPSBuZXcgY29tcG9uZW50KHRoaXMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHByb3RvdHlwZS5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb21wb25lbnQuX2Rlc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuX2Rlc3RydWN0b3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uIChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29tcG9uZW50LmF0dHJpYnV0ZUNoYW5nZWQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxldCBkYXNoZWROYW1lID0gX1N0cmluZ1V0aWxzMi5kZWZhdWx0LnRvRGFzaGVkKGNvbXBvbmVudC5uYW1lKTtcbiAgICAgICAgICAgIHdpbmRvd1tjb21wb25lbnQubmFtZV0gPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQoZGFzaGVkTmFtZSwgeyBwcm90b3R5cGU6IHByb3RvdHlwZSB9KTtcbiAgICAgICAgICAgIC8vQWxsb3kuX3JlZ2lzdGVyZWRDb21wb25lbnRzLmFkZChkYXNoZWROYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnQuX19wcm90b19fID09PSBfQXR0cmlidXRlMi5kZWZhdWx0KSB7XG4gICAgICAgICAgICBBbGxveS5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMuc2V0KF9TdHJpbmdVdGlsczIuZGVmYXVsdC50b0Rhc2hlZChjb21wb25lbnQubmFtZSksIGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0aWMgZ2V0KHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9XG59XG4vL0FsbG95Ll9yZWdpc3RlcmVkQ29tcG9uZW50cyA9IG5ldyBTZXQoKTtcbkFsbG95Ll9yZWdpc3RlcmVkQXR0cmlidXRlcyA9IG5ldyBNYXAoKTtcbkFsbG95LkNvbXBvbmVudCA9IF9Db21wb25lbnQyLmRlZmF1bHQ7XG5BbGxveS5BdHRyaWJ1dGUgPSBfQXR0cmlidXRlMi5kZWZhdWx0O1xuQWxsb3kuTm9kZUFycmF5ID0gX05vZGVBcnJheTIuZGVmYXVsdDtcblxuZXhwb3J0cy5kZWZhdWx0ID0gQWxsb3k7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbi8vbm9pbnNwZWN0aW9uIEpTVW51c2VkTG9jYWxTeW1ib2xzXG5jbGFzcyBBdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50O1xuICAgICAgICBsZXQgdmFyaWFibGVzID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfXFwkXSspXFxzKi9nO1xuICAgICAgICBsZXQgdmFyaWFibGVNYXRjaDtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhhdHRyaWJ1dGVOb2RlLnZhbHVlKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJpYWJsZU1hdGNoWzFdKTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmFkZFVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTWF0Y2hbMV0sIHZhcmlhYmxlTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge31cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQXR0cmlidXRlOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfWEhSTG9hZGVyID0gcmVxdWlyZShcIi4vLi4vdXRpbHMvYWpheC1sb2FkZXJzL1hIUkxvYWRlclwiKTtcblxudmFyIF9YSFJMb2FkZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfWEhSTG9hZGVyKTtcblxudmFyIF9BbGxveSA9IHJlcXVpcmUoXCIuLi9BbGxveVwiKTtcblxudmFyIF9BbGxveTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BbGxveSk7XG5cbnZhciBfTm9kZUFycmF5ID0gcmVxdWlyZShcIi4vLi4vdXRpbHMvTm9kZUFycmF5XCIpO1xuXG52YXIgX05vZGVBcnJheTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Ob2RlQXJyYXkpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBfdHJpZ2dlclVwZGF0ZUNhbGxiYWNrcyA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAodGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB1cGRhdGVDYWxsYmFja3NbaV0odmFyaWFibGVOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfdXBkYXRlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICBpZiAodGhpcy51cGRhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICB0aGlzLnVwZGF0ZSh2YXJpYWJsZU5hbWUpO1xuICAgIH1cbn07XG5cbmNvbnN0IF9idWlsZFNldHRlclZhcmlhYmxlID0gZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KHZhcmlhYmxlTmFtZSkpIHJldHVybjtcblxuICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IHRoaXNbdmFyaWFibGVOYW1lXTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdmFyaWFibGVOYW1lLCB7XG4gICAgICAgIGdldDogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBuZXdWYWx1ZSA9PiB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm94eVRlbXBsYXRlID0ge1xuICAgICAgICAgICAgICAgICAgICBnZXQ6ICh0YXJnZXQsIHByb3BlcnR5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2V0OiAodGFyZ2V0LCBwcm9wZXJ0eSwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbmV3IFByb3h5KHZhbHVlLCBwcm94eVRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXRbcHJvcGVydHldICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHJpZ2dlclVwZGF0ZUNhbGxiYWNrcy5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXcgUHJveHkobmV3VmFsdWUsIHByb3h5VGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzW1wiX19cIiArIHZhcmlhYmxlTmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBfdHJpZ2dlclVwZGF0ZUNhbGxiYWNrcy5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbmNvbnN0IF9zZXR1cE1hcHBpbmdGb3JOb2RlID0gZnVuY3Rpb24gKG5vZGUsIHRleHQsIGJpbmRNYXApIHtcbiAgICBsZXQgZXZhbE1hdGNoUmVnRXhwID0gL1xcJHsoW159XSopfS9nO1xuICAgIGxldCBhbHJlYWR5Qm91bmQgPSBuZXcgU2V0KCk7XG4gICAgbGV0IGV2YWxNYXRjaDtcbiAgICBsZXQgdmFyaWFibGVzID0gbmV3IFNldCgpO1xuICAgIHdoaWxlIChldmFsTWF0Y2ggPSBldmFsTWF0Y2hSZWdFeHAuZXhlYyh0ZXh0KSkge1xuICAgICAgICBsZXQgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfXFwkXSspXFxzKi9nO1xuICAgICAgICBsZXQgdmFyaWFibGVNYXRjaDtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhldmFsTWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuYWRkKHZhcmlhYmxlTWF0Y2hbMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFibGVOYW1lIG9mIHZhcmlhYmxlcykge1xuICAgICAgICAgICAgaWYgKCFhbHJlYWR5Qm91bmQuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBhbHJlYWR5Qm91bmQuYWRkKHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFiaW5kTWFwLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KHZhcmlhYmxlTmFtZSwgW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgYmluZEF0dHJpYnV0ZXMgPSBiaW5kTWFwLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGJpbmRBdHRyaWJ1dGVzLnB1c2goW25vZGUsIHRleHQsIHZhcmlhYmxlc10pO1xuXG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcywgdmFyaWFibGVOYW1lKSA9PT0gdW5kZWZpbmVkIHx8IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcywgdmFyaWFibGVOYW1lKS5zZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBfYnVpbGRTZXR0ZXJWYXJpYWJsZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuY29uc3QgX2J1aWxkQmluZE1hcCA9IGZ1bmN0aW9uIChzdGFydE5vZGUpIHtcbiAgICBsZXQgYmluZE1hcCA9IG5ldyBNYXAoKTtcblxuICAgIGlmIChzdGFydE5vZGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhICYmIHN0YXJ0Tm9kZS50ZXh0Q29udGVudCAhPT0gXCJcIikge1xuICAgICAgICBfc2V0dXBNYXBwaW5nRm9yTm9kZS5jYWxsKHRoaXMsIHN0YXJ0Tm9kZSwgc3RhcnROb2RlLnRleHRDb250ZW50LCBiaW5kTWFwKTtcbiAgICB9XG4gICAgaWYgKHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDAsIGF0dHJpYnV0ZU5vZGU7IGF0dHJpYnV0ZU5vZGUgPSBzdGFydE5vZGUuYXR0cmlidXRlc1tqXTsgaisrKSB7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlTm9kZS52YWx1ZSAhPSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgX3NldHVwTWFwcGluZ0Zvck5vZGUuY2FsbCh0aGlzLCBhdHRyaWJ1dGVOb2RlLCBhdHRyaWJ1dGVOb2RlLnZhbHVlLCBiaW5kTWFwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxldCBub2RlTGlzdCA9IHN0YXJ0Tm9kZS5jaGlsZE5vZGVzO1xuICAgIGZvciAobGV0IGkgPSAwLCBub2RlOyBub2RlID0gbm9kZUxpc3RbaV07IGkrKykge1xuICAgICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSkgJiYgbm9kZS5fY29tcG9uZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IFBlcmZvcm1hbmNlIGltcHJvdmVtZW50OiBTb21laG93IGNoZWNrIGlmIGl0J3MgcG9zc2libGUgYWxzbyB0byBleGNsdWRlIGZ1dHVyZSBjb21wb25lbnRzLi4uXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbmV3QmluZE1hcCA9IF9idWlsZEJpbmRNYXAuY2FsbCh0aGlzLCBub2RlKTtcbiAgICAgICAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIG5ld0JpbmRNYXAuZW50cmllcygpKSB7XG4gICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VudXNlZEFzc2lnbm1lbnQsU2lsbHlBc3NpZ25tZW50SlNcbiAgICAgICAgICAgIGtleSA9IGtleTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG4gICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VudXNlZEFzc2lnbm1lbnQsU2lsbHlBc3NpZ25tZW50SlNcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWU7IC8vIEp1c3QgZm9yIHRoZSBzaWxseSB3YXJuaW5ncy4uLlxuXG4gICAgICAgICAgICBpZiAoIWJpbmRNYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBiaW5kTWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGJpbmRWYWx1ZXMgPSBiaW5kTWFwLmdldChrZXkpO1xuICAgICAgICAgICAgICAgIGJpbmRWYWx1ZXMgPSBiaW5kVmFsdWVzLmNvbmNhdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYmluZE1hcC5zZXQoa2V5LCBiaW5kVmFsdWVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIGl0ZW07IGl0ZW0gPSB2YWx1ZVtqXTsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9iaW5kTWFwSW5kZXguaGFzKGl0ZW1bMF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRNYXBJbmRleC5zZXQoaXRlbVswXSwgbmV3IFNldCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGVudHJpZXMgPSB0aGlzLl9iaW5kTWFwSW5kZXguZ2V0KGl0ZW1bMF0pO1xuICAgICAgICAgICAgICAgIGVudHJpZXMuYWRkKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYmluZE1hcDtcbn07XG5cbmNvbnN0IF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSkge1xuICAgIGlmIChzdGFydE5vZGUuYXR0cmlidXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwLCBhdHRyaWJ1dGVOb2RlOyBhdHRyaWJ1dGVOb2RlID0gc3RhcnROb2RlLmF0dHJpYnV0ZXNbal07IGorKykge1xuICAgICAgICAgICAgaWYgKF9BbGxveTIuZGVmYXVsdC5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMuaGFzKGF0dHJpYnV0ZU5vZGUubmFtZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVOb2RlLl9hbGxveUNvbXBvbmVudCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgYXR0cmlidXRlTm9kZS5fYWxsb3lBdHRyaWJ1dGUgPSBuZXcgKF9BbGxveTIuZGVmYXVsdC5fcmVnaXN0ZXJlZEF0dHJpYnV0ZXMuZ2V0KGF0dHJpYnV0ZU5vZGUubmFtZSkpKGF0dHJpYnV0ZU5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBub2RlTGlzdCA9IHN0YXJ0Tm9kZS5jaGlsZE5vZGVzO1xuICAgIGZvciAobGV0IGkgPSAwLCBub2RlOyBub2RlID0gbm9kZUxpc3RbaV07IGkrKykge1xuICAgICAgICBfZXZhbHVhdGVBdHRyaWJ1dGVIYW5kbGVycy5jYWxsKHRoaXMsIG5vZGUpO1xuICAgIH1cbn07XG5cbmNvbnN0IF91cGRhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVOYW1lKSB7XG4gICAgaWYgKCF0aGlzLl9iaW5kTWFwLmhhcyh2YXJpYWJsZU5hbWUpKSByZXR1cm47XG5cbiAgICBmb3IgKGxldCB2YWx1ZSBvZiB0aGlzLl9iaW5kTWFwLmdldCh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgIC8vIExvb3AgdGhyb3VnaCBhbGwgbm9kZXMgaW4gd2hpY2ggdGhlIHZhcmlhYmxlIHRoYXQgdHJpZ2dlcmVkIHRoZSB1cGRhdGUgaXMgdXNlZCBpblxuICAgICAgICBsZXQgbm9kZVRvVXBkYXRlID0gdmFsdWVbMF07IC8vIFRoZSBub2RlIGluIHdoaWNoIHRoZSB2YXJpYWJsZSB0aGF0IHRyaWdnZXJlZCB0aGUgdXBkYXRlIGlzIGluLCB0aGUgdGV4dCBjYW4gYWxyZWFkeSBiZSBvdmVycml0dGVuIGJ5IHRoZSBldmFsdWF0aW9uIG9mIGV2YWxUZXh0XG4gICAgICAgIGxldCBldmFsVGV4dCA9IHZhbHVlWzFdOyAvLyBDb3VsZCBjb250YWluIG11bHRpcGxlIHZhcmlhYmxlcywgYnV0IGFsd2F5cyB0aGUgdmFyaWFibGUgdGhhdCB0cmlnZ2VyZWQgdGhlIHVwZGF0ZSB3aGljaCBpcyB2YXJpYWJsZU5hbWVcblxuICAgICAgICAvLyBDb252ZXJ0IHRoZSBub2RlVG9VcGRhdGUgdG8gYSBub24gVGV4dE5vZGUgTm9kZVxuICAgICAgICBsZXQgaHRtbE5vZGVUb1VwZGF0ZTtcbiAgICAgICAgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGUucGFyZW50RWxlbWVudDtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBBdHRyKSB7XG4gICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlID0gbm9kZVRvVXBkYXRlLm93bmVyRWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaHRtbE5vZGVUb1VwZGF0ZS5wYXJlbnRFbGVtZW50ID09PSBudWxsKSBjb250aW51ZTsgLy8gU2tpcCBub2RlcyB0aGF0IGFyZSBub3QgYWRkZWQgdG8gdGhlIHZpc2libGUgZG9tXG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFibGVzVmFyaWFibGVOYW1lIG9mIHZhbHVlWzJdKSB7XG4gICAgICAgICAgICBpZiAodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgTm9kZUxpc3QgfHwgdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgX05vZGVBcnJheTIuZGVmYXVsdCB8fCB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGV2YWxUZXh0ID0gZXZhbFRleHQucmVwbGFjZShuZXcgUmVnRXhwKFwiXFxcXCR7XFxcXHMqdGhpc1xcXFwuXCIgKyB2YXJpYWJsZXNWYXJpYWJsZU5hbWUgKyBcIlxcXFxzKn1cIiwgXCJnXCIpLCBcIlwiKTsgLy8gUmVtb3ZlIGFscmVhZHkgYXMgbm9kZSBpZGVudGlmaWVkIGFuZCBldmFsdWF0ZWQgdmFyaWFibGVzIGZyb20gZXZhbFRleHRcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGVOYW1lID09PSB2YXJpYWJsZXNWYXJpYWJsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9pbmxpbmVBcHBlbmRlZENoaWxkcmVuLmhhcyh2YXJpYWJsZXNWYXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9pbmxpbmVBcHBlbmRlZENoaWxkcmVuLnNldCh2YXJpYWJsZXNWYXJpYWJsZU5hbWUsIFtdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgYXBwZW5kZWRDaGlsZHJlbiA9IHRoaXMuX2lubGluZUFwcGVuZGVkQ2hpbGRyZW4uZ2V0KHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcHBlbmRlZENoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkIG9mIGFwcGVuZGVkQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgTm9kZUxpc3QgfHwgdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgX05vZGVBcnJheTIuZGVmYXVsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBub2RlID0gdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdW2ldLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZGVkQ2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUuYXBwZW5kQ2hpbGQodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZGVkQ2hpbGRyZW4ucHVzaCh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKSB7XG4gICAgICAgICAgICBsZXQgZXZhbHVhdGVkO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgdmFyaWFibGVEZWNsYXJhdGlvblN0cmluZyA9IFwiXCI7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZGVjbGFyZWRWYXJpYWJsZU5hbWUgaW4gaHRtbE5vZGVUb1VwZGF0ZS5fdmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaHRtbE5vZGVUb1VwZGF0ZS5fdmFyaWFibGVzLmhhc093blByb3BlcnR5KGRlY2xhcmVkVmFyaWFibGVOYW1lKSkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVEZWNsYXJhdGlvblN0cmluZyArPSBcImxldCBcIiArIGRlY2xhcmVkVmFyaWFibGVOYW1lICsgXCI9XCIgKyBKU09OLnN0cmluZ2lmeShodG1sTm9kZVRvVXBkYXRlLl92YXJpYWJsZXNbZGVjbGFyZWRWYXJpYWJsZU5hbWVdKSArIFwiO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBldmFsdWF0ZWQgPSBldmFsKHZhcmlhYmxlRGVjbGFyYXRpb25TdHJpbmcgKyBcImBcIiArIGV2YWxUZXh0ICsgXCJgXCIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yLCBldmFsVGV4dCwgXCJvbiBub2RlXCIsIG5vZGVUb1VwZGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSkge1xuICAgICAgICAgICAgICAgIG5vZGVUb1VwZGF0ZS50ZXh0Q29udGVudCA9IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVRvVXBkYXRlLnZhbHVlID0gZXZhbHVhdGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuY29uc3QgX2lzTm9kZUNoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5wYXJlbnRFbGVtZW50ID09PSB0aGlzLl9yb290Tm9kZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG5vZGUucGFyZW50RWxlbWVudCA9PT0gbnVsbCB8fCBub2RlLnBhcmVudEVsZW1lbnQgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgbm9kZS5wYXJlbnRFbGVtZW50KTtcbn07XG5cbmxldCBfaW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuXG4vL25vaW5zcGVjdGlvbiBKU1VudXNlZExvY2FsU3ltYm9sc1xuY2xhc3MgQ29tcG9uZW50IHtcblxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZShlbGVtZW50SWQpIHtcbiAgICAgICAgcmV0dXJuIF9pbnN0YW5jZXMuZ2V0KGVsZW1lbnRJZCk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Iocm9vdE5vZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fcm9vdE5vZGUgPSByb290Tm9kZTtcbiAgICAgICAgb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9IG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IHVuZGVmaW5lZCA/IFwiYXV0b1wiIDogb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZDtcblxuICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9PT0gXCJpbmxpbmVcIikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUob3B0aW9ucy50ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IFwiY2hpbGRyZW5cIikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX1hIUkxvYWRlcjIuZGVmYXVsdC5sb2FkKG9wdGlvbnMudGVtcGxhdGUsIHsgY2FjaGU6IGZhbHNlIH0pLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5fcm9vdE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuLmFwcGVuZENoaWxkKHRoaXMuX3Jvb3ROb2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuID0gdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbi5jaGlsZE5vZGVzO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Jvb3ROb2RlLmlubmVySFRNTCArPSB0ZW1wbGF0ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICB0aGlzLl9pbmxpbmVBcHBlbmRlZENoaWxkcmVuID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4ID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5fYmluZE1hcCA9IF9idWlsZEJpbmRNYXAuY2FsbCh0aGlzLCB0aGlzLl9yb290Tm9kZSk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMuX2JpbmRNYXApO1xuICAgICAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCB0aGlzLl9yb290Tm9kZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFjaGVkIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaGVkKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBfaW5zdGFuY2VzLnNldCh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkLnZhbHVlLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyb3Iuc3RhY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgY29tcG9uZW50ICVvXCIsIHRoaXMsIGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX2Rlc3RydWN0b3IoKSB7XG4gICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgIGlmICh0aGlzLmRlc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkRnVuY3Rpb25cbiAgICAgICAgICAgIHRoaXMuZGVzdHJ1Y3RvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQgIT09IHVuZGVmaW5lZCAmJiBfaW5zdGFuY2VzLmhhcyh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkLnZhbHVlKSkge1xuICAgICAgICAgICAgX2luc3RhbmNlcy5kZWxldGUodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRUcmFuc2NsdWRlZENoaWxkcmVuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbjtcbiAgICB9XG5cbiAgICBhZGRVcGRhdGVDYWxsYmFjayh2YXJpYWJsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLnNldCh2YXJpYWJsZU5hbWUsIFtdKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIHVwZGF0ZUNhbGxiYWNrc1t1cGRhdGVDYWxsYmFja3MubGVuZ3RoXSA9IGNhbGxiYWNrO1xuXG4gICAgICAgIF9idWlsZFNldHRlclZhcmlhYmxlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICB9XG5cbiAgICByZW1vdmVVcGRhdGVDYWxsYmFjayh2YXJpYWJsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGxldCB1cGRhdGVDYWxsYmFja3MgPSB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgdXBkYXRlQ2FsbGJhY2tzLnNwbGljZSh1cGRhdGVDYWxsYmFja3MuaW5kZXhPZihjYWxsYmFjayksIDEpO1xuICAgIH1cblxuICAgIHVwZGF0ZUJpbmRpbmdzKHN0YXJ0Tm9kZSkge1xuICAgICAgICBpZiAodGhpcy5fYmluZE1hcEluZGV4LmhhcyhzdGFydE5vZGUpKSB7XG5cbiAgICAgICAgICAgIGlmICghX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgICAgIC8vIElmIG5vdCBhIGNoaWxkIG9mIHRoZSBjb21wb25lbnQgYW55bW9yZSwgcmVtb3ZlIGZyb20gYmluZE1hcFxuICAgICAgICAgICAgICAgIGxldCBiaW5kTWFwS2V5cyA9IHRoaXMuX2JpbmRNYXBJbmRleC5nZXQoc3RhcnROb2RlKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBiaW5kTWFwS2V5IG9mIGJpbmRNYXBLZXlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBiaW5kTWFwID0gdGhpcy5fYmluZE1hcC5nZXQoYmluZE1hcEtleSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSBiaW5kTWFwLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmluZE1hcFtpXVswXSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZE1hcC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4LmRlbGV0ZShzdGFydE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKF9pc05vZGVDaGlsZC5jYWxsKHRoaXMsIHN0YXJ0Tm9kZSkpIHtcbiAgICAgICAgICAgIGxldCBuZXdCaW5kTWFwID0gX2J1aWxkQmluZE1hcC5jYWxsKHRoaXMsIHN0YXJ0Tm9kZSk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBuZXdCaW5kTWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkQXNzaWdubWVudCxTaWxseUFzc2lnbm1lbnRKU1xuICAgICAgICAgICAgICAgIGtleSA9IGtleTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2JpbmRNYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZEJpbmRWYWx1ZXMgPSB0aGlzLl9iaW5kTWFwLmdldChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBvdXRlckJpbmRWYWx1ZUxvb3A6IGZvciAobGV0IGogPSAwLCBuZXdCaW5kVmFsdWU7IG5ld0JpbmRWYWx1ZSA9IHZhbHVlW2pdOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBvbGRCaW5kVmFsdWU7IG9sZEJpbmRWYWx1ZSA9IG9sZEJpbmRWYWx1ZXNbaV07IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbGRCaW5kVmFsdWUgPT09IG5ld0JpbmRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBvdXRlckJpbmRWYWx1ZUxvb3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRCaW5kVmFsdWVzW29sZEJpbmRWYWx1ZXMubGVuZ3RoXSA9IG5ld0JpbmRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBub2RlTGlzdCA9IHN0YXJ0Tm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQmluZGluZ3Mobm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IENvbXBvbmVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIE5vZGVBcnJheSBleHRlbmRzIEFycmF5IHtcbiAgICBjb25zdHJ1Y3Rvcihub2RlTGlzdCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBpZiAobm9kZUxpc3QgaW5zdGFuY2VvZiBOb2RlTGlzdCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IG5vZGVMaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tpXSA9IG5vZGVMaXN0W2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gTm9kZUFycmF5OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBTdHJpbmdVdGlscyB7XG5cbiAgICBzdGF0aWMgdG9EYXNoZWQoc291cmNlKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2UucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMS0kMlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gU3RyaW5nVXRpbHM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9JbmRleGVkREIgPSByZXF1aXJlKFwiLi4vaW5kZXhlZC1kYi9JbmRleGVkREJcIik7XG5cbnZhciBfSW5kZXhlZERCMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0luZGV4ZWREQik7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNsYXNzIENhY2hlIHtcbiAgICBzdGF0aWMgZ2V0KHVybCwgdmVyc2lvbikge1xuICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiB8fCAxO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKENhY2hlLm1lbW9yeVt1cmxdKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShDYWNoZS5tZW1vcnlbdXJsXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDYWNoZS5pbmRleGVkREIuZ2V0KHVybCwgeyB2ZXJzaW9uOiB2ZXJzaW9uIH0pLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhLmdldFZhbHVlcygpLnJlc291cmNlKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT09IHVuZGVmaW5lZCkgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHJldHJpZXZlIHJlc291cmNlIGZyb20gSW5kZXhlZERCXCIsIGVycm9yKTtcblxuICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0YXRpYyBzZXQodXJsLCBkYXRhLCB2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uIHx8IDE7XG4gICAgICAgIENhY2hlLm1lbW9yeVt1cmxdID0gZGF0YTtcbiAgICAgICAgQ2FjaGUuaW5kZXhlZERCLnNldCh1cmwsIGRhdGEsIHZlcnNpb24pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IENhY2hlO1xuQ2FjaGUubWVtb3J5ID0ge307XG5DYWNoZS5pbmRleGVkREIgPSBuZXcgX0luZGV4ZWREQjIuZGVmYXVsdChcImNhY2hlXCIsIDIsIFwicmVzb3VyY2VzXCIsIFtcInVybFwiLCBcInJlc291cmNlXCIsIFwidmVyc2lvblwiXSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9DYWNoZSA9IHJlcXVpcmUoXCIuL0NhY2hlXCIpO1xuXG52YXIgX0NhY2hlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NhY2hlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgREVGQVVMVF9NRVRIT0QgPSBcImdldFwiO1xuY29uc3QgREVGQVVMVF9NSU1FX1RZUEUgPSBudWxsOyAvLyBBdXRvbWF0aWNcbmNvbnN0IERFRkFVTFRfUkVTUE9OU0VfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuY29uc3QgREVGQVVMVF9DQUNIRV9TVEFURSA9IHRydWU7XG5cbmNsYXNzIFhIUkxvYWRlciB7XG4gICAgc3RhdGljIGxvYWQodXJsLCBvcHRpb25zLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucyA9PT0gdW5kZWZpbmVkKSBvcHRpb25zID0ge307XG5cbiAgICAgICAgICAgIG9wdGlvbnMuY2FjaGUgPSBvcHRpb25zLmNhY2hlICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNhY2hlIDogREVGQVVMVF9DQUNIRV9TVEFURTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgX0NhY2hlMi5kZWZhdWx0LmdldCh1cmwpLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBYSFJMb2FkZXIuX2xvYWQodXJsLCBvcHRpb25zLCBvblByb2dyZXNzKS50aGVuKHJlc29sdmUpLmNhdGNoKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFhIUkxvYWRlci5fbG9hZCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIF9sb2FkKHVybCwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IG1ldGhvZCA9IG9wdGlvbnMubWV0aG9kIHx8IERFRkFVTFRfTUVUSE9EO1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgICAgIGxldCBtaW1lVHlwZSA9IG9wdGlvbnMubWltZVR5cGUgfHwgREVGQVVMVF9NSU1FX1RZUEU7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2VUeXBlID0gb3B0aW9ucy5yZXNwb25zZVR5cGUgfHwgREVGQVVMVF9SRVNQT05TRV9UWVBFO1xuXG4gICAgICAgICAgICBsZXQgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgaWYgKG1pbWVUeXBlKSByZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUobWltZVR5cGUpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlVHlwZSkgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSByZXNwb25zZVR5cGU7XG4gICAgICAgICAgICByZXF1ZXN0Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAob25Qcm9ncmVzcykgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwicHJvZ3Jlc3NcIiwgb25Qcm9ncmVzcywgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX0NhY2hlMi5kZWZhdWx0LnNldCh1cmwsIHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlamVjdCh0aGlzKTtcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IFhIUkxvYWRlcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdCA9IHJlcXVpcmUoXCIuL0luZGV4ZWREQlJlc3VsdFwiKTtcblxudmFyIF9JbmRleGVkREJSZXN1bHQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCUmVzdWx0KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY29uc3QgQUNUSU9OUyA9IHtcbiAgICBSRUFET05MWTogXCJyZWFkb25seVwiLFxuICAgIFJFQURXUklURTogXCJyZWFkd3JpdGVcIlxufTtcblxuY2xhc3MgSW5kZXhlZERCIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZU5hbWUsIGRhdGFiYXNlVmVyc2lvbiwgc3RvcmVOYW1lLCBzdHJ1Y3R1cmUpIHtcbiAgICAgICAgdGhpcy5kYXRhYmFzZU5hbWUgPSBkYXRhYmFzZU5hbWU7XG4gICAgICAgIHRoaXMuZGF0YWJhc2VWZXJzaW9uID0gZGF0YWJhc2VWZXJzaW9uO1xuICAgICAgICB0aGlzLnN0b3JlTmFtZSA9IHN0b3JlTmFtZTtcbiAgICAgICAgdGhpcy5zdG9yZUtleSA9IHN0cnVjdHVyZVswXTtcblxuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHN0cnVjdHVyZTtcbiAgICB9XG5cbiAgICBfaW5pdCgpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIub3BlbihzY29wZS5kYXRhYmFzZU5hbWUsIHNjb3BlLmRhdGFiYXNlVmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBvblN1Y2Nlc3MgaXMgZXhlY3V0ZWQgYWZ0ZXIgb251cGdyYWRlbmVlZGVkIERPTlQgcmVzb2x2ZSBoZXJlLlxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YWJhc2UgPSBldmVudC5jdXJyZW50VGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmRlbGV0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICAgICAgICAgICAgICAgICAgICBkYXRhYmFzZS5jcmVhdGVPYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUsIHsga2V5UGF0aDogc2NvcGUuc3RvcmVLZXkgfSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZGF0YWJhc2UgPSB0aGlzLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHJpZWREZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IG9wZW4gaW5kZXhlZERCICVzIGRlbGV0aW5nIGV4aXRpbmcgZGF0YWJhc2UgYW5kIHJldHJ5aW5nLi4uXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2Uoc2NvcGUuZGF0YWJhc2VOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRyaWVkRGVsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXJyb3Igd2hpbGUgZGVsZXRpbmcgaW5kZXhlZERCICVzXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmJsb2NrZWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBkZWxldGUgaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBvcGVuIGluZGV4ZWREQiAlcyBkdWUgdG8gdGhlIG9wZXJhdGlvbiBiZWluZyBibG9ja2VkXCIsIHNjb3BlLmRhdGFiYXNlTmFtZSwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBzY29wZS5kYXRhYmFzZS50cmFuc2FjdGlvbihzY29wZS5zdG9yZU5hbWUsIGFjdGlvbik7XG4gICAgICAgIHJldHVybiB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShzY29wZS5zdG9yZU5hbWUpO1xuICAgIH1cblxuICAgIF9nZXRTdG9yZShhY3Rpb24pIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShzY29wZS5fX2dldFN0b3JlKGFjdGlvbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY29wZS5faW5pdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0KHVybCwgZXF1YWxzKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURPTkxZKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBldmVudC50YXJnZXQucmVzdWx0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMgPT09IHVuZGVmaW5lZCAmJiBlcXVhbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXF1YWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVxdWFscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoa2V5KSB8fCB2YWx1ZXNba2V5XSAhPT0gZXF1YWxzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBfSW5kZXhlZERCUmVzdWx0Mi5kZWZhdWx0KHZhbHVlcykpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0KGtleSwgYXJncykge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCBkYXRhID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgcHV0RGF0YSA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IHNjb3BlLnN0cnVjdHVyZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHB1dERhdGFbc2NvcGUuc3RydWN0dXJlW2ldXSA9IGRhdGFbaV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShBQ1RJT05TLlJFQURXUklURSkudGhlbihzdG9yZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5wdXQocHV0RGF0YSk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZSh1cmwpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLnJlbW92ZSh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEluZGV4ZWREQjsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuY2xhc3MgSW5kZXhlZERCUmVzdWx0IHtcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZXMpIHtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0VmFsdWVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXM7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSW5kZXhlZERCUmVzdWx0OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL0FsbG95XCIpLmRlZmF1bHQ7Il19
