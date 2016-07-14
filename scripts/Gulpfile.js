"use strict";

let es6ModuleTranspiler = require("es6-module-transpiler");
let Container = es6ModuleTranspiler.Container;
let FileResolver = es6ModuleTranspiler.FileResolver;
let BundleFormatter = es6ModuleTranspiler.formatters.bundle;

let container = new Container({
    resolvers: [new FileResolver(['src/'])],
    formatter: new BundleFormatter()
});

container.getModule('Alloy');
container.write('dist/Alloy.js');