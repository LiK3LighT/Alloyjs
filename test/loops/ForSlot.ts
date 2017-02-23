import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class ForSlot extends Alloy.Component {

    private test:Object[];

    constructor() {
        super({
            template: "<slot>"
        });
    }

    created() {
        this.test = [
            {
                "a": 0,
                "b": 1
            },
            {
                "a": 0,
                "b": 1
            }
        ]
    }

}