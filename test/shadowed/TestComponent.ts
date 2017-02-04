import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class TestComponent extends Alloy.Component {

    private entries:string[];

    constructor() {
        super({
            template: "<button onclick='this.test()'><slot></slot></button>",
            style: "button { color: red; }",
            shadowContent: true,
        });
    }

    created() {
        this.entries = ["a", "b", "c"];
    }

    test() {
        console.log(this.entries);
    }

}