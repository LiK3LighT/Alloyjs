export class NodeUtils {

    static isNodeChildOfComponent(parent:Node, child:Node) {
        let root = child.getRootNode();
        if(root instanceof ShadowRoot) {
            if((root as ShadowRoot).host === parent) {
                return true;
            }
        } else {
            let parentElement = child.parentElement;
            if(parentElement === parent) {
                return true;
            }
            if(parentElement === null || parentElement === document.body || parentElement["isAlloyComponent"] !== undefined) {
                return false;
            }
            return this.isNodeChildOfComponent(parent, parentElement);
        }
        return false;
    }

    static recurseTextNodes(startNode:Node, callback:(attributeNode:Node, text:string) => any) {
        if(startNode instanceof CharacterData && startNode.textContent !== "") {
            callback(startNode, startNode.textContent);
        }
        if(startNode.attributes !== undefined) {
            for (let j = 0, attributeNode; attributeNode = startNode.attributes[j]; j++) {
                if(attributeNode.value != "") {
                    callback(attributeNode, attributeNode.value);
                }
            }
        }

        let nodeList = startNode.childNodes;
        for (let i = 0, node; node = nodeList[i]; i++) {
            if (!(node instanceof CharacterData)) {
                continue;
            }
            this.recurseTextNodes(node, callback);
        }
    }

}