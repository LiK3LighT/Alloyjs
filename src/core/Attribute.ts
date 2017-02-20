import {Component} from "./Component";

export class Attribute {

    protected component:Component;

    private attributeNode:Attr;
    private variablesRegExp = /\s*(this\.[a-zA-Z0-9_$]+)\s*/g; // Note: for future regexes, ignore let and var variables here.

    constructor(attributeNode:Attr) {
        this.attributeNode = attributeNode;
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

    getComponent() {
        return this.component;
    }

    protected update(variableName:string): void {

    }
}