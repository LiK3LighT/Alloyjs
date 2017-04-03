import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class BasicAttribute extends Alloy.Component {

    static attributes = {
        text: String,
        number: Number,
        object: Object,
        boolean: Boolean,
        "dashed-test": String,
        camelTest: String
    };

    constructor() {
        super({
            template: "${this.text}<br>${this.number}<br>${this.object}<br>${this.boolean}<br>${this.dashedTest}<br>${this.camelTest}"
        });

        this.created.then(() => {
            console.log(BasicAttribute.attributes);
        });
    }

}