class ParentComponent extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "<child-component class='${this.counter}'>parent [${this.counter}(fromParent)] [${this.childrenParent}(childrenParent)]</child-component>",
            templateMethod: "inline"
        });
    }

    attached() {
        console.log(this, "evaluated");

        this.childrenParent = this.getTranscludedChildren();
        this.counter = 42;

        setInterval(() => {
            this.counter++;
        }, 1000);
    }

}
Alloy.register(ParentComponent);