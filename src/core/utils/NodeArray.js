//noinspection JSUnusedLocalSymbols
export default class NodeArray extends Array {
    constructor(nodeList) {
        super();
        if(nodeList instanceof NodeList) {
            for (let i = 0, length = nodeList.length; i < length; i++) {
                this[i] = nodeList[i];
            }
        }
    }
}