import Cache from "./Cache";

const DEFAULT_METHOD = "get";
const DEFAULT_MIME_TYPE = null; // Automatic
const DEFAULT_RESPONSE_TYPE = null; // Automatic
const DEFAULT_CACHE_STATE = true;

export default class XHRLoader {
    static load(url, options, onProgress) {
        return new Promise((resolve, reject) => {
            if(options === undefined) options = {};

            options.cache = options.cache !== undefined ? options.cache : DEFAULT_CACHE_STATE;
            if(options.cache) {
                Cache.get(url).then(resolve).catch(function() {
                    XHRLoader._load(url, options, onProgress).then(resolve).catch(reject);
                });
            } else {
                XHRLoader._load(url, options, onProgress).then(resolve).catch(reject);
            }
        });
    }

    static _load(url, options, onProgress) {
        return new Promise((resolve, reject) => {
            let method = options.method || DEFAULT_METHOD;
            //noinspection JSUnresolvedVariable
            let mimeType = options.mimeType || DEFAULT_MIME_TYPE;
            let responseType = options.responseType || DEFAULT_RESPONSE_TYPE;

            let request = new XMLHttpRequest();
            if(mimeType) request.overrideMimeType(mimeType);
            if(responseType) request.responseType = responseType;
            request.open(method, url, true);

            if(onProgress) request.addEventListener("progress", onProgress, false);


            request.addEventListener("load", function() {
                if(this.status === 200) {
                    if(options.cache) {
                        Cache.set(url, this.response);
                    }
                    resolve(this.response);
                } else {
                    reject(this);
                }
            }, false);

            request.addEventListener("error", function() {
                reject(this);
            }, false);

            request.send();
        });
    }
}