interface Window {
    readonly customElements: CustomElementRegistry;
}
declare let customElements: CustomElementRegistry;

interface CustomElementRegistry {
    define(name: string, constructor: Function, options?: ElementDefinitionOptions): void;
    get(name: string): any;
    whenDefined(name: string): Promise<void>;
}

interface ElementDefinitionOptions {
    "extends": string;
}