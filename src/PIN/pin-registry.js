'use strict'

let couchbird = require("Couchbird")();
let N1qlQuery = require("Couchbird").N1qlQuery;
let gpc = require('generate-pincode');

let db = null;
let pin_length;
let key;
let pin_tries;
let timeo;

class PINRegistry {
	constructor() {
		throw new Error("Don't piss me off.");
	}

	static configure({
		bucket,
		length,
		storage_key,
		tries,
		timeout
	}) {
		db = couchbird.bucket(bucket);
		pin_length = length || 7;
		key = storage_key || "pin_registry";
		pin_tries = tries || 5;
		timeo = timeout || 500;
	}

	static recursive_make(office = 'default', try_num = 1) {
		if(!try_num)
			return Promise.reject(new Error("Failed to create PIN."));
		let code;
		let dummy = {
			value: {
				code: []
			}
		};
		return db.get(key)
			.catch((err) => {
				if(!_.includes(err.message, 'The key does not exist on the server'))
					return Promise.reject(err);
				return Promise.resolve(dummy);
			})
			.then((data) => {
				let res = data || dummy;
				let registry = res.value.code || [];
				let done = false;
				while(!done) {
					code = _.join([office, gpc(pin_length).toString()], "-");
					done = (!!_.indexOf(registry, code));
				}
				let to_put = res.value;
				registry.push(code)
				to_put.code = registry;
				let opts = res.cas ? {
					cas: res.cas
				} : {};
				return db.upsert(key, to_put, opts);
			})
			.then((res) => {
				return Promise.resolve(code);
			})
			.catch((err) => {
				return PINRegistry.recursive_make(office, try_num - 1);
			});
	}

	static make(office = 'default', try_num = pin_tries) {
		return PINRegistry.recursive_make(office, try_num);
	}

	static recursive_remove(code, try_num = 1) {
		if(!try_num)
			return Promise.reject(new Error("Failed to remove PIN."));
		return db.get(key)
			.then((res) => {
				let registry = res.value.code || [];
				let to_put = res.value;
				_.remove(registry, (val) => {
					return _.isEqual(val, code)
				});
				to_put.code = registry;
				let opts = {
					cas: res.cas
				};
				return db.upsert(key, to_put, opts);
			})
			.then((res) => {
				return Promise.resolve(true);
			})
			.catch((err) => {
				if(!_.includes(err.message, 'The key does not exist on the server'))
					return Promise.resolve(true);
				return PINRegistry.recursive_remove(code, try_num - 1);
			});
	}

	static remove(code, try_num = pin_tries) {
		return PINRegistry.recursive_remove(code, try_num);
	}
}

module.exports = PINRegistry;