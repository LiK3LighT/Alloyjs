"use strict";

class For extends Bind.Component {

    constructor(children) {
        super({
            template: "${this.children}",
            templateMethod: "inline"
        });

        let attributes = this.getAttributes();
        let variableName;
        let keyName;
        let variable;
        if(attributes["in"] !== undefined) {
            variable = this.getParent()[attributes.in];
            variableName = attributes.in;
            keyName = attributes.let;
        } else if(attributes["of"] !== undefined) {
            variable = this.getParent()[attributes.of];
            variableName = attributes.let;
        }

        if(keyName !== undefined) {
            if(variable instanceof Array) {
                for(let i = 0, value; (value = variable[i]) !== undefined; i++) {

                }
            } else {

            }
        }

        console.log(variable);
    }

}
Bind.Component.register(For);