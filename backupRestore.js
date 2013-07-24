module.exports = function(modules){
	var	fs = require("fs")
		,	config = require("./backupConfig.js");
	
	return function(args, pass){
		fs.readFile(config.path, "utf8", function(err, data){
			var type;
			if(err){
				pass(err);
			}else{
				try{
					data = JSON.parse(data);
				}catch(err){
					return pass(err);
				}
				switch(args[1]){
					case "-override":
						type = "override"
						break;
					case "-update":
						type = "update";
						break;
					default:
						type = "ignore"
				}
				modules.database({
					type: "insertBackup"
				,	arguments: [ data, type ]
				}, function(err, resp){
					if(err){
						pass(err);
					}else{
						console.log(resp);
						pass(true);
					}
				});
			}
		});
	};
}
