namespace Alloy.Utils {

    export function isNodeChildOf(parent:Node, child:Node) {
        if(child.parentElement === parent) {
            return true;
        }
        if(child.parentElement === null || child.parentElement === document.body) {
            return false;
        }
        return isNodeChildOf(parent, child.parentElement);
    }

    export function recurseTextNodes(startNode:Node, callback:(attributeNode:Node, text:string) => any) {
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
            recurseTextNodes(node, callback);
        }
    }

}