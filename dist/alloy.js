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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvQWxsb3kuanMiLCJkaXN0L3RlbXAvYmFzZS9BdHRyaWJ1dGUuanMiLCJkaXN0L3RlbXAvYmFzZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvdXRpbHMvTm9kZUFycmF5LmpzIiwiZGlzdC90ZW1wL3V0aWxzL1N0cmluZ1V0aWxzLmpzIiwiZGlzdC90ZW1wL3V0aWxzL2FqYXgtbG9hZGVycy9DYWNoZS5qcyIsImRpc3QvdGVtcC91dGlscy9hamF4LWxvYWRlcnMvWEhSTG9hZGVyLmpzIiwiZGlzdC90ZW1wL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCLmpzIiwiZGlzdC90ZW1wL3V0aWxzL2luZGV4ZWQtZGIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL3N0YW5kYWxvbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9Db21wb25lbnQgPSByZXF1aXJlKFwiLi9iYXNlL0NvbXBvbmVudFwiKTtcblxudmFyIF9Db21wb25lbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ29tcG9uZW50KTtcblxudmFyIF9BdHRyaWJ1dGUgPSByZXF1aXJlKFwiLi9iYXNlL0F0dHJpYnV0ZVwiKTtcblxudmFyIF9BdHRyaWJ1dGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQXR0cmlidXRlKTtcblxudmFyIF9TdHJpbmdVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzL1N0cmluZ1V0aWxzXCIpO1xuXG52YXIgX1N0cmluZ1V0aWxzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmluZ1V0aWxzKTtcblxudmFyIF9Ob2RlQXJyYXkgPSByZXF1aXJlKFwiLi91dGlscy9Ob2RlQXJyYXlcIik7XG5cbnZhciBfTm9kZUFycmF5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX05vZGVBcnJheSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmxldCBfaXNQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3RvdHlwZSkge1xuICAgIGlmIChvYmplY3QuX19wcm90b19fID09PSBwcm90b3R5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChvYmplY3QuX19wcm90b19fICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIF9pc1Byb3RvdHlwZU9mKG9iamVjdC5fX3Byb3RvX18sIHByb3RvdHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmNsYXNzIEFsbG95IHtcbiAgICBzdGF0aWMgcmVnaXN0ZXIoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChfaXNQcm90b3R5cGVPZihjb21wb25lbnQsIF9Db21wb25lbnQyLmRlZmF1bHQpKSB7XG4gICAgICAgICAgICBsZXQgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuICAgICAgICAgICAgcHJvdG90eXBlLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQgPSBuZXcgY29tcG9uZW50KHRoaXMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHByb3RvdHlwZS5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jb21wb25lbnQuX2Rlc3RydWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuX2Rlc3RydWN0b3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uIChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29tcG9uZW50LmF0dHJpYnV0ZUNoYW5nZWQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxldCBkYXNoZWROYW1lID0gX1N0cmluZ1V0aWxzMi5kZWZhdWx0LnRvRGFzaGVkKGNvbXBvbmVudC5uYW1lKTtcbiAgICAgICAgICAgIHdpbmRvd1tjb21wb25lbnQubmFtZV0gPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQoZGFzaGVkTmFtZSwgeyBwcm90b3R5cGU6IHByb3RvdHlwZSB9KTtcbiAgICAgICAgICAgIC8vQWxsb3kuX3JlZ2lzdGVyZWRDb21wb25lbnRzLmFkZChkYXNoZWROYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChfaXNQcm90b3R5cGVPZihjb21wb25lbnQsIF9BdHRyaWJ1dGUyLmRlZmF1bHQpKSB7XG4gICAgICAgICAgICAgICAgQWxsb3kuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLnNldChfU3RyaW5nVXRpbHMyLmRlZmF1bHQudG9EYXNoZWQoY29tcG9uZW50Lm5hbWUpLCBjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXRpYyBnZXQoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIH1cbn1cbi8vQWxsb3kuX3JlZ2lzdGVyZWRDb21wb25lbnRzID0gbmV3IFNldCgpO1xuQWxsb3kuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzID0gbmV3IE1hcCgpO1xuQWxsb3kuQ29tcG9uZW50ID0gX0NvbXBvbmVudDIuZGVmYXVsdDtcbkFsbG95LkF0dHJpYnV0ZSA9IF9BdHRyaWJ1dGUyLmRlZmF1bHQ7XG5BbGxveS5Ob2RlQXJyYXkgPSBfTm9kZUFycmF5Mi5kZWZhdWx0O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBBbGxveTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIEF0dHJpYnV0ZSB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVOb2RlKSB7XG4gICAgICAgIHRoaXMuY29tcG9uZW50ID0gYXR0cmlidXRlTm9kZS5fYWxsb3lDb21wb25lbnQ7XG4gICAgICAgIGxldCB2YXJpYWJsZXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIGxldCB2YXJpYWJsZXNSZWdFeHAgPSAvXFxzKnRoaXNcXC4oW2EtekEtWjAtOV9cXCRdKylcXHMqL2c7XG4gICAgICAgIGxldCB2YXJpYWJsZU1hdGNoO1xuICAgICAgICB3aGlsZSAodmFyaWFibGVNYXRjaCA9IHZhcmlhYmxlc1JlZ0V4cC5leGVjKGF0dHJpYnV0ZU5vZGUudmFsdWUpKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuYWRkKHZhcmlhYmxlTWF0Y2hbMV0pO1xuICAgICAgICAgICAgdGhpcy5jb21wb25lbnQuYWRkVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVNYXRjaFsxXSwgdmFyaWFibGVOYW1lID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7fVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBBdHRyaWJ1dGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9YSFJMb2FkZXIgPSByZXF1aXJlKFwiLi8uLi91dGlscy9hamF4LWxvYWRlcnMvWEhSTG9hZGVyXCIpO1xuXG52YXIgX1hIUkxvYWRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9YSFJMb2FkZXIpO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxudmFyIF9Ob2RlQXJyYXkgPSByZXF1aXJlKFwiLi8uLi91dGlscy9Ob2RlQXJyYXlcIik7XG5cbnZhciBfTm9kZUFycmF5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX05vZGVBcnJheSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmNvbnN0IF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzID0gZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSkge1xuICAgIGlmICh0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW5ndGggPSB1cGRhdGVDYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHVwZGF0ZUNhbGxiYWNrc1tpXSh2YXJpYWJsZU5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF91cGRhdGUuY2FsbCh0aGlzLCB2YXJpYWJsZU5hbWUpO1xuICAgIGlmICh0aGlzLnVwZGF0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHRoaXMudXBkYXRlKHZhcmlhYmxlTmFtZSk7XG4gICAgfVxufTtcblxuY29uc3QgX2J1aWxkU2V0dGVyVmFyaWFibGUgPSBmdW5jdGlvbiAodmFyaWFibGVOYW1lKSB7XG4gICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkodmFyaWFibGVOYW1lKSkgcmV0dXJuO1xuXG4gICAgdGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdID0gdGhpc1t2YXJpYWJsZU5hbWVdO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCB2YXJpYWJsZU5hbWUsIHtcbiAgICAgICAgZ2V0OiAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IG5ld1ZhbHVlID0+IHtcbiAgICAgICAgICAgIGlmIChuZXdWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3h5VGVtcGxhdGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogKHRhcmdldCwgcHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6ICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBuZXcgUHJveHkodmFsdWUsIHByb3h5VGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldFtwcm9wZXJ0eV0gIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZSA9IG5ldyBQcm94eShuZXdWYWx1ZSwgcHJveHlUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIF90cmlnZ2VyVXBkYXRlQ2FsbGJhY2tzLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuY29uc3QgX3NldHVwTWFwcGluZ0Zvck5vZGUgPSBmdW5jdGlvbiAobm9kZSwgdGV4dCwgYmluZE1hcCkge1xuICAgIGxldCBldmFsTWF0Y2hSZWdFeHAgPSAvXFwkeyhbXn1dKil9L2c7XG4gICAgbGV0IGFscmVhZHlCb3VuZCA9IG5ldyBTZXQoKTtcbiAgICBsZXQgZXZhbE1hdGNoO1xuICAgIGxldCB2YXJpYWJsZXMgPSBuZXcgU2V0KCk7XG4gICAgd2hpbGUgKGV2YWxNYXRjaCA9IGV2YWxNYXRjaFJlZ0V4cC5leGVjKHRleHQpKSB7XG4gICAgICAgIGxldCB2YXJpYWJsZXNSZWdFeHAgPSAvXFxzKnRoaXNcXC4oW2EtekEtWjAtOV9cXCRdKylcXHMqL2c7XG4gICAgICAgIGxldCB2YXJpYWJsZU1hdGNoO1xuICAgICAgICB3aGlsZSAodmFyaWFibGVNYXRjaCA9IHZhcmlhYmxlc1JlZ0V4cC5leGVjKGV2YWxNYXRjaFsxXSkpIHtcbiAgICAgICAgICAgIHZhcmlhYmxlcy5hZGQodmFyaWFibGVNYXRjaFsxXSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCB2YXJpYWJsZU5hbWUgb2YgdmFyaWFibGVzKSB7XG4gICAgICAgICAgICBpZiAoIWFscmVhZHlCb3VuZC5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgIGFscmVhZHlCb3VuZC5hZGQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoIWJpbmRNYXAuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluZE1hcC5zZXQodmFyaWFibGVOYW1lLCBbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBiaW5kQXR0cmlidXRlcyA9IGJpbmRNYXAuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgYmluZEF0dHJpYnV0ZXMucHVzaChbbm9kZSwgdGV4dCwgdmFyaWFibGVzXSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLCB2YXJpYWJsZU5hbWUpID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLCB2YXJpYWJsZU5hbWUpLnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIF9idWlsZFNldHRlclZhcmlhYmxlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5jb25zdCBfYnVpbGRCaW5kTWFwID0gZnVuY3Rpb24gKHN0YXJ0Tm9kZSkge1xuICAgIGxldCBiaW5kTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgaWYgKHN0YXJ0Tm9kZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEgJiYgc3RhcnROb2RlLnRleHRDb250ZW50ICE9PSBcIlwiKSB7XG4gICAgICAgIF9zZXR1cE1hcHBpbmdGb3JOb2RlLmNhbGwodGhpcywgc3RhcnROb2RlLCBzdGFydE5vZGUudGV4dENvbnRlbnQsIGJpbmRNYXApO1xuICAgIH1cbiAgICBpZiAoc3RhcnROb2RlLmF0dHJpYnV0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgYXR0cmlidXRlTm9kZTsgYXR0cmlidXRlTm9kZSA9IHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzW2pdOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVOb2RlLnZhbHVlICE9IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBfc2V0dXBNYXBwaW5nRm9yTm9kZS5jYWxsKHRoaXMsIGF0dHJpYnV0ZU5vZGUsIGF0dHJpYnV0ZU5vZGUudmFsdWUsIGJpbmRNYXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIG5vZGU7IG5vZGUgPSBub2RlTGlzdFtpXTsgaSsrKSB7XG4gICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhKSAmJiBub2RlLl9jb21wb25lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gVE9ETzogUGVyZm9ybWFuY2UgaW1wcm92ZW1lbnQ6IFNvbWVob3cgY2hlY2sgaWYgaXQncyBwb3NzaWJsZSBhbHNvIHRvIGV4Y2x1ZGUgZnV0dXJlIGNvbXBvbmVudHMuLi5cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXdCaW5kTWFwID0gX2J1aWxkQmluZE1hcC5jYWxsKHRoaXMsIG5vZGUpO1xuICAgICAgICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgbmV3QmluZE1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkQXNzaWdubWVudCxTaWxseUFzc2lnbm1lbnRKU1xuICAgICAgICAgICAga2V5ID0ga2V5OyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW51c2VkQXNzaWdubWVudCxTaWxseUFzc2lnbm1lbnRKU1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZTsgLy8gSnVzdCBmb3IgdGhlIHNpbGx5IHdhcm5pbmdzLi4uXG5cbiAgICAgICAgICAgIGlmICghYmluZE1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgYmluZFZhbHVlcyA9IGJpbmRNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgYmluZFZhbHVlcyA9IGJpbmRWYWx1ZXMuY29uY2F0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBiaW5kTWFwLnNldChrZXksIGJpbmRWYWx1ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgaXRlbTsgaXRlbSA9IHZhbHVlW2pdOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2JpbmRNYXBJbmRleC5oYXMoaXRlbVswXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYmluZE1hcEluZGV4LnNldChpdGVtWzBdLCBuZXcgU2V0KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgZW50cmllcyA9IHRoaXMuX2JpbmRNYXBJbmRleC5nZXQoaXRlbVswXSk7XG4gICAgICAgICAgICAgICAgZW50cmllcy5hZGQoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBiaW5kTWFwO1xufTtcblxuY29uc3QgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMgPSBmdW5jdGlvbiAoc3RhcnROb2RlKSB7XG4gICAgaWYgKHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDAsIGF0dHJpYnV0ZU5vZGU7IGF0dHJpYnV0ZU5vZGUgPSBzdGFydE5vZGUuYXR0cmlidXRlc1tqXTsgaisrKSB7XG4gICAgICAgICAgICBpZiAoX0FsbG95Mi5kZWZhdWx0Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5oYXMoYXR0cmlidXRlTm9kZS5uYW1lKSkge1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50ID0gdGhpcztcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVOb2RlLl9hbGxveUF0dHJpYnV0ZSA9IG5ldyAoX0FsbG95Mi5kZWZhdWx0Ll9yZWdpc3RlcmVkQXR0cmlidXRlcy5nZXQoYXR0cmlidXRlTm9kZS5uYW1lKSkoYXR0cmlidXRlTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChsZXQgaSA9IDAsIG5vZGU7IG5vZGUgPSBub2RlTGlzdFtpXTsgaSsrKSB7XG4gICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgbm9kZSk7XG4gICAgfVxufTtcblxuY29uc3QgX3VwZGF0ZSA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2JpbmRNYXAuaGFzKHZhcmlhYmxlTmFtZSkpIHJldHVybjtcblxuICAgIGZvciAobGV0IHZhbHVlIG9mIHRoaXMuX2JpbmRNYXAuZ2V0KHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBub2RlcyBpbiB3aGljaCB0aGUgdmFyaWFibGUgdGhhdCB0cmlnZ2VyZWQgdGhlIHVwZGF0ZSBpcyB1c2VkIGluXG4gICAgICAgIGxldCBub2RlVG9VcGRhdGUgPSB2YWx1ZVswXTsgLy8gVGhlIG5vZGUgaW4gd2hpY2ggdGhlIHZhcmlhYmxlIHRoYXQgdHJpZ2dlcmVkIHRoZSB1cGRhdGUgaXMgaW4sIHRoZSB0ZXh0IGNhbiBhbHJlYWR5IGJlIG92ZXJyaXR0ZW4gYnkgdGhlIGV2YWx1YXRpb24gb2YgZXZhbFRleHRcbiAgICAgICAgbGV0IGV2YWxUZXh0ID0gdmFsdWVbMV07IC8vIENvdWxkIGNvbnRhaW4gbXVsdGlwbGUgdmFyaWFibGVzLCBidXQgYWx3YXlzIHRoZSB2YXJpYWJsZSB0aGF0IHRyaWdnZXJlZCB0aGUgdXBkYXRlIHdoaWNoIGlzIHZhcmlhYmxlTmFtZVxuXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIG5vZGVUb1VwZGF0ZSB0byBhIG5vbiBUZXh0Tm9kZSBOb2RlXG4gICAgICAgIGxldCBodG1sTm9kZVRvVXBkYXRlO1xuICAgICAgICBpZiAobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSkge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZS5wYXJlbnRFbGVtZW50O1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIEF0dHIpIHtcbiAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUgPSBub2RlVG9VcGRhdGUub3duZXJFbGVtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZSA9IG5vZGVUb1VwZGF0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChodG1sTm9kZVRvVXBkYXRlLnBhcmVudEVsZW1lbnQgPT09IG51bGwpIGNvbnRpbnVlOyAvLyBTa2lwIG5vZGVzIHRoYXQgYXJlIG5vdCBhZGRlZCB0byB0aGUgdmlzaWJsZSBkb21cblxuICAgICAgICBmb3IgKGxldCB2YXJpYWJsZXNWYXJpYWJsZU5hbWUgb2YgdmFsdWVbMl0pIHtcbiAgICAgICAgICAgIGlmICh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBOb2RlTGlzdCB8fCB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBfTm9kZUFycmF5Mi5kZWZhdWx0IHx8IHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgZXZhbFRleHQgPSBldmFsVGV4dC5yZXBsYWNlKG5ldyBSZWdFeHAoXCJcXFxcJHtcXFxccyp0aGlzXFxcXC5cIiArIHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSArIFwiXFxcXHMqfVwiLCBcImdcIiksIFwiXCIpOyAvLyBSZW1vdmUgYWxyZWFkeSBhcyBub2RlIGlkZW50aWZpZWQgYW5kIGV2YWx1YXRlZCB2YXJpYWJsZXMgZnJvbSBldmFsVGV4dFxuICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZU5hbWUgPT09IHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2lubGluZUFwcGVuZGVkQ2hpbGRyZW4uaGFzKHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2lubGluZUFwcGVuZGVkQ2hpbGRyZW4uc2V0KHZhcmlhYmxlc1ZhcmlhYmxlTmFtZSwgW10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBhcHBlbmRlZENoaWxkcmVuID0gdGhpcy5faW5saW5lQXBwZW5kZWRDaGlsZHJlbi5nZXQodmFyaWFibGVzVmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcGVuZGVkQ2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2hpbGQgb2YgYXBwZW5kZWRDaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBOb2RlTGlzdCB8fCB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0gaW5zdGFuY2VvZiBfTm9kZUFycmF5Mi5kZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5vZGUgPSB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV1baV0uY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kZWRDaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZS5hcHBlbmRDaGlsZCh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kZWRDaGlsZHJlbi5wdXNoKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHtcbiAgICAgICAgICAgIGxldCBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCB2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nID0gXCJcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBkZWNsYXJlZFZhcmlhYmxlTmFtZSBpbiBodG1sTm9kZVRvVXBkYXRlLl92YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBjaGVjayBmb3IgaGFzT3duUHJvcGVydHksIGNhdXNlIG9mIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbmZpbHRlcmVkRm9ySW5Mb29wXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlRGVjbGFyYXRpb25TdHJpbmcgKz0gXCJsZXQgXCIgKyBkZWNsYXJlZFZhcmlhYmxlTmFtZSArIFwiPVwiICsgSlNPTi5zdHJpbmdpZnkoaHRtbE5vZGVUb1VwZGF0ZS5fdmFyaWFibGVzW2RlY2xhcmVkVmFyaWFibGVOYW1lXSkgKyBcIjtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXZhbHVhdGVkID0gZXZhbCh2YXJpYWJsZURlY2xhcmF0aW9uU3RyaW5nICsgXCJgXCIgKyBldmFsVGV4dCArIFwiYFwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvciwgZXZhbFRleHQsIFwib24gbm9kZVwiLCBub2RlVG9VcGRhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpIHtcbiAgICAgICAgICAgICAgICBub2RlVG9VcGRhdGUudGV4dENvbnRlbnQgPSBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVUb1VwZGF0ZS52YWx1ZSA9IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IF9pc05vZGVDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgaWYgKG5vZGUucGFyZW50RWxlbWVudCA9PT0gdGhpcy5fcm9vdE5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChub2RlLnBhcmVudEVsZW1lbnQgPT09IG51bGwgfHwgbm9kZS5wYXJlbnRFbGVtZW50ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIF9pc05vZGVDaGlsZC5jYWxsKHRoaXMsIG5vZGUucGFyZW50RWxlbWVudCk7XG59O1xuXG5sZXQgX2luc3RhbmNlcyA9IG5ldyBNYXAoKTtcblxuLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRMb2NhbFN5bWJvbHNcbmNsYXNzIENvbXBvbmVudCB7XG5cbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoZWxlbWVudElkKSB7XG4gICAgICAgIHJldHVybiBfaW5zdGFuY2VzLmdldChlbGVtZW50SWQpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHJvb3ROb2RlLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX3Jvb3ROb2RlID0gcm9vdE5vZGU7XG4gICAgICAgIG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPSBvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSB1bmRlZmluZWQgPyBcImF1dG9cIiA6IG9wdGlvbnMudGVtcGxhdGVNZXRob2Q7XG5cbiAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMudGVtcGxhdGVNZXRob2QgPT09IFwiaW5saW5lXCIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG9wdGlvbnMudGVtcGxhdGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSBcImNoaWxkcmVuXCIpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9YSFJMb2FkZXIyLmRlZmF1bHQubG9hZChvcHRpb25zLnRlbXBsYXRlLCB7IGNhY2hlOiBmYWxzZSB9KS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuX3Jvb3ROb2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbi5hcHBlbmRDaGlsZCh0aGlzLl9yb290Tm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4uY2hpbGROb2RlcztcbiAgICAgICAgICAgICAgICB0aGlzLl9yb290Tm9kZS5pbm5lckhUTUwgKz0gdGVtcGxhdGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5faW5saW5lQXBwZW5kZWRDaGlsZHJlbiA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRNYXBJbmRleCA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLl9iaW5kTWFwKTtcbiAgICAgICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2hlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hlZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgX2luc3RhbmNlcy5zZXQodGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLnN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIGNvbXBvbmVudCAlb1wiLCB0aGlzLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIF9kZXN0cnVjdG9yKCkge1xuICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICBpZiAodGhpcy5kZXN0cnVjdG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZEZ1bmN0aW9uXG4gICAgICAgICAgICB0aGlzLmRlc3RydWN0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9yb290Tm9kZS5hdHRyaWJ1dGVzLmlkICE9PSB1bmRlZmluZWQgJiYgX2luc3RhbmNlcy5oYXModGhpcy5fcm9vdE5vZGUuYXR0cmlidXRlcy5pZC52YWx1ZSkpIHtcbiAgICAgICAgICAgIF9pbnN0YW5jZXMuZGVsZXRlKHRoaXMuX3Jvb3ROb2RlLmF0dHJpYnV0ZXMuaWQudmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0VHJhbnNjbHVkZWRDaGlsZHJlbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW47XG4gICAgfVxuXG4gICAgYWRkVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5zZXQodmFyaWFibGVOYW1lLCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICB1cGRhdGVDYWxsYmFja3NbdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aF0gPSBjYWxsYmFjaztcblxuICAgICAgICBfYnVpbGRTZXR0ZXJWYXJpYWJsZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgfVxuXG4gICAgcmVtb3ZlVXBkYXRlQ2FsbGJhY2sodmFyaWFibGVOYW1lLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIHVwZGF0ZUNhbGxiYWNrcy5zcGxpY2UodXBkYXRlQ2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spLCAxKTtcbiAgICB9XG5cbiAgICB1cGRhdGVCaW5kaW5ncyhzdGFydE5vZGUpIHtcbiAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCBzdGFydE5vZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLl9iaW5kTWFwSW5kZXguaGFzKHN0YXJ0Tm9kZSkpIHtcblxuICAgICAgICAgICAgaWYgKCFfaXNOb2RlQ2hpbGQuY2FsbCh0aGlzLCBzdGFydE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgbm90IGEgY2hpbGQgb2YgdGhlIGNvbXBvbmVudCBhbnltb3JlLCByZW1vdmUgZnJvbSBiaW5kTWFwXG4gICAgICAgICAgICAgICAgbGV0IGJpbmRNYXBLZXlzID0gdGhpcy5fYmluZE1hcEluZGV4LmdldChzdGFydE5vZGUpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGJpbmRNYXBLZXkgb2YgYmluZE1hcEtleXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJpbmRNYXAgPSB0aGlzLl9iaW5kTWFwLmdldChiaW5kTWFwS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aCA9IGJpbmRNYXAubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiaW5kTWFwW2ldWzBdID09PSBzdGFydE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kTWFwLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwSW5kZXguZGVsZXRlKHN0YXJ0Tm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoX2lzTm9kZUNoaWxkLmNhbGwodGhpcywgc3RhcnROb2RlKSkge1xuICAgICAgICAgICAgbGV0IG5ld0JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgc3RhcnROb2RlKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIG5ld0JpbmRNYXAuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50LFNpbGx5QXNzaWdubWVudEpTXG4gICAgICAgICAgICAgICAga2V5ID0ga2V5OyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cbiAgICAgICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VudXNlZEFzc2lnbm1lbnQsU2lsbHlBc3NpZ25tZW50SlNcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlOyAvLyBKdXN0IGZvciB0aGUgc2lsbHkgd2FybmluZ3MuLi5cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fYmluZE1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9iaW5kTWFwLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkQmluZFZhbHVlcyA9IHRoaXMuX2JpbmRNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgICAgIG91dGVyQmluZFZhbHVlTG9vcDogZm9yIChsZXQgaiA9IDAsIG5ld0JpbmRWYWx1ZTsgbmV3QmluZFZhbHVlID0gdmFsdWVbal07IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIG9sZEJpbmRWYWx1ZTsgb2xkQmluZFZhbHVlID0gb2xkQmluZFZhbHVlc1tpXTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEJpbmRWYWx1ZSA9PT0gbmV3QmluZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyQmluZFZhbHVlTG9vcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG9sZEJpbmRWYWx1ZXNbb2xkQmluZFZhbHVlcy5sZW5ndGhdID0gbmV3QmluZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5vZGVMaXN0ID0gc3RhcnROb2RlLmNoaWxkTm9kZXM7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBub2RlOyBub2RlID0gbm9kZUxpc3RbaV07IGkrKykge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVCaW5kaW5ncyhub2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ29tcG9uZW50OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vL25vaW5zcGVjdGlvbiBKU1VudXNlZExvY2FsU3ltYm9sc1xuY2xhc3MgTm9kZUFycmF5IGV4dGVuZHMgQXJyYXkge1xuICAgIGNvbnN0cnVjdG9yKG5vZGVMaXN0KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmIChub2RlTGlzdCBpbnN0YW5jZW9mIE5vZGVMaXN0KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gbm9kZUxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW2ldID0gbm9kZUxpc3RbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBOb2RlQXJyYXk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmNsYXNzIFN0cmluZ1V0aWxzIHtcblxuICAgIHN0YXRpYyB0b0Rhc2hlZChzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCBcIiQxLSQyXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBTdHJpbmdVdGlsczsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0luZGV4ZWREQiA9IHJlcXVpcmUoXCIuLi9pbmRleGVkLWRiL0luZGV4ZWREQlwiKTtcblxudmFyIF9JbmRleGVkREIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY2xhc3MgQ2FjaGUge1xuICAgIHN0YXRpYyBnZXQodXJsLCB2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uIHx8IDE7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoQ2FjaGUubWVtb3J5W3VybF0pIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKENhY2hlLm1lbW9yeVt1cmxdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENhY2hlLmluZGV4ZWREQi5nZXQodXJsLCB7IHZlcnNpb246IHZlcnNpb24gfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEuZ2V0VmFsdWVzKCkucmVzb3VyY2UpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcmV0cmlldmUgcmVzb3VyY2UgZnJvbSBJbmRleGVkREJcIiwgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHNldCh1cmwsIGRhdGEsIHZlcnNpb24pIHtcbiAgICAgICAgdmVyc2lvbiA9IHZlcnNpb24gfHwgMTtcbiAgICAgICAgQ2FjaGUubWVtb3J5W3VybF0gPSBkYXRhO1xuICAgICAgICBDYWNoZS5pbmRleGVkREIuc2V0KHVybCwgZGF0YSwgdmVyc2lvbik7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ2FjaGU7XG5DYWNoZS5tZW1vcnkgPSB7fTtcbkNhY2hlLmluZGV4ZWREQiA9IG5ldyBfSW5kZXhlZERCMi5kZWZhdWx0KFwiY2FjaGVcIiwgMiwgXCJyZXNvdXJjZXNcIiwgW1widXJsXCIsIFwicmVzb3VyY2VcIiwgXCJ2ZXJzaW9uXCJdKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0NhY2hlID0gcmVxdWlyZShcIi4vQ2FjaGVcIik7XG5cbnZhciBfQ2FjaGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2FjaGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBERUZBVUxUX01FVEhPRCA9IFwiZ2V0XCI7XG5jb25zdCBERUZBVUxUX01JTUVfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuY29uc3QgREVGQVVMVF9SRVNQT05TRV9UWVBFID0gbnVsbDsgLy8gQXV0b21hdGljXG5jb25zdCBERUZBVUxUX0NBQ0hFX1NUQVRFID0gdHJ1ZTtcblxuY2xhc3MgWEhSTG9hZGVyIHtcbiAgICBzdGF0aWMgbG9hZCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zID09PSB1bmRlZmluZWQpIG9wdGlvbnMgPSB7fTtcblxuICAgICAgICAgICAgb3B0aW9ucy5jYWNoZSA9IG9wdGlvbnMuY2FjaGUgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2FjaGUgOiBERUZBVUxUX0NBQ0hFX1NUQVRFO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBfQ2FjaGUyLmRlZmF1bHQuZ2V0KHVybCkudGhlbihyZXNvbHZlKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIFhIUkxvYWRlci5fbG9hZCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgWEhSTG9hZGVyLl9sb2FkKHVybCwgb3B0aW9ucywgb25Qcm9ncmVzcykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX2xvYWQodXJsLCBvcHRpb25zLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgbWV0aG9kID0gb3B0aW9ucy5tZXRob2QgfHwgREVGQVVMVF9NRVRIT0Q7XG4gICAgICAgICAgICAvL25vaW5zcGVjdGlvbiBKU1VucmVzb2x2ZWRWYXJpYWJsZVxuICAgICAgICAgICAgbGV0IG1pbWVUeXBlID0gb3B0aW9ucy5taW1lVHlwZSB8fCBERUZBVUxUX01JTUVfVFlQRTtcbiAgICAgICAgICAgIGxldCByZXNwb25zZVR5cGUgPSBvcHRpb25zLnJlc3BvbnNlVHlwZSB8fCBERUZBVUxUX1JFU1BPTlNFX1RZUEU7XG5cbiAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICBpZiAobWltZVR5cGUpIHJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZShtaW1lVHlwZSk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2VUeXBlKSByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IHJlc3BvbnNlVHlwZTtcbiAgICAgICAgICAgIHJlcXVlc3Qub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGlmIChvblByb2dyZXNzKSByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJwcm9ncmVzc1wiLCBvblByb2dyZXNzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfQ2FjaGUyLmRlZmF1bHQuc2V0KHVybCwgdGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gWEhSTG9hZGVyOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfSW5kZXhlZERCUmVzdWx0ID0gcmVxdWlyZShcIi4vSW5kZXhlZERCUmVzdWx0XCIpO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JbmRleGVkREJSZXN1bHQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jb25zdCBBQ1RJT05TID0ge1xuICAgIFJFQURPTkxZOiBcInJlYWRvbmx5XCIsXG4gICAgUkVBRFdSSVRFOiBcInJlYWR3cml0ZVwiXG59O1xuXG5jbGFzcyBJbmRleGVkREIge1xuICAgIGNvbnN0cnVjdG9yKGRhdGFiYXNlTmFtZSwgZGF0YWJhc2VWZXJzaW9uLCBzdG9yZU5hbWUsIHN0cnVjdHVyZSkge1xuICAgICAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRhdGFiYXNlTmFtZTtcbiAgICAgICAgdGhpcy5kYXRhYmFzZVZlcnNpb24gPSBkYXRhYmFzZVZlcnNpb247XG4gICAgICAgIHRoaXMuc3RvcmVOYW1lID0gc3RvcmVOYW1lO1xuICAgICAgICB0aGlzLnN0b3JlS2V5ID0gc3RydWN0dXJlWzBdO1xuXG4gICAgICAgIHRoaXMuc3RydWN0dXJlID0gc3RydWN0dXJlO1xuICAgIH1cblxuICAgIF9pbml0KCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKHNjb3BlLmRhdGFiYXNlTmFtZSwgc2NvcGUuZGF0YWJhc2VWZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG9uU3VjY2VzcyBpcyBleGVjdXRlZCBhZnRlciBvbnVwZ3JhZGVuZWVkZWQgRE9OVCByZXNvbHZlIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhYmFzZSA9IGV2ZW50LmN1cnJlbnRUYXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2UuZGVsZXRlT2JqZWN0U3RvcmUoc2NvcGUuc3RvcmVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHt9XG4gICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmNyZWF0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSwgeyBrZXlQYXRoOiBzY29wZS5zdG9yZUtleSB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5kYXRhYmFzZSA9IHRoaXMucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS50cmllZERlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXMgZGVsZXRpbmcgZXhpdGluZyBkYXRhYmFzZSBhbmQgcmV0cnlpbmcuLi5cIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IGluZGV4ZWREQi5kZWxldGVEYXRhYmFzZShzY29wZS5kYXRhYmFzZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudHJpZWREZWxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLl9pbml0KCkudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJFcnJvciB3aGlsZSBkZWxldGluZyBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkbid0IGRlbGV0ZSBpbmRleGVkREIgJXMgZHVlIHRvIHRoZSBvcGVyYXRpb24gYmVpbmcgYmxvY2tlZFwiLCBzY29wZS5kYXRhYmFzZU5hbWUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkIG5vdCBvcGVuIGluZGV4ZWREQiAlc1wiLCBzY29wZS5kYXRhYmFzZU5hbWUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25ibG9ja2VkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkbid0IG9wZW4gaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2dldFN0b3JlKGFjdGlvbikge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCB0cmFuc2FjdGlvbiA9IHNjb3BlLmRhdGFiYXNlLnRyYW5zYWN0aW9uKHNjb3BlLnN0b3JlTmFtZSwgYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgfVxuXG4gICAgX2dldFN0b3JlKGFjdGlvbikge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoc2NvcGUuaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjb3BlLl9pbml0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2NvcGUuX19nZXRTdG9yZShhY3Rpb24pKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXQodXJsLCBlcXVhbHMpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRE9OTFkpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlcyA9PT0gdW5kZWZpbmVkICYmIGVxdWFscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBlcXVhbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXF1YWxzLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlcy5oYXNPd25Qcm9wZXJ0eShrZXkpIHx8IHZhbHVlc1trZXldICE9PSBlcXVhbHNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IF9JbmRleGVkREJSZXN1bHQyLmRlZmF1bHQodmFsdWVzKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzZXQoa2V5LCBhcmdzKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgbGV0IGRhdGEgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBwdXREYXRhID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gc2NvcGUuc3RydWN0dXJlLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcHV0RGF0YVtzY29wZS5zdHJ1Y3R1cmVbaV1dID0gZGF0YVtpXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLnB1dChwdXREYXRhKTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IHJlc29sdmU7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVtb3ZlKHVybCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzY29wZS5fZ2V0U3RvcmUoQUNUSU9OUy5SRUFEV1JJVEUpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUucmVtb3ZlKHVybCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzY29wZS5fZ2V0U3RvcmUoQUNUSU9OUy5SRUFEV1JJVEUpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IHJlc29sdmU7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gSW5kZXhlZERCOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBJbmRleGVkREJSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlcykge1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXRWYWx1ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlcztcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBJbmRleGVkREJSZXN1bHQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vQWxsb3lcIikuZGVmYXVsdDsiXX0=
