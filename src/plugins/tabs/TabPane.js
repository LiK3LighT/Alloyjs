"use strict";

class TabPane extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "${this.content}",
            templateMethod: "inline"
        });
    }

    attached() {
        this.content = this.getTranscludedChildren();
    }

}
Alloy.register(TabPane);