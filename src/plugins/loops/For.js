const FOR_TYPES = {
    OF: "of",
    IN: "in"
};

class For extends Alloy.Attribute {

    constructor(attributeNode) {
        super(attributeNode);
        let forType = attributeNode.value.indexOf(" in ") !== -1 ? FOR_TYPES.IN : FOR_TYPES.OF;
        let parts = attributeNode.value.split(" " + forType + " ");
        this.toVariable = parts[0].substring(parts[0].indexOf(" ") + 1).trim();
        this.fromVariable = parts[1].substring(parts[1].indexOf(".")+1).trim();
    }

    update() {
        let from = this.component[this.fromVariable];
        console.log(from);
    }

}
Alloy.register(For);