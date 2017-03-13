const TO_DASHED_REPLACE = "$1-$2";

export class StringUtils {

    private static toDashedRegExp = /([a-z])([A-Z])/g;
    private static toCamelCaseRegExp = /-([a-z])/g;

    static toDashed(source:string) {
        this.toDashedRegExp.lastIndex = 0;
        return source.replace(this.toDashedRegExp, TO_DASHED_REPLACE).toLowerCase();
    }

    static toCamelCase(source:string) {
        this.toCamelCaseRegExp.lastIndex = 0;
        return source.replace(this.toCamelCaseRegExp, (g) => {
            return g[1].toUpperCase();
        });
    }

}