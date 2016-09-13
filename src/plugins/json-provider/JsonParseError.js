const errorMessageLength = 50;

export default class JsonParseError extends Error {

    constructor(error, jsonString, ...data) {
        super();
        let errorPosition = error.message.split(" ");
        errorPosition = errorPosition[errorPosition.length - 1];
        this.message = error.message + " (" + jsonString.substr(Math.max(errorPosition - (errorMessageLength / 2), 0), errorMessageLength).trim() + ") " + data.join(" ");
        this.stack = error.stack;
        this.name = error.name;
    }

}