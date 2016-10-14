namespace Alloy {

    export class NodeArray extends Array {
        constructor(nodes:NodeList|Array) {
            super();
            for (let i = 0, length = nodes.length; i < length; i++) {
                this[i] = nodes[i];
            }
        }

        clone():NodeArray {
            let newNodes = [];
            for(let node of this) {
                newNodes[newNodes.length] = node.cloneNode(true);
            }

            return new NodeArray(newNodes);
        }
    }

}