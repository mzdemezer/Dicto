module.exports = {
	"app": {
		"port": 3001
	}
,	"init": {
		"log": false
	}
,	"database": {
		"log": false
	,	"cluster": false
	,	"user": "root"
	,	"database": "Dicto"
	,	"poolSize": 32
	,	"minSize": 10
	}
,	"crypt": {
		"hashLen": 512
	,	"saltLen": 32
	,	"rounds": 13000
	,	"encoding": "base64"
	}
,	"sessionStore": {
		"reapInterval": 3600000
	,	"store": "redis"
	}
}
