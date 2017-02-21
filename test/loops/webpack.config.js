const webpack = require("webpack");

module.exports = {
    cache: true,
    entry: "./bundle.ts",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    devtool: 'source-map',
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            }
        ]
    },
    /*plugins: [ // UglifyJs does not yet support ES6
     new webpack.optimize.UglifyJsPlugin({
     })
     ]*/
};