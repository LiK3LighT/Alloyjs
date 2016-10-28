import Alloy from "../../core/Alloy";
import RestResourceBase from "./RestResourceBase";

let recursiveSetParent = function(item) {
    if(item instanceof RestResourceBase) {
        item.setParent(this);
    } else if(item instanceof Array) {
        for(let i = 0, length = item.length; i < length; i++) {
            recursiveSetParent.call(this, item[i]);
        }
    } else if(item instanceof Object) {
        for(let key in item) {
            if(!item.hasOwnProperty(key)) continue;

            recursiveSetParent.call(this, item[key]);
        }
    }
};

Alloy.RestResourceList = class RestResourceList extends RestResourceBase {

    constructor(structure, options) {
        super(options);

        this._.structure = structure;

        return Object.create(this);
    }

    parseData(data) {
        if(data instanceof Array) {
            for (let i = 0, index; (index = data[i]) !== undefined; i++) {
                this[index] = this.getStructure().clone();
                this[index].setParent(this);
                this[index].setName(index);

                for (let key in this[index]) {
                    if (!this[index].hasOwnProperty(key)) continue;

                    recursiveSetParent.call(this[index], this[index][key]);
                }
            }
        } else if(data instanceof Object) {
            for (let key in data) {
                if (!data.hasOwnProperty(key)) continue;

                recursiveSetParent.call(this, data[key]);
                this[key] = data[key];
            }
        }
    }

};