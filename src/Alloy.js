"use strict";

var Alloy = {
	Component: Component,
	register: function(component) {
        document.registerElement(StringUtils.toDashed(component.name), component);
    },
    get: function(selector) {
        return document.querySelector(selector);
    }
};