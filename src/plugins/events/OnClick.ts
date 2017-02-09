import * as Alloy from "../../Alloy"
import {GenericEvent} from "./GenericEvent";

export class OnClick extends GenericEvent {

    constructor(attributeNode) {
        super(attributeNode, "onclick");
    }

}
Alloy.Component.registerAttribute(OnClick, "onclick");