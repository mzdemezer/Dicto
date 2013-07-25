module.exports = function(app, mds, routeFuncs){
// 	app.post("/login", function loginValidate(req, res, next){
// 		database.query(query.getUser(req.body.userId), function(err, rows, fields){
// 			if(err){
// 			}else{
// 				if(rows.length === 0){
// 					crypt.encrypt(crypt.random());
// 					res.send(401);
// 				}else{
// 					if(crypt.isPassword(req.body.password, rows[0].passHash, rows[0].salt)){
// 						store.newSession(req.body.userId, crypt.random(), res);
// 						res.send(200);
// 					}else{
// 						res.send(401);
// 					}
// 				}
// 			}
// 		});
// 	});
	
	app.post("/login", function(req, res, next){
		mds.database({
			type: "getUser"
		,	arguments: [req.body.userId]
		}, function(err, resp){
			if(err){
// 				next(err);
				res.send(500);
			}else{
				resp = resp[0];
				if(resp.length === 0){
					mds.crypt.loseTime(function(){
						req.correct = false;
						next();
					});
				}else{
					resp = resp[0];
					mds.crypt.isPassword(req.body.password, resp.hash, resp.salt, function(correct){
						req.body.correct = correct;
						next();
					});
				}
			}
		});
	}, function(req, res, next){
		if(req.body.correct){
			next();
		}else{
// 			next(mds.errorCodes.badLogPass);
			res.send(401);
		}
	}, mds.sessionStore.newSession, function(req, res, next){
// 		if(req.query.redirect){
// 			res.hostRedirect(req.query.redirect);
// 		}else{
// 			res.hostRedirect("/");
// 		}
		res.send(200);
	});

	app.post("/logout", mds.sessionStore.endSession, function(req, res, next){
		res.send(200);
	});

	
	
	
	app.post("/newUser", function(req, res, next){
		mds.database({
				type: "getUser"
			,	arguments: [ req.body.userId ]
			},	function(err, resp){
			console.log(resp);
			if(resp[0].length === 0){
				mds.crypt.encrypt(req.body.password, function(dgst){
					mds.database({
						type: "addUser"
					,	arguments: [ req.body.userId, dgst.hash, dgst.salt ]
					}, function(err, resp){
						if(err){
							console.log(err);
							res.send(err, 500);
						}else{
							next();
						}
					});
				});
			}else{
				res.send(409);
			}
		});
	}
	,	mds.sessionStore.newSession
	,	function(req, res, next){
		res.send(201);
	});

	app.del("/deleteUser", routeFuncs("requireLogged")(function(req, res, next){
		res.send(401);
	}),	function(req, res, next){
		mds.database({ 
			type: "delUser"
		,	arguments: [ req.logged ]
		}, function(err, resp){
			if(err){
				res.send(500);
			}else{
				next();
			}
		});
	}, mds.sessionStore.endSession
	,	function(req, res, next){
		res.send(204);
	});
}
