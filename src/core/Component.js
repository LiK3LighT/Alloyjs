import XHRLoader from "./utils/AjaxLoaders/XHRLoader";
import Alloy from "../Alloy";

let _buildSetterVariable = function(variableName) {
    this["__" + variableName] = this[variableName];
    Object.defineProperty(this, variableName, {
        get: () => {
            return this["__" + variableName];
        },
        set: (newValue) => {
            if(newValue instanceof NodeList) {
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
            if(this.update instanceof Function) {
                this.update(variableName);
            }
            if(this._variableUpdateCallbacks.has(variableName)) {
                let updateCallbacks = this._variableUpdateCallbacks.get(variableName);
                for(let i = 0, length = updateCallbacks.length; i < length; i++) {
                    updateCallbacks[i](variableName);
                }
            }
        }
    });
};

let _setupMappingForNode = function(node, text, bindMap) {
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

        for(let variableName of variables){
            if(!alreadyBound.has(variableName)) {
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

let _buildBindMap = function(startNode) {
    let bindMap = new Map();

    if(startNode instanceof CharacterData && startNode.textContent !== "") {
        _setupMappingForNode.call(this, startNode, startNode.textContent, bindMap);
    }
    if(startNode.attributes !== undefined) {
        for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
            if(attributeNode.value != "") {
                _setupMappingForNode.call(this, attributeNode, attributeNode.value, bindMap);
            }
        }
    }

    let nodeList = startNode.childNodes;
    for (let i = 0, node; node = nodeList[i]; i++) {
        if(!(node instanceof CharacterData) && node._component !== undefined) { // TODO: Performance improvement: Somehow check if it's possible also to exclude future components...
            continue;
        }
        let newBindMap =  _buildBindMap.call(this, node);
        for(let [key, value] of newBindMap.entries()) {
            if(!bindMap.has(key)) {
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

let _evaluateAttributeHandlers = function(startNode) {
    if(startNode.attributes !== undefined) {
        for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
            if(Alloy._registeredAttributes.has(attributeNode.name)) {
                attributeNode._alloyComponent = this;
                attributeNode._alloyAttribute = new (Alloy._registeredAttributes.get(attributeNode.name))(attributeNode);
            }
        }
    }
    let nodeList = startNode.childNodes;
    for (let i = 0, node; node = nodeList[i]; i++) {
        _evaluateAttributeHandlers.call(this, node);
    }
};

let _update = function(variableName) {
    for(let value of this._bindMap.get(variableName)) {
        let nodeToUpdate = value[0];
        let evalText = value[1];

        let htmlNodeToUpdate;
        if(nodeToUpdate instanceof CharacterData) {
            htmlNodeToUpdate = nodeToUpdate.parentNode;
        } else {
            htmlNodeToUpdate = nodeToUpdate;
        }

        for(let variablesVariableName of value[2]) {
            if(this[variablesVariableName] instanceof NodeList || this[variablesVariableName] instanceof HTMLElement) {
                evalText = evalText.replace(new RegExp("\\${\\s*this\\." + variablesVariableName + "\\s*}", "g"), "");
                if(variableName === variablesVariableName) {
                    if(!this._inlineAppendedChildren.has(variablesVariableName)) {
                        this._inlineAppendedChildren.set(variablesVariableName, []);
                    }
                    let appendedChildren = this._inlineAppendedChildren.get(variablesVariableName);
                    if(appendedChildren.length > 0) {
                        for(let child of appendedChildren) {
                            child.remove();
                        }
                    }
                    if(this[variablesVariableName] instanceof NodeList) {
                        for(let i = 0, length = this[variablesVariableName].length; i < length; i++) {
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
        if(!(nodeToUpdate instanceof HTMLElement)) {
            let evaluated = eval("`" + evalText + "`");
            if (nodeToUpdate instanceof CharacterData) {
                nodeToUpdate.textContent = evaluated;
            } else {
                nodeToUpdate.value = evaluated;
            }
        }
    }
};

export default class Component {

    constructor(rootNode, options) {
        this._rootNode = rootNode;
        options.templateMethod = options.templateMethod === undefined ? 'auto' : options.templateMethod;
        if ((options.templateMethod === 'auto' || options.templateMethod === 'ajax') && typeof options.template == "string" && options.template.indexOf(".") === -1) {
            options.template += ".html";
        }

        new Promise((resolve, reject) => {
            if(options.templateMethod === "inline") {
                resolve(options.template);
            } else {
                XHRLoader.load(options.template, {cache: false}).then((template) => {
                    resolve(template);
                }).catch((error) => {
                    reject(error);
                });
            }
        }).then((template) => {
            this._transcludedChildren = document.createElement("div");
            while(this._rootNode.firstChild) {
                this._transcludedChildren.appendChild(this._rootNode.firstChild);
            }
            this._transcludedChildren = this._transcludedChildren.childNodes;
            this._rootNode.innerHTML += template;

            this._variableUpdateCallbacks = new Map();
            this._inlineAppendedChildren = new Map();
            this._bindMap = _buildBindMap.call(this, this._rootNode);
            _evaluateAttributeHandlers.call(this, this._rootNode);

            if(this.attached instanceof Function) {
                this.attached();
            }

        }).catch((error) => {
            if(error instanceof Error) {
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
        if(!this._variableUpdateCallbacks.has(variableName)) {
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