interface Attr {
    _alloyComponent: Alloy.Component;
}

namespace Alloy {

    export class Component {

        protected attached:() => void;
        protected update:(variableName:string) => void;
        protected attributeChanged:(name:string, oldValue:string, newValue:string) => void;
        protected destructor:() => void;

        private rootElement:Element;
        private transcludedChildren:NodeArray;

        private variableUpdateCallbacks = new Map();
        private bindMapIndex = new Map();
        private bindMap = new Map();

        constructor(private rootElement:Element, options:ComponentOptions) {
            new Promise((resolve, reject) => {
                if(options.template !== undefined) {
                    resolve(options.template);
                } else if (options.templateUrl !== undefined) {

                    fetch(options.templateUrl)
                        .then(response => {
                            if(response.ok) {
                                return response.text();
                            } else {
                                reject(new TypeError(response.status + " " + response.statusText));
                            }
                        }).then(templateText => {
                            resolve(templateText);
                        }).catch(error => {
                            reject(error);
                        });
                } else {
                    resolve();
                }
            }).then((template) => {
                if(template !== undefined) {
                    let transcludedChildrenHolder = document.createElement("div");
                    while (this.rootElement.firstChild) {
                        transcludedChildrenHolder.appendChild(this.rootElement.firstChild);
                    }
                    this.transcludedChildren = new NodeArray(transcludedChildrenHolder.childNodes);
                    this.rootElement.innerHTML += template;
                }

                this.updateBindings(this.rootElement);

                if(this.attached instanceof Function) {
                    this.attached();
                }
            }).catch((error) => {
                if(error instanceof TypeError) {
                    //noinspection TypeScriptUnresolvedVariable
                    error = error.stack;
                }
                console.error("Failed to initialize component %o", this, error);
            });
        }

        public getAttributes():NamedNodeMap {
            return this.rootElement.attributes;
        }

        public getAttributeValue(name):string {
            return this.rootElement.attributes.getNamedItem(name).nodeValue;
        }

        public getTranscludedChildren():NodeArray {
            return this.transcludedChildren;
        }

        public addUpdateCallback(variableName:string, callback:(variableName:string) => void):Component {
            if(!this.variableUpdateCallbacks.has(variableName)) {
                this.variableUpdateCallbacks.set(variableName, []);
            }
            let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
            updateCallbacks[updateCallbacks.length] = callback;

            this.buildSetterVariable(variableName);

            return this;
        }

        public removeUpdateCallback(variableName:string, callback:(variableName:string) => void):Component {
            let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
            updateCallbacks.splice(updateCallbacks.indexOf(callback), 1);
            return this;
        }

        public updateBindings(startElement:Element):void {
            this.evaluateAttributeHandlers(startElement);

            if(this.bindMapIndex.has(startElement)) { // if node was already evaluated

                if(!Utils.isNodeChildOf(this.rootElement, startElement)) { // If not a child of the component anymore, remove from bindMap
                    let bindMapKeys = this.bindMapIndex.get(startElement);
                    for(let bindMapKey of bindMapKeys) {
                        let bindMap = this.bindMap.get(bindMapKey);
                        for(let i = 0, length = bindMap.length; i < length; i++) {
                            if(bindMap[i][0] === startElement) {
                                bindMap.splice(i, 1);
                            }
                        }
                    }
                    this.bindMapIndex.delete(startElement);
                }
            } else if(Utils.isNodeChildOf(this.rootElement, startElement)) { // If this node is not already bound
                Utils.recurseTextNodes(startElement, (node, text) => {
                    this.setupBindMapForNode(node, text);
                });
            }

            let nodeList = startElement.childNodes;
            for (let i = 0, node; node = nodeList[i]; i++) {
                this.updateBindings(node);
            }
        }


        private cloneNode(component:Function):Node {
            let rootElement = document.createElement("div");
            let transcludedChildren = this.getTranscludedChildren();
            for(let child of transcludedChildren) {
                rootElement.appendChild(child.cloneNode(true));
            }

            let holderNode = document.createElement("div");
            holderNode.innerHTML = "<"+component.name+">" + rootElement.innerHTML + "</"+component.name+">";

            return holderNode.childNodes[0];
        }

