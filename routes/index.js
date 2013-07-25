module.exports = function(app, mds, routeFuncs){
	app.get("/", function(req, res, next){
		res.render("index", { user: req.logged });
	});
}
