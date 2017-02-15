import {NodeArray} from "./NodeArray";
import {ComponentOptions} from "./ComponentOptions";
import {NodeUtils} from "../utils/NodeUtils";
import {StringUtils} from "../utils/StringUtils";

const DEFAULT_SLOT_KEY = "";

export class Component extends HTMLElement {

    private static registeredAttributes = new Map();

    private assignedSlotNodes:Map<string, NodeArray> = new Map();

    private variableUpdateCallbacks = new Map();
    private bindMapIndex = new Map();
    private bindMap = new Map();

    public static registerAttribute(attribute:Function, name?: string) {
        if(!name) {
            name = StringUtils.toDashed(attribute.name);
        }
        this.registeredAttributes.set(name, attribute);
    }

    constructor(options:ComponentOptions) {
        super();

        new Promise((resolve, reject) => {
            let templatePromise:Promise<string|void>;
            let stylesheetPromise:Promise<string|void>;
            if(options.template !== undefined) {
                templatePromise = Promise.resolve(options.template);
            } else if (options.templateUrl !== undefined) {
                templatePromise = fetch(options.templateUrl)
                    .then(response => {
                        if(response.ok) {
                            return response.text();
                        } else {
                            reject(new TypeError(response.status + " " + response.statusText));
                        }
                    });
            } else {
                templatePromise = Promise.resolve();
            }

            if(options.style !== undefined) {
                stylesheetPromise = Promise.resolve(options.style);
            } else if (options.styleUrl !== undefined) {
                stylesheetPromise = fetch(options.styleUrl)
                    .then(response => {
                        if(response.ok) {
                            return response.text();
                        } else {
                            reject(new TypeError(response.status + " " + response.statusText));
                        }
                    });
            } else {
                stylesheetPromise = Promise.resolve();
            }

            Promise.all([templatePromise, stylesheetPromise])
                .then((values:(string|void)[]) => {
                    resolve(values);
                }).catch(error => {
                    reject(error);
                });
        }).then((values) => {
            if(values[0] !== undefined) {
                if(options.shadowContent === true) {
                    let shadowRoot = this.attachShadow({"mode": "open"});
                    if(values[1] !== undefined) {
                        shadowRoot.innerHTML += `<style>${values[1]}</style>`;
                    }
                    shadowRoot.innerHTML += values[0];

                    this.updateBindings(shadowRoot);
                } else {
                    let slotChildrenHolder = document.createElement("div");
                    while (this.firstChild) {
                        slotChildrenHolder.appendChild(this.firstChild);
                    }

                    let defaultAssignedSlotNodes = new NodeArray(slotChildrenHolder.childNodes);
                    this.assignedSlotNodes.set(DEFAULT_SLOT_KEY, defaultAssignedSlotNodes);
                    if(values[1] !== undefined) {
                        this.innerHTML += `<style scoped>${values[1]}</style>`;
                    }
                    this.innerHTML += values[0];

                    let slot = this.querySelector("slot");
                    for(let i = 0, length = defaultAssignedSlotNodes.length; i < length; i++) {
                        let node = defaultAssignedSlotNodes[i];
                        slot.appendChild(node);
                    }

                    this.updateBindings(this);
                }
            }

            this.created();
        }).catch((error) => {
            if(error instanceof TypeError) {
                //noinspection TypeScriptUnresolvedVariable
                error = error.stack;
            }
            console.error("Failed to initialize component %o", this, error);
        });
    }

    /* Can be overwritten, is called by constructor */
    protected created():void {

    }

    /* Can be overwritten, is called by triggerUpdateCallbacks */
    //noinspection JSUnusedLocalSymbols
    protected update(variableName:string):void {

    }

    public getAssignedSlotNodes(slotName:string = DEFAULT_SLOT_KEY):NodeArray {
        if(this.shadowRoot !== null && !this.assignedSlotNodes.has(slotName)) {
            this.assignedSlotNodes.set(
                slotName,
                new NodeArray(
                    (this.shadowRoot.querySelector(slotName === DEFAULT_SLOT_KEY ? "slot" : `slot[name=${slotName}]`)as HTMLSlotElement).assignedNodes()
                )
            );
        }
        return this.assignedSlotNodes.get(slotName);
    }

