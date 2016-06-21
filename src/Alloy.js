"use strict";

var Alloy = {
	Component: Component,
	register: function(component) {
        let prototype = Object.create(HTMLElement.prototype);
        prototype.createdCallback = function() {
            this._component = new component(this);
        };
        prototype.attachedCallback = function() {
            if(this._component.attached instanceof Function) {
                this._component.attached();
            }
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

        window[component.name] = document.registerElement(StringUtils.toDashed(component.name), {prototype: prototype});
    },
    get: function(selector) {
        return document.querySelector(selector);
    }
};