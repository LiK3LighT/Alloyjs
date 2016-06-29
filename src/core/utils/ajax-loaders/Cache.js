import IndexedDB from "../indexed-db/IndexedDB";

export default class Cache {
    static get(url, version) {
        version = version || 1;
        return new Promise((resolve, reject) => {
            if(Cache.memory[url]) {
                resolve(Cache.memory[url]);
                return;
            }

            Cache.indexedDB.get(url, {version: version}).then((data) => {
                resolve(data.getValues().resource);
            }).catch((error) => {
                if(error !== undefined) console.warn("Failed to retrieve resource from IndexedDB", error);

                reject();
            });
        });
    }

    static set(url, data, version) {
        version = version || 1;
        Cache.memory[url] = data;
        Cache.indexedDB.set(url, data, version);
    }
}
Cache.memory = {};
Cache.indexedDB = new IndexedDB("cache", 2, "resources", ["url", "resource", "version"]);