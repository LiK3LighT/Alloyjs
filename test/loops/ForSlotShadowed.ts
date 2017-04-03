import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class ForSlotShadowed extends Alloy.Component {

    private test:Object[];

    constructor() {
        super({
            template: "<slot>",
            shadowContent: true
        });

        this.created.then(() => {
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
        });
    }

}