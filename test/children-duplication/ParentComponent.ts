import * as Alloy from "../../src/Alloy"

export class ParentComponent extends Alloy.Component {

    private children1:Alloy.NodeArray;
    private children2:Alloy.NodeArray;

    constructor() {
        super({
            template: "</div><div>${this.children1}</div><div>${this.children2}</div>"
        });
    }

    created() {
        this.children1 = this.getTranscludedChildren();
        this.children2 = this.getTranscludedChildren().clone();
    }

}
Alloy.register(ParentComponent);