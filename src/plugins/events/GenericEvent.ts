import * as Alloy from "../../Alloy"
import {For} from "../loops/For"

export class GenericEvent extends Alloy.Attribute {

    constructor(attributeNode:Attr, eventName:string) {
        super(attributeNode);

        let component = this.getComponent();
        let variables = For.getScopeVariables(attributeNode.ownerElement);
        let originalFunction = attributeNode.ownerElement[eventName];

        let variableNames = ["event"];
        for(let declaredVariableName in variables) { // no need to check for hasOwnProperty, cause of Object.create(null)
            variableNames[variableNames.length] = declaredVariableName;
        }

        let newFunction;
        eval(`newFunction = function(${variableNames.join(",")}) {(${originalFunction}).call(this,event);}`); // This is 50% faster than Function.apply(null,[])

        attributeNode.ownerElement[eventName] = function(event) {
            let variableValues = [event];
            for (let declaredVariableName in variables) { // no need to check for hasOwnProperty, cause of Object.create(null)
                variableValues[variableValues.length] = variables[declaredVariableName];
            }

            newFunction.apply(component, variableValues);
        };
    }

}