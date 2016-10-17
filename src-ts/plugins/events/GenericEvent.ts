import * as Alloy from "../../Alloy"
import {For} from "../loops/For"

export class GenericEvent extends Alloy.Attribute { // TODO make this really generic... no .onclick stuff etc.

    constructor(attributeNode) {
        super(attributeNode);

        let component = this.getComponent();
        let variables = For.getScopeVariables(attributeNode.ownerElement);
        let originalFunction = attributeNode.ownerElement.onclick;

        let variableNames = ["event"];
        for(let declaredVariableName in variables) { // no need to check for hasOwnProperty, cause of Object.create(null)
            variableNames[variableNames.length] = declaredVariableName;
        }

        variableNames[variableNames.length] = "(" + originalFunction + ").call(this, event);"; // Add the actual function body to the function apply list

        let newFunction = Function.apply(null, variableNames);

        attributeNode.ownerElement.onclick = function(event) {
            let variableValues = [event];
            for (let declaredVariableName in variables) { // no need to check for hasOwnProperty, cause of Object.create(null)
                //noinspection JSUnfilteredForInLoop
                variableValues[variableValues.length] = variables[declaredVariableName];
            }

            newFunction.apply(component, variableValues);
        };
    }

}