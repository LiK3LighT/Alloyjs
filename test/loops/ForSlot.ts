import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class ForSlot extends Alloy.Component {

    private test:Number[];

    constructor() {
        super({
            template: "<slot>"
        });
    }

    created() {
        this.test = [1, 2, 3, 4]
    }

}