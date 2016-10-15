class ChildComponent extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "${this.blah}",
            templateMethod: "inline"
        });
    }

    attached() {
        console.log(this, "evaluated");
        this.blah = this.getAttributeValue("test");
    }

}
Alloy.register(ChildComponent);