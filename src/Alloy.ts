import {Component} from "./core/Component";
import {Attribute} from "./core/Attribute";
import {StringUtils} from "./utils/StringUtils";
import {NodeArray} from "./core/NodeArray";

export {Component};
export {Attribute};
export {NodeArray};

export interface ComponentDecoratorOptions {
    name?: string,
    extend?: string
}

export function component(options:ComponentDecoratorOptions = {}) {
    return (target:Function) => {
        if(!options.name) { // yes this is intended checks for some default to auto values
            options.name = StringUtils.toDashed(target.name);
        }

        let observedAttributesArray = [];
        for(let attributeName in target["attributes"]) {
            if(!target["attributes"].hasOwnProperty(attributeName)) continue;

            observedAttributesArray[observedAttributesArray.length] = StringUtils.toDashed(attributeName);
        }
        target["observedAttributes"] = observedAttributesArray;

        if (options.extend !== undefined) {
            customElements.define(options.name, target, {"extends": options.extend});
        } else {
            customElements.define(options.name, target);
        }
    }
}

//TODO: fix this decorator, it somehow throws error at compiled bundle, probably because For & OnClick are loaded directly below
export function attribute(name?:string) {
    return (target: Function) => {
        Component.registerAttribute(target, name);
    }
}

// Import default plugins
import "./plugins/loops/LoopFor";
import "./plugins/events/OnClick";