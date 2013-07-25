module.exports = function(app, mds, routeFuncs){


	app.post("/edit", routeFuncs("requireLogged")(function(req, res, next){
		res.send(401);
	}), function(req, res, next){
		mds.database({
			type: "word"
		,	arguments: [ req.body.word ]
		}, function(err, resp){
			if(err){
				next(err);
			}else{
				resp = resp[0];
				if(resp.length){
					mds.database({
						type: "modify"
					,	arguments: [ req.body ]
					}, function(err, resp){
						if(err){
							next(err);
						}else{
							res.send("Edited: " + req.body.word, 200);
						}
					});
				}else{
					req.body.learnt = 0;
					mds.database({
						type: "insert"
					,	arguments: [ req.body ]
					}, function(err, resp){
						if(err){
							next(err);
						}else{
							res.send("Added: " + req.body.word, 201);
						}
					});
				}
			}
		});
	});

	app.del("/edit/:word", routeFuncs("requireLogged")(function(req, res, next){
		res.send(401);
	}), function(req, res, next){
		var word = req.params.word;
		mds.database({
			type: "del"
		,	arguments: word
		}, function(err, resp){
			if(err){
				next(err);
			}else{
				res.send("Deleted: " + word, 200);
			}
		});
	});

}