        private evaluateAttributeHandlers(startElement:Element):void { // Creates instances of specific attribute classes into the attribute node itself.
            if(startElement.attributes !== undefined) {
                for (let j = 0, attributeNode; attributeNode = startElement.attributes[j]; j++) {
                    if(Alloy.registeredAttributes.has(attributeNode.name) && attributeNode._alloyAttribute === undefined) {
                        attributeNode._alloyComponent = this;
                        attributeNode._alloyAttribute = new (Alloy.registeredAttributes.get(attributeNode.name))(attributeNode);
                    }
                }
            }
            let nodeList = startElement.childNodes;
            for (let i = 0, node; node = nodeList[i]; i++) {
                this.evaluateAttributeHandlers(node);
            }
        }

        // TODO: Performance save evaluated function objects in the bind mapping and just call these instead of evaluating the functions with every update
        private setupBindMapForNode(node:Node, text:string):void {
            let alreadyBoundForNode = new Set();
            this.callForVariablesInText(text, (variables) => {
                for(let variableName of variables) {
                    if(!alreadyBoundForNode.has(variableName)) {
                        alreadyBoundForNode.add(variableName);
                        if (!this.bindMap.has(variableName)) {
                            this.bindMap.set(variableName, []);
                        }
                        let bindAttributes = this.bindMap.get(variableName);
                        bindAttributes.push([node, text, variables]);

                        if(!this.bindMapIndex.has(node)) {
                            this.bindMapIndex.set(node, new Set());
                        }
                        let bindMapIndexEntries = this.bindMapIndex.get(node);
                        bindMapIndexEntries.add(variableName);

                        if (Object.getOwnPropertyDescriptor(this, variableName) === undefined || Object.getOwnPropertyDescriptor(this, variableName).set === undefined) {
                            this.buildSetterVariable(variableName);
                        }
                    }
                }
            });
        }

        private evalMatchRegExp = /\${([^}]*)}/g;
        private variablesRegExp = /\s*this\.([a-zA-Z0-9_$]+)\s*/g;
        private callForVariablesInText(text:string, callback:(variables:Set<string>) => void):void {
            let evalMatch;
            this.evalMatchRegExp.lastIndex = 0; // Reset the RegExp, better performance than recreating it every time
            while (evalMatch = this.evalMatchRegExp.exec(text)) {
                let variableMatch;
                this.variablesRegExp.lastIndex = 0; // Reset the RegExp, better performance than recreating it every time

                let variables = new Set();
                while (variableMatch = this.variablesRegExp.exec(evalMatch[1])) {
                    variables.add(variableMatch[1]);
                }

                callback(variables);
            }
        }

        private buildSetterVariable(variableName:string):void {
            if(this.hasOwnProperty(variableName)) return;

            this["__" + variableName] = this[variableName];
            Object.defineProperty(this, variableName, {
                get: () => {
                    return this["__" + variableName];
                },
                set: (newValue) => {
                    if(newValue.constructor === Object || newValue instanceof Array) {
                        const proxyTemplate = {
                            get: (target, property) => {
                                return target[property];
                            },
                            set: (target, property, value) => {
                                if(value instanceof Object) {
                                    value = new Proxy(value, proxyTemplate);
                                }
                                if(target[property] !== value) {
                                    target[property] = value;
                                    this.triggerUpdateCallbacks(variableName);
                                }
                                return true;
                            }
                        };
                        newValue = new Proxy(newValue, proxyTemplate);
                    }
                    if(this["__" + variableName] !== newValue) {
                        this["__" + variableName] = newValue;
                        this.triggerUpdateCallbacks(variableName);
                    }
                }
            });
        }

        private triggerUpdateCallbacks(variableName:string):void {
            if(this.variableUpdateCallbacks.has(variableName)) {
                let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
                for(let i = 0, length = updateCallbacks.length; i < length; i++) {
                    updateCallbacks[i](variableName);
                }
            }
            this.update(variableName);
            if(this.update instanceof Function) {
                this.update(variableName);
            }
        }

    }
}