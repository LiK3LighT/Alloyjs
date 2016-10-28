import {Component} from "./core/Component";
import {Attribute} from "./core/Attribute";
import {StringUtils} from "./utils/StringUtils";
import {NodeArray} from "./core/NodeArray";

export {Component};
export {Attribute};
export {NodeArray};

export function register(component: typeof HTMLElement) {
    if(Component.isPrototypeOf(component)) {
        let dashedName = StringUtils.toDashed(component.name);
        customElements.define(dashedName, component);
    } else if(Attribute.isPrototypeOf(component)) {
        Component.registerAttribute(component);
    }
}

// Import default plugins
import "./plugins/events/Onclick";
import "./plugins/loops/For";