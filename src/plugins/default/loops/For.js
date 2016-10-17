import Alloy from "../../../core/Alloy";

const FOR_TYPES = {
    OF: "of",
    IN: "in"
};

class For extends Alloy.Attribute {

    constructor(attributeNode) {
        super(attributeNode);

        this.multipliedNode = attributeNode.ownerElement;
        this.multipliedNode.attributes.removeNamedItem("for");
        this.parentNode = this.multipliedNode.parentNode;
        this.parentNode.removeChild(this.multipliedNode);

        this._component.updateBindings(this.multipliedNode);

        this.appendedChildren = new Map();

        this.forType = attributeNode.value.indexOf(" in ") !== -1 ? FOR_TYPES.IN : FOR_TYPES.OF;

        let parts = attributeNode.value.split(" " + this.forType + " ");
        this.toVariable = parts[0].substring(parts[0].indexOf(" ") + 1).trim();
        this.fromVariable = parts[1].substring(parts[1].indexOf(".") + 1).trim();
    }

    update() {
        let from = this._component[this.fromVariable];
        for(let key in from) {
            if(!from.hasOwnProperty(key)) continue;

            if(!this.appendedChildren.has(key)) {
                let newNode = this.multipliedNode.cloneNode(true);
                newNode._variables = Object.create(null);
                if(this.forType == FOR_TYPES.IN) {
                    newNode._variables[this.toVariable] = key;
                } else {
                    newNode._variables[this.toVariable] = from[key];
                }
                this.parentNode.appendChild(newNode);
                this._component.updateBindings(newNode);
                this.appendedChildren.set(key, newNode);
            }
        }
        for(let key of this.appendedChildren.keys()) {
            if(!from.hasOwnProperty(key)) {
                let nodeToRemove = this.appendedChildren.get(key);
                this._component.updateBindings(nodeToRemove);
                nodeToRemove.remove();
                this.appendedChildren.delete(key);
            }
        }
    }

}
Alloy.register(For);