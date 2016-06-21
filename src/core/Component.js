"use strict";

class Component {

    constructor(rootNode, options) {
        this._rootNode = rootNode;
        options.templateMethod = options.templateMethod === undefined ? 'auto' : options.templateMethod;
        if ((options.templateMethod === 'auto' || options.templateMethod === 'ajax') && typeof options.template == "string" && options.template.indexOf(".") === -1) {
            options.template += ".html";
        }

        this._promise = new Promise((resolve, reject) => {
            new Promise((templateResolve, templateReject) => {
                if(options.templateMethod === "inline") {
                    templateResolve(options.template);
                } else {
                    XHRLoader.load(options.template, {cache: false}).then((template) => {
                        templateResolve(template);
                    }).catch((error) => {
                        templateReject(error);
                    });
                }
            }).then((template) => {
                this._rootNode.innerHTML += template;
            }).catch(reject);
        });
    }

}