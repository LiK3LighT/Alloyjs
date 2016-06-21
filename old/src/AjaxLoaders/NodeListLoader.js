"use strict";

class NodeListLoader {
    static load(url, onProgress) {
        return new Promise((resolve, reject) => {
            XHRLoader.load(url, {responseType: "document", cache: false}, onProgress).then((document) => {
                resolve(document.body.childNodes);
            }).catch((error) => {
                reject(error);
            });
        });
    }
}