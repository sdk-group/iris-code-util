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

	static recursive_make(prefix, date, try_num = 1) {
		if(!try_num)
			return Promise.reject(new Error("Failed to create label code."));
		let day = date ? date : (new Date()).toLocaleDateString();
		let id = _.join([key, day], "-");
		let code;
		return db.get(id)
			.catch((err) => {
				if(!_.includes(err.message, 'The key does not exist on the server'))
					return Promise.reject(err);
				let dummy = {};
				dummy[prefix] = [];
				return Promise.resolve({
					value: dummy
				});
			})
			.then((res) => {
				let registry = res.value[prefix] || [];
				let num = _.parseInt((_.last(registry) || 0)) + 1;
				code = _.join([prefix, num], "-");
				let to_put = res.value;
				registry.push(num);
				to_put[prefix] = registry;
				let opts = res.cas ? {
					cas: res.cas
				} : {};
				return db.upsert(id, to_put, opts);
			})
			.then((res) => {
				return Promise.resolve(code);
			})
			.catch((err) => {
				return PrefixMaker.recursive_make(prefix, day, try_num - 1);
			});
	}

	static make(prefix, date, try_num = num_tries) {
		return PrefixMaker.recursive_make(prefix, date, try_num);
	}

}

module.exports = PrefixMaker;