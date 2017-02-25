import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class NestedForInTemplate extends Alloy.Component {

    private entries:Number[][] = [];

    constructor() {
        super({
            template:"<div loop-for='let key in this.entries'><br><span loop-for='let key2 in this.entries[key]'>${this.entries[key][key2]}</span></div>"
        });
    }

    created() {
        let self = this;
        self.entries = [
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [1, 2, 3, 4]
        ];
    }

}