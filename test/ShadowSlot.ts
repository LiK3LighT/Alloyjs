import * as Alloy from "../src/Alloy"
import {NodeArray} from "../src/core/NodeArray";

@Alloy.component()
export class ShadowSlot extends Alloy.Component {

    private slotCopy:NodeArray;

    constructor() {
        super({
            template: "<b><slot></slot></b><i>${this.slotCopy}</i>",
            style: "b { color: red; } i { color: orange; }",
            shadowContent: true,
        });
    }

    created() {
        this.slotCopy = this.getAssignedSlotNodes().clone();
    }

}