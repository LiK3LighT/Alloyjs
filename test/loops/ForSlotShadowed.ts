import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class ForSlotShadowed extends Alloy.Component {

    private test:Object[];

    constructor() {
        super({
            template: "<slot>",
            shadowContent: true
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