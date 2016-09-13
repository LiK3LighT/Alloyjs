import Component from "./base/Component";
import Attribute from "./base/Attribute";
import StringUtils from "./utils/StringUtils";
import NodeArray from "./utils/NodeArray";
import XHRProvider from "./utils/data-providers/XHRProvider";

let _isPrototypeOf = function(object, prototype) {
    if(object.__proto__ === prototype) {
        return true;
    } else if(object.__proto__ != null) {
        return _isPrototypeOf(object.__proto__, prototype);
    } else {
        return false;
    }
};

class Alloy {
	static register(component) {
        if(_isPrototypeOf(component, Component)) {
            let prototype = Object.create(HTMLElement.prototype);
            prototype.createdCallback = function() {
                this._component = new component(this);
            };
            prototype.detachedCallback = function() {
                if(this._component._destructor instanceof Function) {
                    this._component._destructor();
                }
            };
            prototype.attributeChangedCallback = function(name, oldValue, newValue) {
                if(this._component.attributeChanged instanceof Function) {
                    this._component.attributeChanged(name, oldValue, newValue);
                }
            };

            let dashedName = StringUtils.toDashed(component.name);
            window[component.name] = document.registerElement(dashedName, {prototype: prototype});
            //Alloy._registeredComponents.add(dashedName);
        } else if(_isPrototypeOf(component, Attribute)) {
            Alloy._registeredAttributes.set(StringUtils.toDashed(component.name), component);
        }
    }

    static get(selector) {
        return document.querySelector(selector);
    }
}
//Alloy._registeredComponents = new Set();
Alloy._registeredAttributes = new Map();
Alloy.Component = Component;
Alloy.Attribute = Attribute;
Alloy.NodeArray = NodeArray;
Alloy.XHRProvider = XHRProvider;

export default Alloy;