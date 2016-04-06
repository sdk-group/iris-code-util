'use strict'

let couchbird = require("Couchbird")();

let db;
let prefix_cache = {};
let key;

class PrefixMaker {
	constructor() {
		throw new Error("Singletone.");
	}

	static configure({
		bucket,
		storage_key
	}) {
		db = couchbird.bucket(bucket);
		key = storage_key || "label-registry";
	}

	static make(prefix, office, date) {
		let day = date ? date : (new Date())
			.toLocaleDateString();
		let mark = _(prefix)
			.map((t) => t.charCodeAt(0))
			.join('-');
		let id = _.join([key, office, mark, day], "-");

		return new Promise((resolve, reject) => {
			db.counter(id, 1, {
				initial: 1
			}, (err, res) => {
				if (err) {
					reject(new Error(new Error("Failed to create label code:" + err.message)));
				} else {
					// console.log("KKK", id, res, mark, prefix);
					let label = prefix ? [prefix, res.value].join("-") : res.value;
					resolve(label);
				}
			});
		});

	}


}

module.exports = PrefixMaker;
