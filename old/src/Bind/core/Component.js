"use strict";

let _buildSetterVariable = function(variableName) {
    this["__" + variableName] = this[variableName];
    Object.defineProperty(this, variableName, {
        get: () => {
            return this["__" + variableName];
        },
        set: (newValue) => {
            this["__" + variableName] = newValue;
            _update.call(this, variableName);
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
            if(this[variablesVariableName] instanceof NodeList || this[variablesVariableName] instanceof ChangeableNodeList || this[variablesVariableName] instanceof HTMLElement) {
                evalText = evalText.replace(new RegExp("\\${\\s*this\\." + variablesVariableName + "\\s*}", "g"), "");
                if(variableName === variablesVariableName) {
                    if(!this._appendedChildren.has(variablesVariableName)) {
                        this._appendedChildren.set(variablesVariableName, []);
                    }
                    let appendedChildren = this._appendedChildren.get(variablesVariableName);
                    if(appendedChildren.length > 0) {
                        for(let child of appendedChildren) {
                            htmlNodeToUpdate.removeChild(child);
                        }
                    }
                    if (this[variablesVariableName] instanceof NodeList) {
                        for (let i = 0, node; node = this[variablesVariableName][i]; i++) {
                            htmlNodeToUpdate.appendChild(node);
                            appendedChildren.push(node);
                        }
                    } else if (this[variablesVariableName] instanceof ChangeableNodeList) {
                        this[variablesVariableName]._parentNode = htmlNodeToUpdate;
                        for (let node of this[variablesVariableName]) {
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

let _buildComponent = function(nodeList) {
    this._rootNode = document.createElement(this.constructor.name);

    if(nodeList instanceof NodeList) {
        console.log("test 1",nodeList[1]);
        console.log("test 2",nodeList[1].parentNode);
        console.log("test blah 1",nodeList[0]);
        console.log("test blah 2",nodeList[0].parentNode);
        for (let i = 0, length = nodeList.length; i < length; i++) {
            console.log("test 3",nodeList[1] instanceof Node);
            console.log("test 4",nodeList[1]);
            console.log("test 5",nodeList[1].parentNode);
            this._rootNode.appendChild(nodeList[i]); // Magically doesn't add child Nodes for custom tags? But that's what we want
        }
    } else if(nodeList instanceof ChangeableNodeList) {
        for (let node of nodeList) {
            this._rootNode.appendChild(node); // Magically doesn't add child Nodes for custom tags? But that's what we want
        }
    }

    this._bindMap = _buildBindMap.call(this, this._rootNode);

    console.log("Bind map", this._bindMap);

    for (let componentType of _componentTypeCache.values()) {
        componentType.render(this._rootNode, this);
    }

    //this.update(); // TODO: consider if this is a good thing to do

    if (this.ready instanceof Function) {
        this.ready();
    }
};

let _parseAttributes = function(node) {
    let attributes = new Object(null);
    for(let j = 0, attributeNode; attributeNode = node.attributes[j]; j++) {
        let name = attributeNode.name.toLowerCase().split("-");
        for(let k = 1, part; part = name[k]; k++) {
            name[k] = part.charAt(0).toUpperCase() + part.substring(1);
        }
        attributes[name.join("")] = attributeNode.value;
    }
    return attributes;
};

let _componentTypeCache = new Map();
let domParser = new DOMParser();

let _componentArguments;
class Component {

    constructor(options) {
        options.keepRoot = options.keepRoot === undefined ? true : options.keepRoot;
        options.templateMethod = options.templateMethod === undefined ? 'auto' : options.templateMethod;
        if ((options.templateMethod === 'auto' || options.templateMethod === 'ajax') && typeof options.template == "string" && options.template.indexOf(".") === -1) {
            options.template += ".html";
        }

        this._appendedChildren = new Map();
        this._attributes = _componentArguments[0];
        this._parentComponent = _componentArguments[1];

        this._promise = new Promise((resolve, reject) => {
            if(options.templateMethod === 'inline') {
                options.template = domParser.parseFromString(options.template, "text/html").body.childNodes;
            }
            if(options.template instanceof NodeList || options.template instanceof ChangeableNodeList) {
                _buildComponent.call(this, options.template);
                resolve(this);
            } else {
                NodeListLoader.load(options.template).then((nodeList) => {
                    _buildComponent.call(this, nodeList);
                    resolve(this);
                }).catch((error) => {
                    console.error(error.stack);
                    reject(error);
                });
            }
        });
    }

    getParent() {
        return this._parentComponent;
    }

    getAttributes() {
        return this._attributes;
    }

    update(variableName) {
        if(variableName) {
            _update.call(this, variableName);
        } else {
            for(let key of this._bindMap.keys()) {
                _update.call(this, key);
            }
        }
    }

    static render(startNode, parentComponent) {
        startNode = startNode || document.body;
        let nodes = startNode.getElementsByTagName(this.name);
        for(let i = 0, node; node = nodes[i]; i++) {
            let temporaryAttributes = _parseAttributes(node);

            let childNodes = node.childNodes;

            _componentArguments = [temporaryAttributes, parentComponent];
            (new this(new ChangeableNodeList(childNodes)))._promise.then((component) => {
                node.parentNode.replaceChild(component._rootNode, node);
            });
        }
    }

    static register(ComponentClass) {
        _componentTypeCache.set(ComponentClass.name.toLowerCase(), ComponentClass);
    }

}