    public addUpdateCallback(variableName:string, callback:(variableName:string) => void):Component {
        if(!this.variableUpdateCallbacks.has(variableName)) {
            this.variableUpdateCallbacks.set(variableName, []);
        }
        let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
        updateCallbacks[updateCallbacks.length] = callback;

        this.trackVariableUpdates(variableName);

        return this;
    }

    //noinspection JSUnusedGlobalSymbols
    public removeUpdateCallback(variableName:string, callback:(variableName:string) => void):Component {
        let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
        updateCallbacks.splice(updateCallbacks.indexOf(callback), 1);
        return this;
    }

    public updateBindings(startElement:Element|ShadowRoot):void {
        this.evaluateAttributeHandlers(startElement);

        if(this.bindMapIndex.has(startElement)) { // if node was already evaluated

            if(!NodeUtils.isNodeChildOfComponent(this, startElement)) { // If not a child of the component anymore, remove from bindMap
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
        } else if(NodeUtils.isNodeChildOfComponent(this, startElement)) { // If this node is not already bound
            NodeUtils.recurseTextNodes(startElement, (node, text) => {
                this.setupBindMapForNode(node, text);
            });
        }

        let nodeList = startElement.childNodes;
        for (let i = 0, node; node = nodeList[i]; i++) {
            this.updateBindings(node);
        }
    }

    private evaluateAttributeHandlers(startElement:Element|ShadowRoot):void { // Creates instances of specific attribute classes into the attribute node itself.
        if(startElement.attributes !== undefined) {
            for (let j = 0, attributeNode; attributeNode = startElement.attributes[j]; j++) {
                if(Component.registeredAttributes.has(attributeNode.name) && attributeNode._alloyAttribute === undefined) {
                    attributeNode._alloyComponent = this;
                    attributeNode._alloyAttribute = new (Component.registeredAttributes.get(attributeNode.name))(attributeNode);
                }
            }
        }
        let nodeList = startElement.childNodes;
        for (let i = 0, node; node = nodeList[i]; i++) {
            this.evaluateAttributeHandlers(node);
        }
    }

    // TODO: Performance save evaluated function objects in the bind mapping and just call these instead of evaluating the functions with every update (Probably not possible because of variables in ._variables that are dynamic)
    private setupBindMapForNode(node:Node, text:string):void {
        let alreadyBoundForNode = new Set();
        this.callForVariablesInText(text, (variableNames) => {
            let thisLessVariableNames = new Set();
            for(let variableName of variableNames) {
                if(variableName.indexOf("this.") === 0) {
                    thisLessVariableNames.add(variableName.substring(5));
                } else {
                    thisLessVariableNames.add(variableName);
                }
            }

            for(let variableName of variableNames) {
                if(!alreadyBoundForNode.has(variableName)) {
                    alreadyBoundForNode.add(variableName);
                    if (!this.bindMap.has(variableName)) {
                        this.bindMap.set(variableName, []);
                    }
                    let bindAttributes = this.bindMap.get(variableName);
                    bindAttributes.push([node, text, thisLessVariableNames]);

                    if(!this.bindMapIndex.has(node)) {
                        this.bindMapIndex.set(node, new Set());
                    }
                    let bindMapIndexEntries = this.bindMapIndex.get(node);
                    bindMapIndexEntries.add(variableName);

                    if (Object.getOwnPropertyDescriptor(this, variableName) === undefined || Object.getOwnPropertyDescriptor(this, variableName).set === undefined) {
                        this.trackVariableUpdates(variableName);
                    }
                }
            }
        });
    }

    private evalMatchRegExp = /\${([^}]*)}/g;
    private variablesRegExp = /\s*(this\.[a-zA-Z0-9_$]+)\s*/g;
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

