import * as Alloy from "../../src/Alloy"

@Alloy.component({
    extend: "button"
})
export class ExtendNativeButton extends Alloy.Component {

    constructor() {
        super({
            template: "test"
        });

        this.created.then(() => {
            console.log(this);
        });
    }

}