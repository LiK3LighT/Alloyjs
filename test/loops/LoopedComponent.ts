import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class LoopedComponent extends Alloy.Component {

    private content:Alloy.NodeArray;

    constructor() {
        super({
            template: "${this.content}"
        });
    }

    created() {
        this.content = this.getSlotChildren();
    }

}