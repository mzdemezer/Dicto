module.exports = function(app, mds, routeFuncs){
	app.get("/learn", routeFuncs("requireLogged")(), function(req, res, next){
		res.render("learn", { user: req.logged });
	});
}
