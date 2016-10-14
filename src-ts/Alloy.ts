namespace Alloy {

    export let registeredAttributes = new Map();

    export function register(component: Function) {
        if(Component.isPrototypeOf(component)) {
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
            prototype.cloneNode = function() {
                return this._component.cloneNode(this.constructor);
            };

            let dashedName = Utils.String.toDashed(component.name);
            window[component.name] = document.registerElement(dashedName, {prototype: prototype});
        } else if(Attribute.isPrototypeOf(component)) {
            Alloy.registeredAttributes.set(Utils.String.toDashed(component.name), component);
        }
    }

}