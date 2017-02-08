import * as Alloy from "../src/Alloy"

@Alloy.component()
export class ForInContent extends Alloy.Component {

    private entries:Number[] = [];

    constructor() {
        super({
            template: "<div for='let key in this.entries'>${this.entries[key]}</div>"
        });
    }

    created() {
        setInterval(() => {
            this.entries.push(this.entries.length);
        }, 2000)
    }

}