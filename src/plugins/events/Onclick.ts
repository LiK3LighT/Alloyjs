import * as Alloy from "../../Alloy"
import {GenericEvent} from "./GenericEvent";

export class Onclick extends GenericEvent {

    constructor(attributeNode) {
        super(attributeNode);
    }

}
Alloy.register(Onclick);