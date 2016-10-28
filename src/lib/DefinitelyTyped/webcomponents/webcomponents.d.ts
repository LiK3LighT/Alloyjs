// Type definitions for webcomponents.js 0.6.0
// Project: https://github.com/webcomponents/webcomponentsjs
// Definitions by: Adi Dahiya <https://github.com/adidahiya>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare namespace webcomponents {

    export interface CustomElementInit {
        prototype: HTMLElement;
    }

    export interface CustomElementOptions {
        extends:string;
    }

    export interface CustomElementRegistryPolyfill {
        define(tagName:string, element:CustomElementInit, options?:CustomElementOptions): void;
    }

    export interface HTMLImportsPolyfill {
        IMPORT_LINK_TYPE: string;
        isIE: boolean;
        flags: any;
        ready: boolean;
        rootDocument: Document;
        useNative: boolean;
        whenReady(callback: () => void): void;
    }

    export interface ShadowRootPolyfill extends DocumentFragment {
        innerHTML: string;
        host: Element;
    }

    export interface Polyfill {
        flags: any;
    }

}

declare module "webcomponents.js" {
    export = webcomponents;
}

interface Element {
    createShadowRoot(): webcomponents.ShadowRootPolyfill;
    shadowRoot?: webcomponents.ShadowRootPolyfill;
}

interface Window {
    CustomElementRegistry: webcomponents.CustomElementRegistryPolyfill;
    HTMLImports: webcomponents.HTMLImportsPolyfill;
    WebComponents: webcomponents.Polyfill;
}

declare var customElements:webcomponents.CustomElementRegistryPolyfill;