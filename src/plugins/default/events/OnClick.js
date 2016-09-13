import GenericEvent from "GenericEvent";

class Onclick extends GenericEvent {

    constructor(attributeNode) {
        super(attributeNode);
    }

}
Alloy.register(Onclick);