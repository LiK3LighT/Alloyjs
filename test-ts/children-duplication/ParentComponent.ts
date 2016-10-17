import * as Alloy from "../../src-ts/Alloy"

export class ParentComponent extends Alloy.Component {

    private children1:Alloy.NodeArray;
    private children2:Alloy.NodeArray;
    private counter:number;

    constructor(rootNode) {
        super(rootNode, {
            template: "<div>${this.children1}</div><div>${this.children2}</div>"
        });
    }

    attached() {
        //console.log(this, "evaluated");

        this.children1 = this.getTranscludedChildren();
        this.children2 = this.getTranscludedChildren().clone();
        this.counter = 42;

        setInterval(() => {
            this.counter++;
        }, 1000);
    }

}
Alloy.register(ParentComponent);