import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class TestComponent extends Alloy.Component {

    private entries:string[];

    constructor() {
        super({
            template: "<button onclick='this.test()'>click me!</button>"
        });
    }

    created() {
        this.entries = ["a", "b", "c"];
    }

    test() {
        console.log(this.entries);
    }

}