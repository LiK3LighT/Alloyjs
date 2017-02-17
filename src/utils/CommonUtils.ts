export class CommonUtils {

    static addVariableUpdateCallback(parent:Object, childKey:string, callback:(variableName:string) => void):void {
        if(parent[childKey] !== undefined && Object.getOwnPropertyDescriptor(parent, childKey).get !== undefined) return; // If the variable already has a callback skip it

        let underscoredKey = "__" + childKey;
        parent[underscoredKey] = parent[childKey];
        Object.defineProperty(parent, childKey, {
            get: () => {
                return parent[underscoredKey];
            },
            set: (newValue:any) => {
                if(newValue !== undefined && newValue !== null && newValue.constructor === Object || newValue instanceof Array) {
                    const proxyTemplate = {
                        get: (target, property) => {
                            return target[property];
                        },
                        set: (target, property, value) => {
                            if(value instanceof Object) {
                                value = new Proxy(value, proxyTemplate);
                            }
                            if(target[property] !== value) {
                                target[property] = value;
                                callback(childKey);
                            }
                            return true;
                        }
                    };
                    newValue = new Proxy(newValue, proxyTemplate);
                }
                if(parent[underscoredKey] !== newValue) {
                    parent[underscoredKey] = newValue;
                    callback(childKey);
                }
            }
        });
        if(parent[underscoredKey] !== undefined) {
            callback(childKey);
        }
    }

}