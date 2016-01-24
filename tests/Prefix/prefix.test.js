let prefix = require("./index");
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
let key = "test_prefix_registry";
prefix.configure({
	bucket: cfg.buckets.main,
	storage_key: key
});

describe("Prefix", function() {
	this.timeout(10000);
	let bucket = null;
	let db = null;

	before((done) => {
		db = new RDFcb(cfg.couchbird);
		bucket = db.bucket(cfg.buckets.main);
		bucket.remove(_.join([key, "2016-01-12"], "-")).then((res) => {
			done()
		})
	});
	let code;

	describe("prefix make", () => {
		it("no key in bucket", (done) => {
			prefix.make("A", "2016-01-12")
				.then((res) => {
					code = res;
					console.log("CODE", res);
					return bucket.get(_.join([key, "2016-01-12"], "-"));
				})
				.then((res) => {
					console.log("RES", res);
					expect(res).to.have.property("cas").which.is.not.undefined;
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
		it("prefix make on key", (done) => {
			prefix.make("B", "2016-01-12")
				.then((res) => {
					code = res;
					console.log("CODE", res);
					return bucket.get(_.join([key, "2016-01-12"], "-"));
				})
				.then((res) => {
					console.log("RES", res);
					expect(res).to.have.property("cas").which.is.not.undefined;
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
		it("should return err with 0 tries", (done) => {
			prefix.make("G", "2016-01-12", 0)
				.then((res) => {
					code = res;
					console.log("CODE", res);
					return bucket.get(_.join([key, "2016-01-12"], "-"));
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

});