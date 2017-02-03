import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class TestComponent extends Alloy.Component {

    private entries:string[];

    constructor() {
        super({
            template: "<looped-component for='let key in this.entries'>${this.entries[key]}</looped-component>"
        });
    }

    created() {
        this.entries = ["a", "b", "c"];
    }

}