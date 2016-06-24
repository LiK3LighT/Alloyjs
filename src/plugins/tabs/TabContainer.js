"use strict";

class TabContainer extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "<div class='controls'><span for='let pane in this.panes'>$(pane.title)</span></div>${this.panes}",
            templateMethod: "inline"
        });
    }

    attached() {
        this.panes = this.getTranscludedChildren();
        this.panes[0] = 'test';
    }

}
Alloy.register(TabContainer);