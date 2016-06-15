"use strict";

class ChangeableNodeList {

    constructor(nodeList) {
        if(nodeList.length > 0) {
            this._nodeArray = [];
            for(let i = 0, node; node = nodeList[i]; i++) {
                this._nodeArray[i] = node;
            }
            this._parentNode = this._nodeArray[0].parentNode;
        }
    }

    *[Symbol.iterator]() {
        for(let i = 0, node; node = this._nodeArray[i]; i++) {
            yield node;
        }
    }

    appendChild(newNode) {
        let lastIndex = this._nodeArray.length - 1;
        this._parentNode.appendChild(newNode);
        this._nodeArray[lastIndex] = newNode;
    }

    insertAfter(newNode, referenceNode) {
        this._parentNode.insertBefore(newNode, referenceNode.nextSibling);
        this._nodeArray.splice(this._nodeArray.indexOf(referenceNode) + 1, 0, newNode);
    }

    insertBefore(newNode, referenceNode) {
        this._parentNode.insertBefore(newNode, referenceNode);
        this._nodeArray.splice(this._nodeArray.indexOf(referenceNode), 0, newNode);
    }

    set(index, newNode) {
        if(this._nodeArray[index]) {
            this._parentNode.replaceChild(newNode, this._nodeArray[index]);
        } else {
            if(this._nodeArray[index + 1]) {
                this._parentNode.insertBefore(newNode, this._nodeArray[index + 1]);
            } else if(this._nodeArray[index - 1]) {
                this._parentNode.insertAfter(newNode, this._nodeArray[index - 1]);
            } else {
                throw new Error('Something went fatally wrong with this class, maybe I have to implement a algorithm to find the nearest array index positive to 0 in both directions');
            }
        }
        this._nodeArray[index] = newNode;
    }

    get(index) {
        return this._nodeArray[index];
    }

    remove(index) {
        let childToRemove = this._nodeArray[index];
        this._nodeArray.splice(index, 1);
        this._parentNode.removeChild(childToRemove);
    }

}