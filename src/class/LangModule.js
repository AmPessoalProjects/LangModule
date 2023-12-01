const fs = require("fs").promises;
const path = require("path");

module.exports = class LangModule {
    /**
     * @param {Object} options 
     * @param {Boolean} options.debug
     * @param {String | 'lang'} options.path
     * @param {Array<String> | ['en-us']} options.langs
     * @param {Array<String> | ['errors']} options.namespaces
     */
    constructor(options) {
        this.debug = (options.debug !== undefined) ? options.debug : true;
        this.path = path.resolve(process.cwd(), options.path || 'lang');
        this.langs = Array.from(options.langs || ['en-us']).map(lang => lang.toLowerCase());
        this.namespaces = Array.from(options.namespaces || ['errors']).map(ns => ns.toLowerCase());

        this.data = {};
    }

    init() {
        return new Promise(async (resolve, reject) => {
            try {
                await fs.access(this.path);
                if (this.debug) console.log("[!] The directory '" + this.path + "' found!");

                for (const lang of this.langs) {
                    const langPath = path.resolve(this.path, lang);
                    try {
                        await fs.access(langPath);
                        if (this.debug) console.log("[!] The lang directory '" + langPath + "' found!");

                        this.data[lang] = {};
                        for (const ns of this.namespaces) {
                            const nsPath = path.resolve(langPath, ns + '.json');
                            try {
                                await fs.access(nsPath);
                                if (this.debug) console.log("[!] The lang namespace file '" + nsPath + "' found!");

                                const nsFile = require(nsPath);
                                this.data[lang][ns] = nsFile;
                            } catch (error) {
                                if (this.debug) console.log(error);
                                if (error.code === 'ENOENT') {
                                    if (this.debug) console.log("[X] The lang namespace file '" + nsPath + "' does not exist!");

                                    try {
                                        if (this.debug) console.log("[!] Trying to create the lang namespace file '" + nsPath + "'");
                                        await fs.writeFile(nsPath, JSON.stringify({}));
                                        if (this.debug) console.log("[!] Successfully created the lang namespace file '" + nsPath + "'");
                                    } catch (e) {
                                        if (this.debug) console.log("[X] Error on create lang namespace file!");
                                        if (this.debug) console.log(e);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        if (this.debug) console.log(error);
                        if (error.code === 'ENOENT') {
                            if (this.debug) console.log("[X] The lang directory '" + langPath + "' does not exist!");

                            try {
                                if (this.debug) console.log("[!] Trying to create the lang directory '" + langPath + "'");
                                await fs.mkdir(langPath, { recursive: true });
                                if (this.debug) console.log("[!] Successfully created the lang directory '" + langPath + "'");
                            } catch (e) {
                                if (this.debug) console.log("[X] Error on create lang directory!");
                                if (this.debug) console.log(e);
                            }
                        }
                    }
                }
                resolve();
            } catch (error) {
                if (this.debug) console.log(error);
                if (error.code === 'ENOENT') {
                    if (this.debug) console.log("[X] The directory '" + this.path + "' does not exist!");

                    try {
                        if (this.debug) console.log("[!] Trying to create the directory '" + this.path + "'");
                        await fs.mkdir(this.path, { recursive: true });
                        if (this.debug) console.log("[!] Successfully created the directory '" + this.path + "'");
                        resolve();
                    } catch (e) {
                        if (this.debug) console.log("[X] Error on create directory!");
                        if (this.debug) console.log(e);
                        reject(e);
                    }
                } else {
                    reject(error);
                }
            }
        });
    }

    /**
     * @param {String} lang 
     * @param {String} path 
     * @param {{}} variables
     * @returns {String}
     */
    get(lang, path, variables) {
        try {
            const parts = path.split('.');
            const namespace = parts.shift();
            let data = this.data[lang][namespace];

            parts.forEach((part) => {
                data = data[part]
            });

            /**
             * @param {String} str 
             * @param {{}} variables 
             * @returns {String}
             */
            function replaceVariables(str, variables) {
                return str.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
                    const value = variables[variable];
                    return value !== undefined ? value : match;
                });
            }

            return data != undefined ? (variables != undefined ? replaceVariables(data, variables) : data) : undefined;
        } catch (e) {
            return undefined;
        }
    }
}