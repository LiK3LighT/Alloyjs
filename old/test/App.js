'use strict';

class App extends Bind.Component {

    constructor() {
        super({
            template: "app.html"
        });
        this.array = ["test", "test2", "test3"];
        this.test = "test"
    }

    ready() {

    }

}
Bind.Component.register(App);