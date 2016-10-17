const TO_DASHED_REPLACE = "$1-$2";

export class StringUtils {

    private static toDashedRegExp = /([a-z])([A-Z])/g;

    static toDashed(source) {
        this.toDashedRegExp.lastIndex = 0;
        return source.replace(this.toDashedRegExp, TO_DASHED_REPLACE).toLowerCase();
    }

}