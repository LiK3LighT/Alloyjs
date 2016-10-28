import Alloy from "../../core/Alloy";
import RestResourceBase from "./RestResourceBase";

let recursiveSetNameAndParent = function(item, name) {
    if(item instanceof RestResourceBase) {
        item.setParent(this);
        item.setName(name);
    } else if(item instanceof Array) {
        for(let i = 0, length = item.length; i < length; i++) {
            recursiveSetNameAndParent.call(this, item[i], name + "/" + i);
        }
    } else if(item instanceof Object) {
        for(let key in item) {
            if(!item.hasOwnProperty(key)) continue;

            recursiveSetNameAndParent.call(this, item[key], name + "/" + key);
        }
    }
};

Alloy.RestResource = class RestResource extends RestResourceBase {

    constructor(structure, options) {
        super(options);

        let instance = Object.create(this);

        for(let key in structure) {
            if(!structure.hasOwnProperty(key)) continue;

            let item = structure[key];
            recursiveSetNameAndParent.call(this, item, key);
            instance[key] = item;
        }

        return instance;
    }

};