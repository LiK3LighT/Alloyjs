import {NodeArray} from "./NodeArray";
import {ComponentOptions} from "./ComponentOptions";
import {NodeUtils} from "../utils/NodeUtils";
import {StringUtils} from "../utils/StringUtils";
import {CommonUtils} from "../utils/CommonUtils";

const DEFAULT_SLOT_KEY = "";

export class Component extends HTMLElement {

    private static registeredAttributes = new Map();
    private isAlloyComponent = true;
    private attributeTypes:Object;

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

        this.attributeTypes = this.constructor["attributes"];

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

                    // Need to update both the shadowRoot and the slot content
                    this.updateBindings(shadowRoot);
                    this.updateBindings(this);
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

        if(variableName.indexOf("this.") === 0) {
            CommonUtils.addVariableUpdateCallback(this, variableName.substring(5), () => {
                this.triggerUpdateCallbacks(variableName);
            });
        }

        return this;
    }

    public trackVariableUpdates(parent:Object, childKey:string):void {
        CommonUtils.addVariableUpdateCallback(parent, childKey, () => {
            this.triggerUpdateCallbacks(childKey);
        });
    }

    //noinspection JSUnusedGlobalSymbols
    public removeUpdateCallback(variableName:string, callback:(variableName:string) => void):Component {
        let updateCallbacks = this.variableUpdateCallbacks.get(variableName);
        updateCallbacks.splice(updateCallbacks.indexOf(callback), 1);
        return this;
    }

    public updateBindings(element:Element|ShadowRoot):void {
        let inBindMap = this.bindMapIndex.has(element);
        if(!NodeUtils.isNodeChildOfComponent(this, element) && element !== this) {
            if(inBindMap === true) {
                let bindMapKeys = this.bindMapIndex.get(element);
                for(let bindMapKey of bindMapKeys) {
                    let bindMap = this.bindMap.get(bindMapKey);
                    for(let i = 0, length = bindMap.length; i < length; i++) {
                        if(bindMap[i][0] === element) {
                            bindMap.splice(i, 1);
                        }
                    }
                }
                this.bindMapIndex.delete(element);
            }
            return; // Dont update bindings of elements that are not a child of this specific component
        }

        this.evaluateAttributeHandlers(element);

        if(inBindMap === false) { // If this node is not already bound and a child of the component
            NodeUtils.recurseTextNodes(element, (node, text) => {
                this.setupBindMapForNode(node, text);
            });
        }

        let nodeList = element.childNodes;
        for (let i = 0, node; node = nodeList[i]; i++) {
            this.updateBindings(node);
        }
    }

    //noinspection JSUnusedLocalSymbols
    private attributeChangedCallback(name:string, oldValue:string, newValue:string):void {
        let parsedValue:any;
        switch(this.attributeTypes[name]) {
            case String:
                parsedValue = newValue;
                break;
            case Object:
                try {
                    parsedValue = JSON.parse(newValue);
                } catch(error) {
                    console.error("Tried to parse invalid JSON \"%s\" for the attribute \"%s\" in the component \"%s\" maybe try a JSON.stringify", newValue, name, this.constructor.name);
                }
                break;
            case Boolean:
                parsedValue = (newValue === "true" || newValue === "1");
                break;
            case Number:
                parsedValue = parseFloat(newValue);
                break;
            default:
                parsedValue = newValue;
        }
        this[StringUtils.toCamelCase(name)] = parsedValue;
    }

    private evaluateAttributeHandlers(element:Element|ShadowRoot):void { // Creates instances of specific attribute classes into the attribute node itself.
        if(element.attributes !== undefined) {
            for (let j = 0, attributeNode; attributeNode = element.attributes[j]; j++) {
                if(Component.registeredAttributes.has(attributeNode.name) && attributeNode._alloyAttribute === undefined) {
                    attributeNode._alloyComponent = this;
                    attributeNode._alloyAttribute = new (Component.registeredAttributes.get(attributeNode.name))(attributeNode);
                }
            }
        }
        /*let nodeList = element.childNodes; // Probably not needded because evaluateAttributeHanders is executed for every node anyways? // Breaks nested for loops in different components
        for (let i = 0, node; node = nodeList[i]; i++) {
            this.evaluateAttributeHandlers(node);
        }*/
    }

    private static getScopeVariableContainer(element:Element, variableName:string) {
        if(element._variables && element._variables[variableName]) {
            return element._variables;
        } else if(element.parentElement == null) {
            return null;
        }
        return this.getScopeVariableContainer(element.parentElement, variableName);
    }

    // TODO: Performance: save evaluated function objects in the bind mapping and just call these instead of evaluating the functions with every update (Probably not possible because of variables in ._variables that are dynamic)
    private setupBindMapForNode(node:Node, text:string):void {
        let alreadyBoundForNode = new Set();
        this.callForVariablesInText(text, (variableNames) => {
            /*let thisLessVariableNames = new Set();
            for(let variableName of variableNames) {
                if(variableName.indexOf("this.") === 0) {
                    thisLessVariableNames.add(variableName.substring(5));
                } else {
                    thisLessVariableNames.add(variableName);
                }
            }*/

            let variableContainerObjects = new Set();
            for(let variableName of variableNames) {
                if (variableName.indexOf("this.") !== 0) {
                    let containerElement: Element;
                    if (node instanceof CharacterData) {
                        containerElement = node.parentElement;
                    } else if (node instanceof Attr) {
                        containerElement = node.ownerElement;
                    } else {
                        containerElement = node as Element;
                    }
                    let variableContainer = Component.getScopeVariableContainer(containerElement, variableName);
                    if (variableContainer !== null) {
                        variableContainerObjects.add(variableContainer);
                    }
                }
            }

            for(let variableName of variableNames) {
                if(!alreadyBoundForNode.has(variableName)) {
                    alreadyBoundForNode.add(variableName);
                    if (!this.bindMap.has(variableName)) {
                        this.bindMap.set(variableName, []);
                    }
                    let bindAttributes = this.bindMap.get(variableName);

                    bindAttributes.push([node, text, variableContainerObjects]);//, thisLessVariableNames]);

                    if(!this.bindMapIndex.has(node)) {
                        this.bindMapIndex.set(node, new Set());
                    }
                    let bindMapIndexEntries = this.bindMapIndex.get(node);
                    bindMapIndexEntries.add(variableName);

                    if (Object.getOwnPropertyDescriptor(this, variableName) === undefined || Object.getOwnPropertyDescriptor(this, variableName).set === undefined) {
                        if(variableName.indexOf("this.") === 0) {
                            CommonUtils.addVariableUpdateCallback(this, variableName.substring(5), () => {
                                this.triggerUpdateCallbacks(variableName);
                            });
                        }/* else {
                            let containerNode:Element;
                            if(node instanceof CharacterData) {
                                containerNode = node.parentElement;
                            } else {
                                containerNode = node as Element;
                            }

                            CommonUtils.addVariableUpdateCallback(containerNode._variables, variableName, () => {
                                this.triggerUpdateCallbacks(variableName);
                            });
                        }*/
                    }
                }
            }
        });
    }

    //TODO: Performance: it would probably faster to search for this without a regex
    private evalMatchRegExp = /\${([^}]*)}/g;
    private variablesRegExp = /((?:this.)?[a-zA-Z0-9_$]+)(?:(?:]\.|\.)[a-zA-Z0-9_$]+)*/g; // Try it out with "this.abc.def[key].xyz.abc" and "abc.def[key].xyz.abc"
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

    private updateDom(variableName:string):void {
        if(!this.bindMap.has(variableName)) return;

        for(let value of this.bindMap.get(variableName)) { // LoopFor through all nodes in which the variable that triggered the update is used in
            let nodeToUpdate = value[0]; // The node in which the variable that triggered the update is in, the text can already be overwritten by the evaluation of evalText
            let evalText = value[1]; // Could contain multiple variables, but always the variable that triggered the update which is variableName
            let variableContainerObjects = value[2];

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

            //TODO: Make this a seperate expression e.g. {{this.variable}} and remove value[2] from the bindMap
            // LoopFor through variables, check if of type node and evaluate them seperately (These variables get removed from the evalText)
            /*for(let variablesVariableName of value[2]) {
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
            }*/

            if(!(nodeToUpdate instanceof HTMLElement)) {
                let variableDeclarationString = "";
                try {
                    // Dynamically add variables that got added to the scope
                    for(let variableContainerObject of variableContainerObjects) {
                        for(let declaredVariableName in variableContainerObject) { // no need to check for hasOwnProperty, cause of Object.create(null)
                            //noinspection JSUnfilteredForInLoop
                            variableDeclarationString += `let ${declaredVariableName} = ${JSON.stringify(variableContainerObject[declaredVariableName])};`;
                        }
                    }
                    // All this. variables are automatically in the context here so no need to add anything for these
                    let evaluated = eval(`${variableDeclarationString} \`${evalText}\``);

                    if (nodeToUpdate instanceof CharacterData) {
                        nodeToUpdate.textContent = evaluated;
                    } else {
                        nodeToUpdate.value = evaluated;
                    }
                } catch(error) {
                    console.error(error, `${variableDeclarationString} \`${evalText}\``, "on node", nodeToUpdate, "triggered by", variableName);
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