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
        return this.createDirectory(this.path)
            .then(() => Promise.all(this.langs.map(lang => this.initLang(lang))))
            .then(() => console.log('[!] Lang initialization completed!'))
            .catch((error) => console.error('[X] Lang initialization failed:', error.message));
    }

    async createDirectory(directoryPath, main = true) {
        try {
            await fs.access(directoryPath);
            if (this.debug) console.log("[!] The " + (main ? "main lang" : "lang") + " directory '" + directoryPath + "' found!");
        } catch (error) {
            if (error.code === 'ENOENT') {
                if (this.debug) console.log("[X] The " + (main ? "main lang" : "lang") + " directory '" + directoryPath + "' not found!");

                try {
                    if (this.debug) console.log("[!] Trying to create the " + (main ? "main lang" : "lang") + " directory '" + directoryPath + "'...");
                    await fs.mkdir(directoryPath, { recursive: true });
                    if (this.debug) console.log("[!] Successfully created the " + (main ? "main lang" : "lang") + " directory '" + directoryPath + "'!");
                } catch (e) {
                    if (this.debug) console.log("[X] Error on create the " + (main ? "main lang" : "lang") + " directory:", e.message);
                    throw e.message;
                }
            } else {
                throw error.message;
            }
        }
    }

    async initLang(lang) {
        const langPath = path.resolve(this.path, lang);
        await this.createDirectory(langPath, false);

        this.data[lang] = {};

        await Promise.all(this.namespaces.map(ns => this.initNamespace(lang, ns)));
    }

    async initNamespace(lang, ns) {
        const nsPath = path.resolve(this.path, lang, ns + '.json');

        try {
            await fs.access(nsPath);
            if (this.debug) console.log("[!] The lang namespace file '" + nsPath + "' found!");

            const nsFile = require(nsPath);
            this.data[lang][ns] = nsFile;
        } catch (error) {
            if (error.code === 'ENOENT') {
                if (this.debug) console.log("[X] The lang namespace file '" + nsPath + "' not found!");

                try {
                    if (this.debug) console.log("[!] Trying to create the lang namespace file '" + nsPath + "'...");
                    await fs.writeFile(nsPath, JSON.stringify({}));
                    if (this.debug) console.log("[!] Successfully created the lang namespace file '" + nsPath + "'!");
                } catch (e) {
                    if (this.debug) console.log("[X] Error on create lang namespace file:", e.message);
                    throw e.message;
                }
            } else {
                throw error.message;
            }
        }
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