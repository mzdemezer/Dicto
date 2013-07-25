module.exports = function(app, mds, routeFuncs){
	app.get("/search/:word", function(req, res, next){
		var word = req.params.word;
		mds.database({
			type: "word"
		,	arguments: [ word ]
		}, function(err, resp){
			if(err){
				next(err);
			}else{
				resp = resp[0];
				if(resp.length === 0){
					mds.database({
						type: "contain"
					,	arguments: [ word ]
					}, function(err, resp){
						if(err){
							next(err);
						}else{
							res.json(resp[0]);
						}
					});
				}else{
					res.json(resp);
				}
			}
		});
	});

	app.get("/chapters", function(req, res, next){
		mds.database({
			type: "chapter"
		,	arguments: [ req.query ]
		}, function(err, resp){
			if(err){
				next(err);
			}else{
				res.json(resp[0]);
			}
		});
	});

	app.get("/count", function(req, res, next){
		mds.database({
			type: "count"
		,	arguments: [ req.query ]
		}, function(err, resp){
			if(err){
				next(err);
			}else{
				res.json(resp[0]);
			}
		});
	});
}
