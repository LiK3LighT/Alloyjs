import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class NestedForSlotShadowed extends Alloy.Component {

    private test2:Number[];

    constructor() {
        super({
            template: "<slot>",
            shadowContent: true
        });
    }

    created() {
        this.test2 = [1, 2, 3, 4]
    }

}