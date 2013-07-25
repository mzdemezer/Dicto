module.exports = function(app, mds, routeFuncs){
	app.all("*", mds.sessionStore.authenticate);
}
