import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class NodeText extends Alloy.Component {

    private text:string;

    constructor() {
        super({
            template: "${this.text}"
        });
    }

    created() {
        this.text = "Hello world!";
    }

}