"use strict";

class TabPane extends Alloy.Component {

    constructor(rootNode) {
        rootNode.classList.add("${this.selected===true?'selected':''}");
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