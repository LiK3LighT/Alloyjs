import Component from "./core/Component";
import Attribute from "./core/Attribute";
import StringUtils from "./core/utils/StringUtils";

class Alloy {
	static register(component) {
        if(component.__proto__ === Component) {
            let prototype = Object.create(HTMLElement.prototype);
            prototype.createdCallback = function() {
                this._component = new component(this);
            };
            prototype.detachedCallback = function() {
                if(this._component.destructor instanceof Function) {
                    this._component.destructor();
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
        } else if(component.__proto__ === Attribute) {
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

export default Alloy;