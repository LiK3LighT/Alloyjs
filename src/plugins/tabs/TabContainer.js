"use strict";

class TabContainer extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "<div class='controls'><a for='let title of this.titles'>${title}</a></div>${this.panes}",
            templateMethod: "inline"
        });
    }

    attached() {
        this.titles = [];
        this.panes = (new Alloy.NodeArray(this.getTranscludedChildren())).filter((node) => {
            if(node._component instanceof TabPane) {
                return true;
            }
        });
    }

    update(variableName) {
        if(variableName === "panes") {
            this.titles.length = 0;
            for (let i = 0, node; node = this.panes[i]; i++) {
                this.titles[this.titles.length] = node.title;
            }
        }
    }

}
Alloy.register(TabContainer);