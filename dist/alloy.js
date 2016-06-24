(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Alloy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Component = require("./core/Component");

var _Component2 = _interopRequireDefault(_Component);

var _Attribute = require("./core/Attribute");

var _Attribute2 = _interopRequireDefault(_Attribute);

var _StringUtils = require("./core/utils/StringUtils");

var _StringUtils2 = _interopRequireDefault(_StringUtils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Alloy {
    static register(component) {
        if (component.__proto__ === _Component2.default) {
            let prototype = Object.create(HTMLElement.prototype);
            prototype.createdCallback = function () {
                this._component = new component(this);
            };
            prototype.detachedCallback = function () {
                if (this._component.destructor instanceof Function) {
                    this._component.destructor();
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

exports.default = Alloy;
},{"./core/Attribute":2,"./core/Component":3,"./core/utils/StringUtils":8}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
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

var _XHRLoader = require("./utils/AjaxLoaders/XHRLoader");

var _XHRLoader2 = _interopRequireDefault(_XHRLoader);

var _Alloy = require("../Alloy");

var _Alloy2 = _interopRequireDefault(_Alloy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let _buildSetterVariable = function (variableName) {
    this["__" + variableName] = this[variableName];
    Object.defineProperty(this, variableName, {
        get: () => {
            return this["__" + variableName];
        },
        set: newValue => {
            if (newValue instanceof NodeList) {
                newValue = new Proxy(newValue, {
                    get: (target, property) => {
                        console.log("get", target, property);
                    },
                    set: (target, property, value, receiver) => {
                        console.log("set", target, property, value, receiver);
                    }
                });
            }

            this["__" + variableName] = newValue;
            _update.call(this, variableName);
            if (this.update instanceof Function) {
                this.update(variableName);
            }
            if (this._variableUpdateCallbacks.has(variableName)) {
                let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
                for (let i = 0, length = updateCallbacks.length; i < length; i++) {
                    updateCallbacks[i](variableName);
                }
            }
        }
    });
};

let _setupMappingForNode = function (node, text, bindMap) {
    let alreadyBound = new Set();
    let evalMatchRegExp = /\${([^}]*)}/g;
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

let _buildBindMap = function (startNode) {
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
            if (!bindMap.has(key)) {
                bindMap.set(key, value);
            } else {
                let bindValues = bindMap.get(key);
                bindValues = bindValues.concat(value);
                bindMap.set(key, bindValues);
            }
        }
    }

    return bindMap;
};

let _evaluateAttributeHandlers = function (startNode) {
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

let _update = function (variableName) {
    for (let value of this._bindMap.get(variableName)) {
        let nodeToUpdate = value[0];
        let evalText = value[1];

        let htmlNodeToUpdate;
        if (nodeToUpdate instanceof CharacterData) {
            htmlNodeToUpdate = nodeToUpdate.parentNode;
        } else {
            htmlNodeToUpdate = nodeToUpdate;
        }

        for (let variablesVariableName of value[2]) {
            if (this[variablesVariableName] instanceof NodeList || this[variablesVariableName] instanceof HTMLElement) {
                evalText = evalText.replace(new RegExp("\\${\\s*this\\." + variablesVariableName + "\\s*}", "g"), "");
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
                    if (this[variablesVariableName] instanceof NodeList) {
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
            let evaluated = eval("`" + evalText + "`");
            if (nodeToUpdate instanceof CharacterData) {
                nodeToUpdate.textContent = evaluated;
            } else {
                nodeToUpdate.value = evaluated;
            }
        }
    }
};

class Component {

    constructor(rootNode, options) {
        this._rootNode = rootNode;
        options.templateMethod = options.templateMethod === undefined ? 'auto' : options.templateMethod;
        if ((options.templateMethod === 'auto' || options.templateMethod === 'ajax') && typeof options.template == "string" && options.template.indexOf(".") === -1) {
            options.template += ".html";
        }

        new Promise((resolve, reject) => {
            if (options.templateMethod === "inline") {
                resolve(options.template);
            } else {
                _XHRLoader2.default.load(options.template, { cache: false }).then(template => {
                    resolve(template);
                }).catch(error => {
                    reject(error);
                });
            }
        }).then(template => {
            this._transcludedChildren = document.createElement("div");
            while (this._rootNode.firstChild) {
                this._transcludedChildren.appendChild(this._rootNode.firstChild);
            }
            this._transcludedChildren = this._transcludedChildren.childNodes;
            this._rootNode.innerHTML += template;

            this._variableUpdateCallbacks = new Map();
            this._inlineAppendedChildren = new Map();
            this._bindMap = _buildBindMap.call(this, this._rootNode);
            _evaluateAttributeHandlers.call(this, this._rootNode);

            if (this.attached instanceof Function) {
                this.attached();
            }
        }).catch(error => {
            if (error instanceof Error) {
                //noinspection JSUnresolvedVariable
                error = error.stack;
            }
            console.error("Failed to initialize component %o", this, error);
        });
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
    }

    removeUpdateCallback(variableName, callback) {
        let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
        updateCallbacks.splice(updateCallbacks.indexOf(callback), 1);
    }

}
exports.default = Component;
},{"../Alloy":1,"./utils/AjaxLoaders/XHRLoader":5}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _IndexedDB = require("../IndexedDB/IndexedDB");

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
},{"../IndexedDB/IndexedDB":6}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Cache = require("./Cache");

var _Cache2 = _interopRequireDefault(_Cache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class XHRLoader {
    static load(url, options, onProgress) {
        return new Promise((resolve, reject) => {
            if (options === undefined) options = {};

            options.cache = options.cache !== undefined ? options.cache : XHRLoader.DEFAULT_CACHE_STATE;
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
            let method = options.method || XHRLoader.DEFAULT_METHOD;
            //noinspection JSUnresolvedVariable
            let mimeType = options.mimeType || XHRLoader.DEFAULT_MIME_TYPE;
            let responseType = options.responseType || XHRLoader.DEFAULT_RESPONSE_TYPE;

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
XHRLoader.DEFAULT_METHOD = "get";
XHRLoader.DEFAULT_MIME_TYPE = null; // Automatic
XHRLoader.DEFAULT_RESPONSE_TYPE = null; // Automatic
XHRLoader.DEFAULT_CACHE_STATE = true;
},{"./Cache":4}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _IndexedDBResult = require("./IndexedDBResult");

var _IndexedDBResult2 = _interopRequireDefault(_IndexedDBResult);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
            scope._getStore(IndexedDB.ACTIONS.READONLY).then(store => {
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

            scope._getStore(IndexedDB.ACTIONS.READWRITE).then(store => {
                let request = store.put(putData);
                request.onsuccess = resolve;
                request.onerror = reject;
            }).catch(reject);
        });
    }

    remove(url) {
        let scope = this;

        return new Promise((resolve, reject) => {
            scope._getStore(IndexedDB.ACTIONS.READWRITE).then(store => {
                let request = store.remove(url);
                request.onsuccess = resolve;
                request.onerror = reject;
            }).catch(reject);
        });
    }

    clear() {
        let scope = this;

        return new Promise((resolve, reject) => {
            scope._getStore(IndexedDB.ACTIONS.READWRITE).then(store => {
                let request = store.clear();
                request.onsuccess = resolve;
                request.onerror = reject;
            }).catch(reject);
        });
    }
}
exports.default = IndexedDB;
IndexedDB.ACTIONS = {
    READONLY: "readonly",
    READWRITE: "readwrite"
};
},{"./IndexedDBResult":7}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
"use strict";

module.exports = require("./Alloy").default;
},{"./Alloy":1}]},{},[9])(9)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3RlbXAvQWxsb3kuanMiLCJkaXN0L3RlbXAvY29yZS9BdHRyaWJ1dGUuanMiLCJkaXN0L3RlbXAvY29yZS9Db21wb25lbnQuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9BamF4TG9hZGVycy9DYWNoZS5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL0FqYXhMb2FkZXJzL1hIUkxvYWRlci5qcyIsImRpc3QvdGVtcC9jb3JlL3V0aWxzL0luZGV4ZWREQi9JbmRleGVkREIuanMiLCJkaXN0L3RlbXAvY29yZS91dGlscy9JbmRleGVkREIvSW5kZXhlZERCUmVzdWx0LmpzIiwiZGlzdC90ZW1wL2NvcmUvdXRpbHMvU3RyaW5nVXRpbHMuanMiLCJkaXN0L3RlbXAvc3RhbmRhbG9uZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vY29yZS9Db21wb25lbnRcIik7XG5cbnZhciBfQ29tcG9uZW50MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NvbXBvbmVudCk7XG5cbnZhciBfQXR0cmlidXRlID0gcmVxdWlyZShcIi4vY29yZS9BdHRyaWJ1dGVcIik7XG5cbnZhciBfQXR0cmlidXRlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0F0dHJpYnV0ZSk7XG5cbnZhciBfU3RyaW5nVXRpbHMgPSByZXF1aXJlKFwiLi9jb3JlL3V0aWxzL1N0cmluZ1V0aWxzXCIpO1xuXG52YXIgX1N0cmluZ1V0aWxzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1N0cmluZ1V0aWxzKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY2xhc3MgQWxsb3kge1xuICAgIHN0YXRpYyByZWdpc3Rlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKGNvbXBvbmVudC5fX3Byb3RvX18gPT09IF9Db21wb25lbnQyLmRlZmF1bHQpIHtcbiAgICAgICAgICAgIGxldCBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG4gICAgICAgICAgICBwcm90b3R5cGUuY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NvbXBvbmVudCA9IG5ldyBjb21wb25lbnQodGhpcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmRldGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2NvbXBvbmVudC5kZXN0cnVjdG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tcG9uZW50LmRlc3RydWN0b3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcHJvdG90eXBlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uIChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY29tcG9uZW50LmF0dHJpYnV0ZUNoYW5nZWQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21wb25lbnQuYXR0cmlidXRlQ2hhbmdlZChuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxldCBkYXNoZWROYW1lID0gX1N0cmluZ1V0aWxzMi5kZWZhdWx0LnRvRGFzaGVkKGNvbXBvbmVudC5uYW1lKTtcbiAgICAgICAgICAgIHdpbmRvd1tjb21wb25lbnQubmFtZV0gPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQoZGFzaGVkTmFtZSwgeyBwcm90b3R5cGU6IHByb3RvdHlwZSB9KTtcbiAgICAgICAgICAgIC8vQWxsb3kuX3JlZ2lzdGVyZWRDb21wb25lbnRzLmFkZChkYXNoZWROYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnQuX19wcm90b19fID09PSBfQXR0cmlidXRlMi5kZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgQWxsb3kuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLnNldChfU3RyaW5nVXRpbHMyLmRlZmF1bHQudG9EYXNoZWQoY29tcG9uZW50Lm5hbWUpLCBjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXRpYyBnZXQoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIH1cbn1cbi8vQWxsb3kuX3JlZ2lzdGVyZWRDb21wb25lbnRzID0gbmV3IFNldCgpO1xuQWxsb3kuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzID0gbmV3IE1hcCgpO1xuQWxsb3kuQ29tcG9uZW50ID0gX0NvbXBvbmVudDIuZGVmYXVsdDtcbkFsbG95LkF0dHJpYnV0ZSA9IF9BdHRyaWJ1dGUyLmRlZmF1bHQ7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IEFsbG95OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBBdHRyaWJ1dGUge1xuXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlTm9kZSkge1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGF0dHJpYnV0ZU5vZGUuX2FsbG95Q29tcG9uZW50O1xuICAgICAgICBsZXQgdmFyaWFibGVzID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfXFwkXSspXFxzKi9nO1xuICAgICAgICBsZXQgdmFyaWFibGVNYXRjaDtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhhdHRyaWJ1dGVOb2RlLnZhbHVlKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLmFkZCh2YXJpYWJsZU1hdGNoWzFdKTtcbiAgICAgICAgICAgIHRoaXMuY29tcG9uZW50LmFkZFVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTWF0Y2hbMV0sIHZhcmlhYmxlTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge31cblxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQXR0cmlidXRlOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfWEhSTG9hZGVyID0gcmVxdWlyZShcIi4vdXRpbHMvQWpheExvYWRlcnMvWEhSTG9hZGVyXCIpO1xuXG52YXIgX1hIUkxvYWRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9YSFJMb2FkZXIpO1xuXG52YXIgX0FsbG95ID0gcmVxdWlyZShcIi4uL0FsbG95XCIpO1xuXG52YXIgX0FsbG95MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0FsbG95KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxubGV0IF9idWlsZFNldHRlclZhcmlhYmxlID0gZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSkge1xuICAgIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXSA9IHRoaXNbdmFyaWFibGVOYW1lXTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdmFyaWFibGVOYW1lLCB7XG4gICAgICAgIGdldDogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbXCJfX1wiICsgdmFyaWFibGVOYW1lXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBuZXdWYWx1ZSA9PiB7XG4gICAgICAgICAgICBpZiAobmV3VmFsdWUgaW5zdGFuY2VvZiBOb2RlTGlzdCkge1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlID0gbmV3IFByb3h5KG5ld1ZhbHVlLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogKHRhcmdldCwgcHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2V0XCIsIHRhcmdldCwgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6ICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSwgcmVjZWl2ZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2V0XCIsIHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpc1tcIl9fXCIgKyB2YXJpYWJsZU5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBfdXBkYXRlLmNhbGwodGhpcywgdmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnVwZGF0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5oYXModmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgIGxldCB1cGRhdGVDYWxsYmFja3MgPSB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcy5nZXQodmFyaWFibGVOYW1lKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdXBkYXRlQ2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNhbGxiYWNrc1tpXSh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubGV0IF9zZXR1cE1hcHBpbmdGb3JOb2RlID0gZnVuY3Rpb24gKG5vZGUsIHRleHQsIGJpbmRNYXApIHtcbiAgICBsZXQgYWxyZWFkeUJvdW5kID0gbmV3IFNldCgpO1xuICAgIGxldCBldmFsTWF0Y2hSZWdFeHAgPSAvXFwkeyhbXn1dKil9L2c7XG4gICAgbGV0IGV2YWxNYXRjaDtcbiAgICBsZXQgdmFyaWFibGVzID0gbmV3IFNldCgpO1xuICAgIHdoaWxlIChldmFsTWF0Y2ggPSBldmFsTWF0Y2hSZWdFeHAuZXhlYyh0ZXh0KSkge1xuICAgICAgICBsZXQgdmFyaWFibGVzUmVnRXhwID0gL1xccyp0aGlzXFwuKFthLXpBLVowLTlfXFwkXSspXFxzKi9nO1xuICAgICAgICBsZXQgdmFyaWFibGVNYXRjaDtcbiAgICAgICAgd2hpbGUgKHZhcmlhYmxlTWF0Y2ggPSB2YXJpYWJsZXNSZWdFeHAuZXhlYyhldmFsTWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuYWRkKHZhcmlhYmxlTWF0Y2hbMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFibGVOYW1lIG9mIHZhcmlhYmxlcykge1xuICAgICAgICAgICAgaWYgKCFhbHJlYWR5Qm91bmQuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBhbHJlYWR5Qm91bmQuYWRkKHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFiaW5kTWFwLmhhcyh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KHZhcmlhYmxlTmFtZSwgW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgYmluZEF0dHJpYnV0ZXMgPSBiaW5kTWFwLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGJpbmRBdHRyaWJ1dGVzLnB1c2goW25vZGUsIHRleHQsIHZhcmlhYmxlc10pO1xuXG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcywgdmFyaWFibGVOYW1lKSA9PT0gdW5kZWZpbmVkIHx8IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcywgdmFyaWFibGVOYW1lKS5zZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBfYnVpbGRTZXR0ZXJWYXJpYWJsZS5jYWxsKHRoaXMsIHZhcmlhYmxlTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubGV0IF9idWlsZEJpbmRNYXAgPSBmdW5jdGlvbiAoc3RhcnROb2RlKSB7XG4gICAgbGV0IGJpbmRNYXAgPSBuZXcgTWFwKCk7XG5cbiAgICBpZiAoc3RhcnROb2RlIGluc3RhbmNlb2YgQ2hhcmFjdGVyRGF0YSAmJiBzdGFydE5vZGUudGV4dENvbnRlbnQgIT09IFwiXCIpIHtcbiAgICAgICAgX3NldHVwTWFwcGluZ0Zvck5vZGUuY2FsbCh0aGlzLCBzdGFydE5vZGUsIHN0YXJ0Tm9kZS50ZXh0Q29udGVudCwgYmluZE1hcCk7XG4gICAgfVxuICAgIGlmIChzdGFydE5vZGUuYXR0cmlidXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwLCBhdHRyaWJ1dGVOb2RlOyBhdHRyaWJ1dGVOb2RlID0gc3RhcnROb2RlLmF0dHJpYnV0ZXNbal07IGorKykge1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZU5vZGUudmFsdWUgIT0gXCJcIikge1xuICAgICAgICAgICAgICAgIF9zZXR1cE1hcHBpbmdGb3JOb2RlLmNhbGwodGhpcywgYXR0cmlidXRlTm9kZSwgYXR0cmlidXRlTm9kZS52YWx1ZSwgYmluZE1hcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgbm9kZUxpc3QgPSBzdGFydE5vZGUuY2hpbGROb2RlcztcbiAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpICYmIG5vZGUuX2NvbXBvbmVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBQZXJmb3JtYW5jZSBpbXByb3ZlbWVudDogU29tZWhvdyBjaGVjayBpZiBpdCdzIHBvc3NpYmxlIGFsc28gdG8gZXhjbHVkZSBmdXR1cmUgY29tcG9uZW50cy4uLlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG5ld0JpbmRNYXAgPSBfYnVpbGRCaW5kTWFwLmNhbGwodGhpcywgbm9kZSk7XG4gICAgICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBuZXdCaW5kTWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKCFiaW5kTWFwLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgYmluZE1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBiaW5kVmFsdWVzID0gYmluZE1hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBiaW5kVmFsdWVzID0gYmluZFZhbHVlcy5jb25jYXQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGJpbmRNYXAuc2V0KGtleSwgYmluZFZhbHVlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYmluZE1hcDtcbn07XG5cbmxldCBfZXZhbHVhdGVBdHRyaWJ1dGVIYW5kbGVycyA9IGZ1bmN0aW9uIChzdGFydE5vZGUpIHtcbiAgICBpZiAoc3RhcnROb2RlLmF0dHJpYnV0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMCwgYXR0cmlidXRlTm9kZTsgYXR0cmlidXRlTm9kZSA9IHN0YXJ0Tm9kZS5hdHRyaWJ1dGVzW2pdOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChfQWxsb3kyLmRlZmF1bHQuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLmhhcyhhdHRyaWJ1dGVOb2RlLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgYXR0cmlidXRlTm9kZS5fYWxsb3lDb21wb25lbnQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZU5vZGUuX2FsbG95QXR0cmlidXRlID0gbmV3IChfQWxsb3kyLmRlZmF1bHQuX3JlZ2lzdGVyZWRBdHRyaWJ1dGVzLmdldChhdHRyaWJ1dGVOb2RlLm5hbWUpKShhdHRyaWJ1dGVOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgbm9kZUxpc3QgPSBzdGFydE5vZGUuY2hpbGROb2RlcztcbiAgICBmb3IgKGxldCBpID0gMCwgbm9kZTsgbm9kZSA9IG5vZGVMaXN0W2ldOyBpKyspIHtcbiAgICAgICAgX2V2YWx1YXRlQXR0cmlidXRlSGFuZGxlcnMuY2FsbCh0aGlzLCBub2RlKTtcbiAgICB9XG59O1xuXG5sZXQgX3VwZGF0ZSA9IGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUpIHtcbiAgICBmb3IgKGxldCB2YWx1ZSBvZiB0aGlzLl9iaW5kTWFwLmdldCh2YXJpYWJsZU5hbWUpKSB7XG4gICAgICAgIGxldCBub2RlVG9VcGRhdGUgPSB2YWx1ZVswXTtcbiAgICAgICAgbGV0IGV2YWxUZXh0ID0gdmFsdWVbMV07XG5cbiAgICAgICAgbGV0IGh0bWxOb2RlVG9VcGRhdGU7XG4gICAgICAgIGlmIChub2RlVG9VcGRhdGUgaW5zdGFuY2VvZiBDaGFyYWN0ZXJEYXRhKSB7XG4gICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlID0gbm9kZVRvVXBkYXRlLnBhcmVudE5vZGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sTm9kZVRvVXBkYXRlID0gbm9kZVRvVXBkYXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFibGVzVmFyaWFibGVOYW1lIG9mIHZhbHVlWzJdKSB7XG4gICAgICAgICAgICBpZiAodGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgTm9kZUxpc3QgfHwgdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBldmFsVGV4dCA9IGV2YWxUZXh0LnJlcGxhY2UobmV3IFJlZ0V4cChcIlxcXFwke1xcXFxzKnRoaXNcXFxcLlwiICsgdmFyaWFibGVzVmFyaWFibGVOYW1lICsgXCJcXFxccyp9XCIsIFwiZ1wiKSwgXCJcIik7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlTmFtZSA9PT0gdmFyaWFibGVzVmFyaWFibGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5faW5saW5lQXBwZW5kZWRDaGlsZHJlbi5oYXModmFyaWFibGVzVmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5saW5lQXBwZW5kZWRDaGlsZHJlbi5zZXQodmFyaWFibGVzVmFyaWFibGVOYW1lLCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGFwcGVuZGVkQ2hpbGRyZW4gPSB0aGlzLl9pbmxpbmVBcHBlbmRlZENoaWxkcmVuLmdldCh2YXJpYWJsZXNWYXJpYWJsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBwZW5kZWRDaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZCBvZiBhcHBlbmRlZENoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSBpbnN0YW5jZW9mIE5vZGVMaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gdGhpc1t2YXJpYWJsZXNWYXJpYWJsZU5hbWVdLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5vZGUgPSB0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV1baV0uY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxOb2RlVG9VcGRhdGUuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kZWRDaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbE5vZGVUb1VwZGF0ZS5hcHBlbmRDaGlsZCh0aGlzW3ZhcmlhYmxlc1ZhcmlhYmxlTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kZWRDaGlsZHJlbi5wdXNoKHRoaXNbdmFyaWFibGVzVmFyaWFibGVOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEobm9kZVRvVXBkYXRlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKSB7XG4gICAgICAgICAgICBsZXQgZXZhbHVhdGVkID0gZXZhbChcImBcIiArIGV2YWxUZXh0ICsgXCJgXCIpO1xuICAgICAgICAgICAgaWYgKG5vZGVUb1VwZGF0ZSBpbnN0YW5jZW9mIENoYXJhY3RlckRhdGEpIHtcbiAgICAgICAgICAgICAgICBub2RlVG9VcGRhdGUudGV4dENvbnRlbnQgPSBldmFsdWF0ZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVUb1VwZGF0ZS52YWx1ZSA9IGV2YWx1YXRlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNsYXNzIENvbXBvbmVudCB7XG5cbiAgICBjb25zdHJ1Y3Rvcihyb290Tm9kZSwgb3B0aW9ucykge1xuICAgICAgICB0aGlzLl9yb290Tm9kZSA9IHJvb3ROb2RlO1xuICAgICAgICBvcHRpb25zLnRlbXBsYXRlTWV0aG9kID0gb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9PT0gdW5kZWZpbmVkID8gJ2F1dG8nIDogb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZDtcbiAgICAgICAgaWYgKChvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSAnYXV0bycgfHwgb3B0aW9ucy50ZW1wbGF0ZU1ldGhvZCA9PT0gJ2FqYXgnKSAmJiB0eXBlb2Ygb3B0aW9ucy50ZW1wbGF0ZSA9PSBcInN0cmluZ1wiICYmIG9wdGlvbnMudGVtcGxhdGUuaW5kZXhPZihcIi5cIikgPT09IC0xKSB7XG4gICAgICAgICAgICBvcHRpb25zLnRlbXBsYXRlICs9IFwiLmh0bWxcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnRlbXBsYXRlTWV0aG9kID09PSBcImlubGluZVwiKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShvcHRpb25zLnRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX1hIUkxvYWRlcjIuZGVmYXVsdC5sb2FkKG9wdGlvbnMudGVtcGxhdGUsIHsgY2FjaGU6IGZhbHNlIH0pLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICB3aGlsZSAodGhpcy5fcm9vdE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RyYW5zY2x1ZGVkQ2hpbGRyZW4uYXBwZW5kQ2hpbGQodGhpcy5fcm9vdE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl90cmFuc2NsdWRlZENoaWxkcmVuID0gdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbi5jaGlsZE5vZGVzO1xuICAgICAgICAgICAgdGhpcy5fcm9vdE5vZGUuaW5uZXJIVE1MICs9IHRlbXBsYXRlO1xuXG4gICAgICAgICAgICB0aGlzLl92YXJpYWJsZVVwZGF0ZUNhbGxiYWNrcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgIHRoaXMuX2lubGluZUFwcGVuZGVkQ2hpbGRyZW4gPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICB0aGlzLl9iaW5kTWFwID0gX2J1aWxkQmluZE1hcC5jYWxsKHRoaXMsIHRoaXMuX3Jvb3ROb2RlKTtcbiAgICAgICAgICAgIF9ldmFsdWF0ZUF0dHJpYnV0ZUhhbmRsZXJzLmNhbGwodGhpcywgdGhpcy5fcm9vdE5vZGUpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2hlZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgICAgIC8vbm9pbnNwZWN0aW9uIEpTVW5yZXNvbHZlZFZhcmlhYmxlXG4gICAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci5zdGFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBjb21wb25lbnQgJW9cIiwgdGhpcywgZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUcmFuc2NsdWRlZENoaWxkcmVuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNjbHVkZWRDaGlsZHJlbjtcbiAgICB9XG5cbiAgICBhZGRVcGRhdGVDYWxsYmFjayh2YXJpYWJsZU5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuaGFzKHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLnNldCh2YXJpYWJsZU5hbWUsIFtdKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdXBkYXRlQ2FsbGJhY2tzID0gdGhpcy5fdmFyaWFibGVVcGRhdGVDYWxsYmFja3MuZ2V0KHZhcmlhYmxlTmFtZSk7XG4gICAgICAgIHVwZGF0ZUNhbGxiYWNrc1t1cGRhdGVDYWxsYmFja3MubGVuZ3RoXSA9IGNhbGxiYWNrO1xuICAgIH1cblxuICAgIHJlbW92ZVVwZGF0ZUNhbGxiYWNrKHZhcmlhYmxlTmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IHVwZGF0ZUNhbGxiYWNrcyA9IHRoaXMuX3ZhcmlhYmxlVXBkYXRlQ2FsbGJhY2tzLmdldCh2YXJpYWJsZU5hbWUpO1xuICAgICAgICB1cGRhdGVDYWxsYmFja3Muc3BsaWNlKHVwZGF0ZUNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKSwgMSk7XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBDb21wb25lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9JbmRleGVkREIgPSByZXF1aXJlKFwiLi4vSW5kZXhlZERCL0luZGV4ZWREQlwiKTtcblxudmFyIF9JbmRleGVkREIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSW5kZXhlZERCKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuY2xhc3MgQ2FjaGUge1xuICAgIHN0YXRpYyBnZXQodXJsLCB2ZXJzaW9uKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uIHx8IDE7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoQ2FjaGUubWVtb3J5W3VybF0pIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKENhY2hlLm1lbW9yeVt1cmxdKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIENhY2hlLmluZGV4ZWREQi5nZXQodXJsLCB7IHZlcnNpb246IHZlcnNpb24gfSkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEuZ2V0VmFsdWVzKCkucmVzb3VyY2UpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcmV0cmlldmUgcmVzb3VyY2UgZnJvbSBJbmRleGVkREJcIiwgZXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHNldCh1cmwsIGRhdGEsIHZlcnNpb24pIHtcbiAgICAgICAgdmVyc2lvbiA9IHZlcnNpb24gfHwgMTtcbiAgICAgICAgQ2FjaGUubWVtb3J5W3VybF0gPSBkYXRhO1xuICAgICAgICBDYWNoZS5pbmRleGVkREIuc2V0KHVybCwgZGF0YSwgdmVyc2lvbik7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gQ2FjaGU7XG5DYWNoZS5tZW1vcnkgPSB7fTtcbkNhY2hlLmluZGV4ZWREQiA9IG5ldyBfSW5kZXhlZERCMi5kZWZhdWx0KFwiY2FjaGVcIiwgMiwgXCJyZXNvdXJjZXNcIiwgW1widXJsXCIsIFwicmVzb3VyY2VcIiwgXCJ2ZXJzaW9uXCJdKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX0NhY2hlID0gcmVxdWlyZShcIi4vQ2FjaGVcIik7XG5cbnZhciBfQ2FjaGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2FjaGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jbGFzcyBYSFJMb2FkZXIge1xuICAgIHN0YXRpYyBsb2FkKHVybCwgb3B0aW9ucywgb25Qcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkgb3B0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICBvcHRpb25zLmNhY2hlID0gb3B0aW9ucy5jYWNoZSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jYWNoZSA6IFhIUkxvYWRlci5ERUZBVUxUX0NBQ0hFX1NUQVRFO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBfQ2FjaGUyLmRlZmF1bHQuZ2V0KHVybCkudGhlbihyZXNvbHZlKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIFhIUkxvYWRlci5fbG9hZCh1cmwsIG9wdGlvbnMsIG9uUHJvZ3Jlc3MpLnRoZW4ocmVzb2x2ZSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgWEhSTG9hZGVyLl9sb2FkKHVybCwgb3B0aW9ucywgb25Qcm9ncmVzcykudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgX2xvYWQodXJsLCBvcHRpb25zLCBvblByb2dyZXNzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgbWV0aG9kID0gb3B0aW9ucy5tZXRob2QgfHwgWEhSTG9hZGVyLkRFRkFVTFRfTUVUSE9EO1xuICAgICAgICAgICAgLy9ub2luc3BlY3Rpb24gSlNVbnJlc29sdmVkVmFyaWFibGVcbiAgICAgICAgICAgIGxldCBtaW1lVHlwZSA9IG9wdGlvbnMubWltZVR5cGUgfHwgWEhSTG9hZGVyLkRFRkFVTFRfTUlNRV9UWVBFO1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlVHlwZSA9IG9wdGlvbnMucmVzcG9uc2VUeXBlIHx8IFhIUkxvYWRlci5ERUZBVUxUX1JFU1BPTlNFX1RZUEU7XG5cbiAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICBpZiAobWltZVR5cGUpIHJlcXVlc3Qub3ZlcnJpZGVNaW1lVHlwZShtaW1lVHlwZSk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2VUeXBlKSByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IHJlc3BvbnNlVHlwZTtcbiAgICAgICAgICAgIHJlcXVlc3Qub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGlmIChvblByb2dyZXNzKSByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJwcm9ncmVzc1wiLCBvblByb2dyZXNzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfQ2FjaGUyLmRlZmF1bHQuc2V0KHVybCwgdGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHRoaXMpO1xuICAgICAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gWEhSTG9hZGVyO1xuWEhSTG9hZGVyLkRFRkFVTFRfTUVUSE9EID0gXCJnZXRcIjtcblhIUkxvYWRlci5ERUZBVUxUX01JTUVfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuWEhSTG9hZGVyLkRFRkFVTFRfUkVTUE9OU0VfVFlQRSA9IG51bGw7IC8vIEF1dG9tYXRpY1xuWEhSTG9hZGVyLkRFRkFVTFRfQ0FDSEVfU1RBVEUgPSB0cnVlOyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfSW5kZXhlZERCUmVzdWx0ID0gcmVxdWlyZShcIi4vSW5kZXhlZERCUmVzdWx0XCIpO1xuXG52YXIgX0luZGV4ZWREQlJlc3VsdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JbmRleGVkREJSZXN1bHQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5jbGFzcyBJbmRleGVkREIge1xuICAgIGNvbnN0cnVjdG9yKGRhdGFiYXNlTmFtZSwgZGF0YWJhc2VWZXJzaW9uLCBzdG9yZU5hbWUsIHN0cnVjdHVyZSkge1xuICAgICAgICB0aGlzLmRhdGFiYXNlTmFtZSA9IGRhdGFiYXNlTmFtZTtcbiAgICAgICAgdGhpcy5kYXRhYmFzZVZlcnNpb24gPSBkYXRhYmFzZVZlcnNpb247XG4gICAgICAgIHRoaXMuc3RvcmVOYW1lID0gc3RvcmVOYW1lO1xuICAgICAgICB0aGlzLnN0b3JlS2V5ID0gc3RydWN0dXJlWzBdO1xuXG4gICAgICAgIHRoaXMuc3RydWN0dXJlID0gc3RydWN0dXJlO1xuICAgIH1cblxuICAgIF9pbml0KCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKHNjb3BlLmRhdGFiYXNlTmFtZSwgc2NvcGUuZGF0YWJhc2VWZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG9uU3VjY2VzcyBpcyBleGVjdXRlZCBhZnRlciBvbnVwZ3JhZGVuZWVkZWQgRE9OVCByZXNvbHZlIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhYmFzZSA9IGV2ZW50LmN1cnJlbnRUYXJnZXQucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2UuZGVsZXRlT2JqZWN0U3RvcmUoc2NvcGUuc3RvcmVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHt9XG4gICAgICAgICAgICAgICAgICAgIGRhdGFiYXNlLmNyZWF0ZU9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSwgeyBrZXlQYXRoOiBzY29wZS5zdG9yZUtleSB9KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5kYXRhYmFzZSA9IHRoaXMucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS50cmllZERlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZCBub3Qgb3BlbiBpbmRleGVkREIgJXMgZGVsZXRpbmcgZXhpdGluZyBkYXRhYmFzZSBhbmQgcmV0cnlpbmcuLi5cIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IGluZGV4ZWREQi5kZWxldGVEYXRhYmFzZShzY29wZS5kYXRhYmFzZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudHJpZWREZWxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLl9pbml0KCkudGhlbihyZXNvbHZlKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJFcnJvciB3aGlsZSBkZWxldGluZyBpbmRleGVkREIgJXNcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkbid0IGRlbGV0ZSBpbmRleGVkREIgJXMgZHVlIHRvIHRoZSBvcGVyYXRpb24gYmVpbmcgYmxvY2tlZFwiLCBzY29wZS5kYXRhYmFzZU5hbWUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkIG5vdCBvcGVuIGluZGV4ZWREQiAlc1wiLCBzY29wZS5kYXRhYmFzZU5hbWUsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25ibG9ja2VkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkNvdWxkbid0IG9wZW4gaW5kZXhlZERCICVzIGR1ZSB0byB0aGUgb3BlcmF0aW9uIGJlaW5nIGJsb2NrZWRcIiwgc2NvcGUuZGF0YWJhc2VOYW1lLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2dldFN0b3JlKGFjdGlvbikge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCB0cmFuc2FjdGlvbiA9IHNjb3BlLmRhdGFiYXNlLnRyYW5zYWN0aW9uKHNjb3BlLnN0b3JlTmFtZSwgYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHNjb3BlLnN0b3JlTmFtZSk7XG4gICAgfVxuXG4gICAgX2dldFN0b3JlKGFjdGlvbikge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoc2NvcGUuaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHNjb3BlLl9fZ2V0U3RvcmUoYWN0aW9uKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjb3BlLl9pbml0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2NvcGUuX19nZXRTdG9yZShhY3Rpb24pKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXQodXJsLCBlcXVhbHMpIHtcbiAgICAgICAgbGV0IHNjb3BlID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgc2NvcGUuX2dldFN0b3JlKEluZGV4ZWREQi5BQ1RJT05TLlJFQURPTkxZKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBldmVudC50YXJnZXQucmVzdWx0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMgPT09IHVuZGVmaW5lZCAmJiBlcXVhbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZXF1YWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVxdWFscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZXMuaGFzT3duUHJvcGVydHkoa2V5KSB8fCB2YWx1ZXNba2V5XSAhPT0gZXF1YWxzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBfSW5kZXhlZERCUmVzdWx0Mi5kZWZhdWx0KHZhbHVlcykpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0KGtleSwgYXJncykge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIGxldCBkYXRhID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgcHV0RGF0YSA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IHNjb3BlLnN0cnVjdHVyZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHB1dERhdGFbc2NvcGUuc3RydWN0dXJlW2ldXSA9IGRhdGFbaV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShJbmRleGVkREIuQUNUSU9OUy5SRUFEV1JJVEUpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUucHV0KHB1dERhdGEpO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW1vdmUodXJsKSB7XG4gICAgICAgIGxldCBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHNjb3BlLl9nZXRTdG9yZShJbmRleGVkREIuQUNUSU9OUy5SRUFEV1JJVEUpLnRoZW4oc3RvcmUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXF1ZXN0ID0gc3RvcmUucmVtb3ZlKHVybCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICBsZXQgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzY29wZS5fZ2V0U3RvcmUoSW5kZXhlZERCLkFDVElPTlMuUkVBRFdSSVRFKS50aGVuKHN0b3JlID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuZGVmYXVsdCA9IEluZGV4ZWREQjtcbkluZGV4ZWREQi5BQ1RJT05TID0ge1xuICAgIFJFQURPTkxZOiBcInJlYWRvbmx5XCIsXG4gICAgUkVBRFdSSVRFOiBcInJlYWR3cml0ZVwiXG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5jbGFzcyBJbmRleGVkREJSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlcykge1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXRWYWx1ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlcztcbiAgICB9XG59XG5leHBvcnRzLmRlZmF1bHQgPSBJbmRleGVkREJSZXN1bHQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmNsYXNzIFN0cmluZ1V0aWxzIHtcblxuICAgIHN0YXRpYyB0b0Rhc2hlZChzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCBcIiQxLSQyXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG59XG5leHBvcnRzLmRlZmF1bHQgPSBTdHJpbmdVdGlsczsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9BbGxveVwiKS5kZWZhdWx0OyJdfQ==
