"use strict";

class NodeListLoader {
    static load(url, onProgress) {
        return new Promise(function(resolve, reject) {
            XHRLoader.load(url, {responseType: "document", cache: false}, onProgress).then(function(document) {
                resolve(document.body.childNodes);
            }).catch(function(error) {
                reject(error);
            });
        });
    }
}