"use strict";

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


        this.component.updateBindings(this.multipliedNode);

        this.appendedChildren = new Map();

        this.forType = attributeNode.value.indexOf(" in ") !== -1 ? FOR_TYPES.IN : FOR_TYPES.OF;

        let parts = attributeNode.value.split(" " + this.forType + " ");
        this.toVariable = parts[0].substring(parts[0].indexOf(" ") + 1).trim();
        this.fromVariable = parts[1].substring(parts[1].indexOf(".") + 1).trim();
    }

    update() {
        let from = this.component[this.fromVariable];
        if(this.forType == FOR_TYPES.IN) {
            for(let key in from) {
                if(!from.hasOwnProperty(key)) continue;

                if(!this.appendedChildren.has(key)) {
                    let newNode = this.multipliedNode.cloneNode(true);
                    newNode._variables = {};
                    newNode._variables[this.toVariable] = key;
                    this.parentNode.appendChild(newNode);
                    this.component.updateBindings(newNode);
                    this.appendedChildren.set(key, newNode);
                }
            }
        }
    }

}
Alloy.register(For);