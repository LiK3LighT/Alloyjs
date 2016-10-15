class ParentComponent extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "<div>${this.children1}</div><div>${this.children2}</div>",
            templateMethod: "inline"
        });
    }

    attached() {
        console.log(this, "evaluated");

        this.children1 = this.getTranscludedChildren();
        this.children2 = this.getTranscludedChildren().clone();
        this.counter = 42;

        setInterval(() => {
            this.counter++;
        }, 1000);
    }

}
Alloy.register(ParentComponent);