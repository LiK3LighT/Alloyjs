import * as Alloy from "../../src/Alloy"

@Alloy.component()
export class OnclickFunction extends Alloy.Component {

    private entries:string[];

    constructor() {
        super({
            template: "<button onclick='this.test(event)'>click me!</button>"
        });

        this.created.then(() => {
            this.entries = ["a", "b", "c"];
        });
    }

    test(event) {
        console.log(this.entries);
    }

}