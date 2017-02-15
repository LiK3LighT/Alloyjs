import * as Alloy from "../../Alloy"
import {For} from "../loops/For"

export class GenericEvent extends Alloy.Attribute {

    constructor(attributeNode:Attr, eventName:string) {
        super(attributeNode);

        let component = this.getComponent();
        let variables = For.getScopeVariables(attributeNode.ownerElement);
        let originalFunction = attributeNode.ownerElement[eventName];

        attributeNode.ownerElement[eventName] = function(event) {
            let variableValues = [event];
            for (let declaredVariableName in variables) { // no need to check for hasOwnProperty, cause of Object.create(null)
                variableValues[variableValues.length] = variables[declaredVariableName];
            }
            originalFunction.apply(component, variableValues);
        };
    }

}