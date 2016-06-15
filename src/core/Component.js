"use strict";

class Component extends HTMLElement {

    constructor() {
        super();
    }

    attributeChangedCallback(a, b, c, d) {
        console.log("attributeChangedCallback", a, b, c, d);
    }

}