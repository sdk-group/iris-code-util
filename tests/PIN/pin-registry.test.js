let pin = require("./index");
let RDFcb = require("cbird-rdf").LD;
let Couchbird = require("Couchbird");
let cfg = {
	"name": "main",
	"couchbird": {
		"server_ip": "127.0.0.1",
		"n1ql": "127.0.0.1:8093"
	},
	"buckets": {
		"main": "rdf",
		"auth": "ss",
		"history": "rdf"
	},
	"vocabulary": {
		"basic": "iris://vocabulary/basic",
		"domain": "iris://vocabulary/domain",
		"fs": false
	}
};
let key = "test_pin_registry";
pin.configure({
	bucket: cfg.buckets.main,
	storage_key: key
});

describe("PIN", function() {
	this.timeout(10000);
	let bucket = null;
	let db = null;

	before((done) => {
		db = new RDFcb(cfg.couchbird);
		bucket = db.bucket(cfg.buckets.main);
		bucket.remove(key).then((res) => {
			done()
		})
	});
	let code;

	describe("pin make", () => {
		it("no key in bucket", (done) => {
			pin.make()
				.then((res) => {
					code = res;
					return bucket.get(key);
				})
				.then((res) => {
					console.log("RES", res);
					expect(res).to.have.deep.property("value.code").which.is.instanceof(Array).and.includes(code);
					expect(res).to.have.property("cas").which.is.not.undefined;
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
		it("pin make on key", (done) => {
			pin.make()
				.then((res) => {
					code = res;
					return bucket.get(key);
				})
				.then((res) => {
					console.log("RES", res);
					expect(res).to.have.deep.property("value.code").which.is.instanceof(Array).and.includes(code);
					expect(res).to.have.property("cas").which.is.not.undefined;
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
		it("should return err with 0 tries", (done) => {
			pin.make('default', 0)
				.then((res) => {
					code = res;
					return bucket.get(key);
				})
				.then((res) => {
					done(new Error('Incorrect behaviour.'));
				})
				.catch((err) => {
					expect(_.includes(err.message, "Failed to create PIN."));
					done();
				});
		});
	});
	describe("remove code", () => {
		it("remove one key", (done) => {
			pin.remove(code)
				.then((res) => {
					return bucket.get(key);
				})
				.then((res) => {
					console.log("RES", res);
					expect(res).to.have.deep.property("value.code").which.is.instanceof(Array).and.not.includes(code);
					expect(res).to.have.property("cas").which.is.not.undefined;
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
	});
});