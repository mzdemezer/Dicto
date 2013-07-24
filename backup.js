module.exports = function(modules){
	var	fs = require("fs")
		,	config = require("./backupConfig.js");
	
	return function(args, pass){
		modules.database("SELECT * FROM words", function(err, resp){
			fs.writeFile(config.path, JSON.stringify(resp[0]), "utf8", function(err){
				if(err){
					pass(err);
				}else{
					pass(true);
				}
			});
		});
	};
}
