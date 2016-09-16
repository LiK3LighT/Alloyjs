//noinspection JSUnusedLocalSymbols
export default class NodeArray extends Array {
    constructor(nodeList) {
        super();
        if(nodeList instanceof NodeList || nodeList instanceof Array) {
            for (let i = 0, length = nodeList.length; i < length; i++) {
                this[i] = nodeList[i];
            }
        }
    }

    clone() {
        let newNodes = [];
        for(let node of this) {
            newNodes[newNodes.length] = node.cloneNode(true);
        }

        return new NodeArray(newNodes);
    }
}