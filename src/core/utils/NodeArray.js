export default class NodeArray extends Array {
    constructor(array) {
        super();
        if(array instanceof Array) {
            for (let i = 0, length = array.length; i < length; i++) {
                this[i] = array[i];
            }
        }
    }
}