import * as Alloy from "../src/Alloy"

@Alloy.component({
    extend: "button"
})
export class ExtendNativeButton extends Alloy.Component {

    constructor() {
        super({
            template: "test"
        });
    }

    created() {
        console.log(this);
    }

}