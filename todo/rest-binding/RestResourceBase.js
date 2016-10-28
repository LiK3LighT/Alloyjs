import Alloy from "../../core/Alloy";

let updatePath = function() {
    let parent = this.getParent();
    let path = "/" + this.getName();
    if(parent !== null) {
        path = parent.getPath() + path;
    }
    this.setPath(path);
};

let deepClone = function(value) {
    if(value instanceof RestResourceBase) {
        value = value.clone();
    } else if(value instanceof Array) {
        for(let i = 0, length = value.length; i < length; i++) {
            value[i] = deepClone(value[i]);
        }
    } else if(value instanceof Object) {
        for(let key in value) {
            if(!value.hasOwnProperty(key)) continue;

            value[key] = deepClone(value[key]);
        }
    }
    return value;
};

export default class RestResourceBase extends Alloy.DataBinding {

    constructor(options) {
        let dataProvider;
        let onError;
        if(options instanceof Object) {
            dataProvider = options.dataProvider;
            onError = options.onError;
        }

        super(dataProvider, "", true);

        this._.onError = onError;

        this._.name = "";
        this._.parent = null;
    }

    getStructure() { // Yes there is no structure in the base class, it has to be implemented in the implementation classes this is needed for the clone method
        return this._.structure;
    }

    getOnError() {
        return this._.onError;
    }

    setOnError(onError) {
        this._.onError = onError;
    }

    getName() {
        return this._.name;
    }

    setName(name) {
        this._.name = name;

        updatePath.call(this);
    }

    getParent() {
        return this._.parent;
    }

    setParent(parent) {
        this._.parent = parent;

        this.setDataProvider(parent.getDataProvider());

        updatePath.call(this);
    }

    parseErrors(errors) {
        if(this._.onError instanceof Function) {
            this._.onError(errors); // Decide if onError is executed for every error in errors array / object
        }
    }

    parseData(data) {
        for (let key in data) {
            if (!data.hasOwnProperty(key)) continue;

            this[key] = data[key];
        }
    }

    parseUpdate(result) {
        if(result.data !== undefined) {
            this.parseData(result.data);
        }
        if(result.errors !== undefined) {
            this.parseErrors(result.errors);
        }
    }

    update() {
        return new Promise((resolve, reject) => {
            super.baseUpdate().then(() => {
                resolve(this);
            }).catch((error) => {
                reject(error);  // Evaluate if I handle errors here or not... e.g. check jsonapi.org if there is a standard... like only give 200 messages and stuff
            });
        });
    }

    clone() {
        let copy = new this.constructor(this.getStructure(), {
            dataProvider: this.getDataProvider(),
            onError: this.getOnError()
        });
        copy.setName(this.getName());

        for(let key in this) {
            if(!this.hasOwnProperty(key)) continue;

            copy[key] = deepClone(this[key]);
        }

        return copy;
    }

}