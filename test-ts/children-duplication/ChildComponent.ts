import * as Alloy from "../../src-ts/Alloy"

export class ChildComponent extends Alloy.Component {

    private blah:string;

    constructor(rootNode) {
        super(rootNode, {
            template: "${this.blah}"
        });
    }

    attached() {
        //console.log(this, "evaluated");
        this.blah = this.getAttribute("test");
    }

}
Alloy.register(ChildComponent);