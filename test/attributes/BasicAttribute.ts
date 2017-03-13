import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class BasicAttribute extends Alloy.Component {

    static attributes = {
        text: String,
        number: Number,
        object: Object,
        boolean: Boolean
    };

    constructor() {
        super({
            template: "${this.text}<br>${this.number}<br>${this.object}<br>${this.boolean}"
        });
    }

    created() {
        console.log(BasicAttribute.attributes);
    }

}