    private trackVariableUpdates(variableName:string):void {
        let thisLessVariableName = variableName.substring(5);
        if(this.hasOwnProperty(thisLessVariableName) && Object.getOwnPropertyDescriptor(this, thisLessVariableName).get !== undefined) return; // If the variable already has a callback skip it

        this["__" + thisLessVariableName] = this[thisLessVariableName];
        Object.defineProperty(this, thisLessVariableName, {
            get: () => {
                return this["__" + thisLessVariableName];
            },
            set: (newValue:any) => {
                if(newValue !== undefined && newValue !== null && newValue.constructor === Object || newValue instanceof Array) {
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
                if(this["__" + thisLessVariableName] !== newValue) {
                    this["__" + thisLessVariableName] = newValue;
                    this.triggerUpdateCallbacks(variableName);
                }
            }
        });
    }

    private updateDom(variableName:string):void {
        if(!this.bindMap.has(variableName)) return;

        for(let value of this.bindMap.get(variableName)) { // Loop through all nodes in which the variable that triggered the update is used in
            let nodeToUpdate = value[0]; // The node in which the variable that triggered the update is in, the text can already be overwritten by the evaluation of evalText
            let evalText = value[1]; // Could contain multiple variables, but always the variable that triggered the update which is variableName

            // Convert the nodeToUpdate to a non TextNode Node
            let htmlNodeToUpdate;
            if(nodeToUpdate instanceof CharacterData) {
                htmlNodeToUpdate = nodeToUpdate.parentElement;
            } else if(nodeToUpdate instanceof Attr) {
                htmlNodeToUpdate = nodeToUpdate.ownerElement;
            } else {
                htmlNodeToUpdate = nodeToUpdate;
            }

            if(htmlNodeToUpdate.parentNode === null) continue; // Skip nodes that are not added to the visible dom, can't use parentElement cause that would be null if the element was in a shadowRoot

            //TODO: this doesn't work with variables that are in the ._variables field, but only with those in the component itself
            // Loop through variables, check if of type node and evaluate them seperately (These variables get removed from the evalText)
            for(let variablesVariableName of value[2]) {
                if(this[variablesVariableName] instanceof NodeArray || this[variablesVariableName] instanceof HTMLElement) {
                    evalText = evalText.replace(new RegExp("\\${\\s*this." + variablesVariableName + "\\s*}", "g"), ""); // Remove already as node identified and evaluated variables from evalText
                    if(variableName === "this."+variablesVariableName) {
                        if(this[variablesVariableName] instanceof NodeArray) {
                            for(let i = 0, length = this[variablesVariableName].length; i < length; i++) {
                                let node = this[variablesVariableName][i];
                                htmlNodeToUpdate.appendChild(node);
                            }
                        } else {
                            htmlNodeToUpdate.appendChild(this[variablesVariableName]);
                        }
                    }
                }
            }

            if(!(nodeToUpdate instanceof HTMLElement)) {
                let evaluated;
                try {
                    let variableDeclarationString = "";
                    // Dynamically add variables that got added to the scope
                    for(let declaredVariableName in htmlNodeToUpdate._variables) { // no need to check for hasOwnProperty, cause of Object.create(null)
                        //noinspection JSUnfilteredForInLoop
                        variableDeclarationString += `let ${declaredVariableName} = ${JSON.stringify(htmlNodeToUpdate._variables[declaredVariableName])};`;
                    }
                    // All this. variables are automatically in the context here so no need to add anything for these
                    evaluated = eval(`${variableDeclarationString} \`${evalText}\``);
                } catch(error) {
                    console.error(error, evalText, "on node", nodeToUpdate);
                }
                if (nodeToUpdate instanceof CharacterData) {
                    nodeToUpdate.textContent = evaluated;
                } else {
                    nodeToUpdate.value = evaluated;
                }
            }
        }
    }

    private triggerUpdateCallbacks(variableName:string):void {
        if(this.variableUpdateCallbacks.has(variableName)) {
            let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
            for(let i = 0, length = updateCallbacks.length; i < length; i++) {
                updateCallbacks[i](variableName);
            }
        }
        this.update(variableName);
        this.updateDom(variableName);
    }

}