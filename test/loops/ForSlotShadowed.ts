import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class ForSlotShadowed extends Alloy.Component {

    private test:Number[];

    constructor() {
        super({
            template: "<slot>",
            shadowContent: true
        });
    }

    created() {
        this.test = [1, 2, 3, 4];
    }

}