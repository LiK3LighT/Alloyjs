import * as Alloy from "../src/Alloy"

@Alloy.component()
export class ForInContent extends Alloy.Component {

    private entries:string[];

    constructor() {
        super({
            template: "<div for='let key in this.entries'>${this.entries[key]}</div>"
        });
    }

    created() {
        this.entries = ["a", "b", "c"];
    }

}