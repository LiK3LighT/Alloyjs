import * as Alloy from "../../src/Alloy"

export class ChildComponent extends Alloy.Component {

    private text:string;

    constructor() {
        super({
            template: "${this.text}"
        });
    }

    created() {
        this.text = this.getAttribute("text");
    }

}
Alloy.register(ChildComponent);