import * as Alloy from "../src/Alloy"

@Alloy.component()
export class DuplicateChild extends Alloy.Component {

    private children1:Alloy.NodeArray;

    constructor() {
        super({
            template: "</div><div><slot></slot></div><div>${this.children1}</div>"
        });
    }

    created() {
        this.children1 = this.getAssignedSlotNodes().clone();
    }

}