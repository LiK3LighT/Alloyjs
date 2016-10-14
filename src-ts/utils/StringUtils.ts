namespace Alloy.Utils.String {

    const TO_DASHED_REPLACE = "$1-$2";
    let toDashedRegExp = /([a-z])([A-Z])/g;

    export function toDashed(source) {
        toDashedRegExp.lastIndex = 0;
        return source.replace(toDashedRegExp, TO_DASHED_REPLACE).toLowerCase();
    }

}