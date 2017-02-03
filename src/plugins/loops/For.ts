import * as Alloy from "../../Alloy"

const FOR_TYPES = {
    OF: "of",
    IN: "in"
};

//@Alloy.attribute()
export class For extends Alloy.Attribute {

    private multipliedElement:Element;
    private parentNode:Node;
    private forType:string;
    private toVariable:string;
    private fromVariable:string;

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

    constructor(attributeAttr:Attr) {
        super(attributeAttr);

        this.multipliedElement = attributeAttr.ownerElement;
        this.multipliedElement.removeAttribute("for");
        this.parentNode = this.multipliedElement.parentNode;
        this.parentNode.removeChild(this.multipliedElement);

        this.component.updateBindings(this.multipliedElement);

        this.forType = attributeAttr.value.indexOf(" in ") !== -1 ? FOR_TYPES.IN : FOR_TYPES.OF;

        let parts = attributeAttr.value.split(" " + this.forType + " ");
        this.toVariable = parts[0].substring(parts[0].indexOf(" ") + 1).trim();
        this.fromVariable = parts[1].substring(parts[1].indexOf(".") + 1).trim();
    }

    update() {
        let from = this.component[this.fromVariable];
        for(let key in from) {
            if(!from.hasOwnProperty(key)) continue;

            if(!this.appendedChildren.has(key)) {
                let newElement = <Element>this.multipliedElement.cloneNode(true);
                newElement._variables = Object.create(null);
                if(this.forType == FOR_TYPES.IN) {
                    newElement._variables[this.toVariable] = key;
                } else {
                    newElement._variables[this.toVariable] = from[key];
                }
                this.parentNode.appendChild(newElement);
                this.component.updateBindings(newElement);
                this.appendedChildren.set(key, newElement);
            }
        }
        for(let key of this.appendedChildren.keys()) {
            if(!from.hasOwnProperty(key)) {
                let nodeToRemove = this.appendedChildren.get(key);
                this.component.updateBindings(nodeToRemove);
                nodeToRemove.remove();
                this.appendedChildren.delete(key);
            }
        }
    }

}
Alloy.Component.registerAttribute(For);