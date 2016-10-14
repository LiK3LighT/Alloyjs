namespace Alloy {

    export class Attribute {

        protected update:(variableName:string) => void;

        private component:Component;
        private variablesRegExp = /\s*this\.([a-zA-Z0-9_$]+)\s*/g;

        constructor(attributeNode:Attr) {
            this.component = attributeNode._alloyComponent;

            let variables = new Set();
            let variableMatch;
            this.variablesRegExp.lastIndex = 0;
            while (variableMatch = this.variablesRegExp.exec(attributeNode.value)) {
                variables.add(variableMatch[1]);
                this.component.addUpdateCallback(variableMatch[1], (variableName) => {
                    this.update(variableName);
                });
            }
        }

    }
}