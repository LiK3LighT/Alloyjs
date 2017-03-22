import * as Alloy from "../../Alloy"

const FOR_TYPES = {
    OF: "of",
    IN: "in"
};

//@Alloy.attribute()
export class LoopFor extends Alloy.Attribute {

    private multipliedElement:Element;
    private parentNode:Node;
    private nextSibling:Node;
    private forType:string;
    private toVariable:string;
    private fromVariable:string;
    private lastInsertedKey:(number|string);

    private appendedChildren = new Map();

    public static getScopeVariables(element:Element) {
        if(element._variables) {
            return element._variables;
        } else if(element._component) {
            return null;
        }
        if(element.parentElement !== null) {
            return this.getScopeVariables(element.parentElement);
        }
        return null;
    }

    constructor(attributeNode:Attr) {
        super(attributeNode);

        this.multipliedElement = attributeNode.ownerElement;
        this.nextSibling = this.multipliedElement.nextSibling;

        this.multipliedElement.removeAttribute("loop-for");
        this.parentNode = this.multipliedElement.parentNode;
        this.parentNode.removeChild(this.multipliedElement);

        this.component.updateBindings(this.multipliedElement);

        this.forType = attributeNode.value.indexOf(" in ") !== -1 ? FOR_TYPES.IN : FOR_TYPES.OF;

        let parts = attributeNode.value.split(" " + this.forType + " ");
        this.toVariable = parts[0].substring(parts[0].indexOf(" ") + 1).trim();
        this.fromVariable = parts[1].substring(parts[1].indexOf(".") + 1).trim();
    }

    private finalizeInsertedElement(newElement:Element, insertBeforeNode:Node, key:string, from:any) {
        newElement._variables = Object.create(null);
        this.parentNode.insertBefore(newElement, insertBeforeNode);
        if(this.forType == FOR_TYPES.IN) {
            newElement._variables[this.toVariable] = key;
        } else {
            newElement._variables[this.toVariable] = from[key];
        }
        this.component.updateBindings(newElement);
        this.component.trackVariableUpdates(newElement._variables, this.toVariable);
    }

    // Optimize this ...
    update(name) {
        let from = this.component[this.fromVariable];

        for(let key in from) {
            if(!from.hasOwnProperty(key)) continue;

            if(!this.appendedChildren.has(key)) {

                let insertBeforeNode:Node;
                if(from instanceof Array) {
                    let intKey = parseInt(key);

                    if(this.appendedChildren.has((intKey-1).toString())) {
                        insertBeforeNode = this.appendedChildren.get((intKey-1).toString()).nextSibling;
                    } else if(this.appendedChildren.size !== 0) {
                        insertBeforeNode = this.appendedChildren.get(this.lastInsertedKey).nextSibling;
                    } else {
                        insertBeforeNode = this.nextSibling;
                    }

                } else {
                    if(this.appendedChildren.size !== 0) {
                        insertBeforeNode = this.appendedChildren.get(this.lastInsertedKey).nextSibling;
                    } else {
                        insertBeforeNode = this.nextSibling;
                    }
                }
                this.lastInsertedKey = key;

                let newElement = <Element>this.multipliedElement.cloneNode(true);
                this.appendedChildren.set(key, newElement);

                if(newElement["isAlloyComponent"] === true) {
                    (newElement as Alloy.Component).created = () => {
                        this.finalizeInsertedElement(newElement, insertBeforeNode, key, from);
                    }
                } else {
                    this.finalizeInsertedElement(newElement, insertBeforeNode, key, from);
                }
            }
        }
        if(this.appendedChildren !== undefined) {
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

}
Alloy.Component.registerAttribute(LoopFor);