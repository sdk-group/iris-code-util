'use strict'

let couchbird = require("Couchbird")();
let N1qlQuery = require("Couchbird").N1qlQuery;

let db;
let prefix_cache = {};
let key;
let num_tries;

let prop_mapping = {
	prefix: "iris://vocabulary/domain#prefix"
};

class PrefixMaker {
	constructor() {
		throw new Error("Singletone.");
	}

	static configure({
		bucket,
		storage_key,
		tries
	}) {
		db = couchbird.bucket(bucket);
		key = storage_key || "label_registry";
		num_tries = tries || 5;
	}

	static loadPrefixes() {
		let qstr = "SELECT * FROM `" + db.bucket_name + "` AS doc WHERE '" + prop_mapping.prefix + "' IN object_names(doc) ;";
		let query = N1qlQuery.fromString(qstr);
		return db.N1QL(query)
			.then((res) => {
				return _.reduce(res, (acc, val) => {
					acc[val.doc['@id']] = val.doc[prop_mapping.prefix][0]['@value'];
					return acc;
				}, {});
			});
	}

	static reloadPrefixes() {
		return PrefixMaker.loadPrefixes()
			.then((res) => {
				prefix_cache = res;
				return Promise.resolve(res);
			});
	}

	static getPrefixes() {
		return prefix_cache;
	}

	static recursive_make(service, date, try_num = 1) {
		if(!try_num)
			return Promise.reject(new Error("Failed to create label code."));
		let day = date ? new Date(date) : new Date();
		day = day.toLocaleDateString();
		let id = _.join([key, day], "-");
		let code;
		return PrefixMaker.reloadPrefixes()
			.then(() => {
				return db.get(id)
			})
			.catch((err) => {
				if(!_.includes(err.message, 'The key does not exist on the server'))
					return Promise.reject(err);
				let dummy = _.reduce(prefix_cache, (acc, val, key) => {
					acc[val] = [];
					return acc;
				}, {});
				return Promise.resolve({
					value: dummy
				});
			})
			.then((res) => {
				if(!prefix_cache[service])
					return Promise.reject("No such service.");
				let registry = res.value[prefix_cache[service]];
				let num = _.parseInt((_.last(registry) || 0)) + 1;
				code = prefix_cache[service] + num;
				let to_put = res.value;
				registry.push(num);
				to_put[prefix_cache[service]] = registry;
				let opts = res.cas ? {
					cas: res.cas
				} : {};
				return db.upsert(id, to_put, opts);
			})
			.then((res) => {
				return Promise.resolve(code);
			})
			.catch((err) => {
				return PrefixMaker.recursive_make(service, day, try_num - 1);
			});
	}

	static make(service, date, try_num = num_tries) {
		return PrefixMaker.recursive_make(service, date, try_num);
	}

}

module.exports = PrefixMaker;