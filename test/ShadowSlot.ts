import * as Alloy from "../src/Alloy"

@Alloy.component()
export class ShadowSlot extends Alloy.Component {

    private entries:string[];

    constructor() {
        super({
            template: "<b><slot></slot></b>",
            style: "b { color: red; }",
            shadowContent: true,
        });
    }

    created() {

    }

}