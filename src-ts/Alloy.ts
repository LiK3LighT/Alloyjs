import {Component} from "./core/Component";
import {Attribute} from "./core/Attribute";
import {StringUtils} from "./utils/StringUtils";
import {NodeArray} from "./core/NodeArray";

export {Component};
export {Attribute};
export {NodeArray};

export function register(component:{new(...args:any[])}) {
    if(Component.isPrototypeOf(component)) {
        let prototype = Object.create(HTMLElement.prototype);
        prototype.createdCallback = function() {
            this._component = new component(this);
        };
        prototype.detachedCallback = function() {
            this._component.destructor();
        };
        prototype.attributeChangedCallback = function(name, oldValue, newValue) {
            this._component.attributeChanged(name, oldValue, newValue);
        };
        /*prototype.getComponent = function() {
            return this._component;
        };*/
        prototype.cloneNode = function() {
            return this._component.cloneNode(this.constructor);
        };

        let dashedName = StringUtils.toDashed(component.name);
        window[component.name] = document.registerElement(dashedName, {prototype: prototype});
    } else if(Attribute.isPrototypeOf(component)) {
        Component.registerAttribute(component);
    }
}