import Alloy from "../../core/Alloy";
import JsonParseError from "./JsonParseError";

Alloy.JsonProvider = class JsonProvider extends Alloy.XHRProvider {

    static load(url, data, method, onProgress) {
        return new Promise((resolve, reject) => {
            super.load(url, data, {method: method, responseType: "text"}, onProgress).then((response) => {
                try {
                    resolve(JSON.parse(response));
                } catch(jsonParseException) {
                    reject(new JsonParseError(jsonParseException, response, url));
                }
            }).catch(reject);
        });
    }

};