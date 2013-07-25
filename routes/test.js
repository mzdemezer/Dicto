module.exports = function(app, mds, routeFuncs){
	app.get("/test", routeFuncs("requireLogged")(), function(req, res, next){
		res.render("test", { user: req.logged });
	});

	app.get("/test/:test", routeFuncs("requireLogged")(), function(req, res, next){
		mds.database({
			type: "chapter"
		,	arguments: [ req.query ]
		}, function(err, resp){

			if (err) {
				next(err);
			} else {
				res.render(req.params.test, {
					user: req.logged
				,	words: JSON.stringify(resp[0])
				});
			}
		});
	});

	app.post("/test/update", routeFuncs("requireLogged")(), function(req, res, next){
		mds.database({
			type: "learn"
		,	arguments: [ req.body.words ]
		}, function(err, resp){
			if(err){
				console.log("err: " + err);
				next(err);
			}else{
				res.send(204);
			}
		});
	});
}
