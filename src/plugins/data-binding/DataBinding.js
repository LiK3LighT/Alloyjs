import Alloy from "../../core/Alloy";

Alloy.DataBinding = class DataBinding extends Object {

    constructor(dataProvider, path, dontCreate) {
        super();

        this._ = {};

        this._.dataProvider = dataProvider;
        this._.path = path;
        this._.intervalIndex = null;

        if(!dontCreate) {
            return Object.create(this);
        }
    }

    setPath(path) {
        this._.path = path;
    }

    getPath() {
        return this._.path;
    }

    setDataProvider(dataProvider) {
        this._.dataProvider = dataProvider;
    }

    getDataProvider() {
        return this._.dataProvider;
    }

    parseUpdate(result) {
        for(let key in result) {
            if(!result.hasOwnProperty(key)) continue;

            this[key] = result[key];
        }
    }

    baseUpdate() {
        let promise = this._.dataProvider.get(this._.path);
        promise.then((result) => {
            this.parseUpdate(result);
        });
        return promise;
    }

    update() {
        return this.baseUpdate();
    }

    get() {
        return this.update();
    }

    setUpdateInterval(milliseconds) {
        this._.intervalIndex = setInterval(() => {
            this.update();
        }, milliseconds);
    }

    clearUpdateInterval() {
        clearInterval(this._.intervalIndex);
    }

};