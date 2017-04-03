import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class AttributeText extends Alloy.Component {

    private text:string;
    private text2:string;

    constructor() {
        super({
            template: "<div test='${this.text + this.text2}'></div>"
        });

        this.created.then(() => {
            this.text = "Hello world!";
            this.text2 = "Blah"
        });
    }

}