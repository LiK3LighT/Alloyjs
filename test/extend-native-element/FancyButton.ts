import * as Alloy from "../../src/Alloy"

@Alloy.component({
    extend: "button"
})
export class FancyButton extends Alloy.Component {

    constructor() {
        super({
            template: "test"
        });
    }

    created() {
        console.log(this);
    }

}