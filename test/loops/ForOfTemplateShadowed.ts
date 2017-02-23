import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class ForOfTemplateShadowed extends Alloy.Component {

    private entries:Number[] = [];

    constructor() {
        super({
            template: "<div for='let value of this.entries'><b>${value}</b>${value}</div>",
            shadowContent: true
        });
    }

    created() {
        let self = this;
        self.entries = [1, 2, 3, 4];
    }

}