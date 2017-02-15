import * as Alloy from "../src/Alloy"

@Alloy.component()
export class AttributeText extends Alloy.Component {

    private text:string;

    constructor() {
        super({
            template: "<div test='${this.text}'></div>"
        });
    }

    created() {
        this.text = "Hello world!";
    }

}