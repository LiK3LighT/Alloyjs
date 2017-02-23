interface Node {
    getRootNode(options?: GetRootNodeOptions): Node
}

interface GetRootNodeOptions {
    composed: boolean
}

//noinspection ES6ConvertVarToLetConst
declare var ShadowRoot: {
    prototype: ShadowRoot
    new(): ShadowRoot
};