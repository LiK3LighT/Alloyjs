import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class NestedForOfTemplate extends Alloy.Component {

    private entries:Number[][] = [];

    constructor() {
        super({
            template:"<div for='let values of this.entries'><br><span for='let value of values'>${value}</span></div>"
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