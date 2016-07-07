const CONFIG = {
    SRC_ENTRY_FILENAME: "standalone.js",
    OUT_PATH: "dist",
    OUT_FILENAME: "alloy.js",
    MODULE_NAME: "Alloy",
    SRC_PATH: "src/core"
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
    plumber = require("gulp-plumber");

let sourcePaths = [CONFIG.SRC_PATH+"/*.js",CONFIG.SRC_PATH+"/**/*.js"];
gulp.task("delete-temp", () => {
    return del([CONFIG.TEMP_PATH]);
});

gulp.task("convert-es6-modules",["delete-temp"], () => {
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

gulp.task("browserify-alloy",["clean-bundle","convert-es6-modules"], () => {
    return browserify(CONFIG.TEMP_PATH + "/" + CONFIG.SRC_ENTRY_FILENAME, {
        standalone: CONFIG.MODULE_NAME,
        debug: true
    })
        .bundle()
        .on("error", function() {
            this.emit("end");
        })
        .pipe(source(CONFIG.OUT_FILENAME))
        .pipe(gulp.dest(CONFIG.OUT_PATH));
});

gulp.task("build-alloy", (callback) => {
    gulpSequence("browserify-alloy", "delete-temp")(callback);
});

gulp.task("develop", () => {
    gulp.watch(sourcePaths, ["build-alloy"]);
});