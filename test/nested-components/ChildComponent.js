class ChildComponent extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: " <br> child [${this.counter}(hopefully not set)] <br> [${this.childrenChild}(childrenChild)]",
            templateMethod: "inline"
        });
    }

    attached() {
        console.log(this, "evaluated");

        this.childrenChild = this.getTranscludedChildren();
    }

}
Alloy.register(ChildComponent);