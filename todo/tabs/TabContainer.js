class TabContainer extends Alloy.Component {

    constructor(rootNode) {
        super(rootNode, {
            template: "<div class='controls' onclick='this.test();'><a for='let key in this.titles' onclick='this.select(this.panes[key]);'>${this.titles[key]}</a></div>${this.panes}",
            templateMethod: "inline"
        });
    }

    attached() {
        this.titles = [];
        this.panes = this.getAssignedSlotNodes().filter((node) => {
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

    test() {
        console.log('blah')
    }

    select(pane) {
        console.log(pane);
        console.log(this);
    }

}
Alloy.register(TabContainer);