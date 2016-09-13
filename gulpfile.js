const CONFIG = {
    SRC_ENTRY_FILENAME: "standalone.js",
    OUT_PATH: "dist",
    OUT_FILENAME: "alloy.js",
    MODULE_NAME: "Alloy",
    SRC_PATH: "src",
    CORE_PATH: "core",
    PLUGIN_PATH: "plugins",
    PLUGINS: [
        "default",
        "data-binding",
        "json-provider",
        "rest-binding"
    ]
};
CONFIG.TEMP_PATH = CONFIG.OUT_PATH+"/temp";


let gulp = require("gulp"),
    babel = require("gulp-babel"),
    browserify = require("browserify"),
    source = require("vinyl-source-stream"),
    buffer = require("vinyl-buffer"),
    rename = require("gulp-rename"),
    uglify = require("gulp-uglify"),
    del = require("del"),
    gulpSequence = require("gulp-sequence"),
    plumber = require("gulp-plumber"),
    fs = require("fs");

const EOL = require("os").EOL;

let sourcePaths = [CONFIG.SRC_PATH + "/*.js", CONFIG.SRC_PATH + "/**/*.js"];
gulp.task("delete-temp", () => {
    return del([CONFIG.TEMP_PATH]);
});

gulp.task("convert-es6",["delete-temp"], () => {
    return gulp.src(sourcePaths)
        .pipe(plumber(function(error) {
            console.error(error.stack);
            this.emit("end");
        }))
        .pipe(babel())
        .pipe(plumber.stop())
        .pipe(gulp.dest(CONFIG.TEMP_PATH));
});

gulp.task("clean-bundle", () => {
    return del([CONFIG.OUT_PATH+"/"+CONFIG.OUT_FILENAME]);
});

gulp.task("generate-standalone", ["clean-bundle","convert-es6"], () => {
    let data = "";
    for(let pluginName of CONFIG.PLUGINS) {
        let pluginPath = CONFIG.PLUGIN_PATH + "/" + pluginName;
        let plugin = JSON.parse(fs.readFileSync(CONFIG.SRC_PATH + "/" + pluginPath +  "/plugin.json"));
        for(let entry of plugin.entries) {
            data += 'require("./' + pluginPath + '/' + entry + '.js");' + EOL;
        }
    }
    data += 'module.exports = require("./' + CONFIG.CORE_PATH + '/' + CONFIG.MODULE_NAME + '").default;';
    fs.writeFileSync(CONFIG.TEMP_PATH + "/" + CONFIG.SRC_ENTRY_FILENAME, data);
});

gulp.task("browserify-alloy",["generate-standalone"], () => {
    return browserify(CONFIG.TEMP_PATH + "/" + CONFIG.SRC_ENTRY_FILENAME, {
        standalone: CONFIG.MODULE_NAME,
        debug: true
    })
        .bundle()
        .on("error", function(error) {
            console.error(error.toString());
            this.emit("end");
        })
        .pipe(source(CONFIG.OUT_FILENAME))
        .pipe(gulp.dest(CONFIG.OUT_PATH));
});

gulp.task("build-alloy", (callback) => {
    gulpSequence("browserify-alloy", "delete-temp")(callback);
});

gulp.task("develop", ["build-alloy"], () => {
    gulp.watch(sourcePaths, ["build-alloy"]);
    console.log("Watching files for changes");
});