$(function(){
	var fields = [
				"word"
			,	"type"
			,	"pronunciation"
			,	"explanation"
			,	"chapter"
			,	"important"
			,	"learnt"
			]
		,	$s = {
				active: null
			,	content: $("#content")
			,	textWord: $("#textWord")
			,	def: $("#def")
			,	searchForm: $("#searchForm")
			,	editForm: $("#editForm")
			,	del: $("#del")
			,	chapterText: $("#chapterText")
			,	chapterButton: $("#chapterButton")
			,	buttonAll: $("#buttonAll")
			,	selLearnt: $("#selLearnt")
			,	selImpo: $("#selImpo")
			,	selType: $("#selType")
			,	info: $("#info")
			,	loginForm: $("#loginForm")
			,	opa: $("#opa")
			,	loginWrapper: $("#loginWrapper")
			,	loginId: $("#loginId")
			,	loginPass: $("#loginPass")
			,	buttonLogin: $("#buttonLogin")
			,	userInfo: $("#userInfo")
			,	userPanel: $("#userPanel")
			,	buttonRegister: $("#buttonRegister")
			,	registerWrapper: $("#registerWrapper")
			,	buttonDelete: $("#buttonDelete")
			,	studyWrapper: $("#studyWrapper")
			,	WRiframe: $("#WRiframe")
			}
		,	chaptersPattern = /([1-9]\d*|\d)\s*-\s*([1-9]\d*|\d)|([1-9]\d*|\d)/g;
		
	
	(function init(){
		var i
			,	len
			,	user = $s.userInfo.text()
			,	opa = $(".opa")
			,	$letters = $("<p>")
			,	$ipa = $("<p>")
			,	letters = [
					"à"
				,	"â"
				,	"ä"
				,	"ç"
				,	"é"
				,	"è"
				,	"ê"
				,	"ë"
				,	"î"
				,	"ï"
				,	"ô"
				,	"ù"
				,	"û"
				,	"ü"
				]
			, ipa = [
					"ɑ"
				,	"ɑ̃"
				,	"ɛ"
				,	"ɛ̃"
				,	"ə"
				,	"ɔ"
				,	"ɔ̃"
				,	"œ"
				,	"œ̃"
				,	"ø"
				,	"ɥ"
				,	"ɲ"
				,	"ŋ"
				,	"ʀ"
				,	"ʃ"
				,	"ʒ"
				];

		for(i = 0, len = fields.length; i < len; ++i){
			$s[fields[i]] = $("#" + fields[i]);
		}
		
		$s.selType
			.children()
			.slice(1)
			.clone()
			.appendTo($s.type);		
		
		overwriteSubmit($s.searchForm, submitSearch);
		overwriteSubmit($s.editForm, submitEdit);
		
		if(user){
			$s.loginWrapper.hide();
			$s.registerWrapper.hide();
			$s.userInfo.text("Welcome " + user + "!");
			$s.buttonLogin.attr("value", "Log out");
			overwriteSubmit($s.loginForm, submitLogout);
			deleteUserClick(submitDeleteUser);
		}else{
			$s.userInfo.text("Log in");
			overwriteSubmit($s.loginForm, submitLogin);
			$s.buttonDelete.hide();
			$s.studyWrapper.hide();
		}
		
		$(".opa input, .opa a")
			.on("focus", function(){
				opa.addClass("opafocus");
			}).on("blur", function(){
				opa.removeClass("opafocus");
			});
		
		for(i = 0, len = letters.length; i < len; ++i){
			$letters.append($("<a>")
				.attr("href", "#")
				.addClass("help")
				.text(letters[i])
				.on("click", letterHandler)
			);
		}
		
		for(i = 0, len = ipa.length; i < len; ++i){
			$ipa.append($("<a>")
				.attr("href", "#")
				.addClass("help")
				.text(ipa[i])
				.on("click", letterHandler)
			);
		}
		
		$letters.add($ipa)
			.appendTo($("#letters"));
		
		$("input, button, select, a, textarea")
			.on("focus", function(){
				$s.active = $(this);
			});
		
		function letterHandler(e){
			e.preventDefault();
			
			if(	$s.active
			&&	$s.active.is("input[type=text], textarea")){
				$s.active
					.val($s.active.val() + $(this).text())
					.focus();
			}

			return false;
		}
		
		__render();
		$s.textWord.focus();
		
		$s.buttonRegister.on("click", activateRegister);
		
		$s.del.on("click", submitDel);
		
		$s.chapterButton.on("click", getWordsFromChapters);
		
		$s.buttonAll.on("click", getAll);
	})();

	
	/**
		After alert the array is ready!
		*/
	function getUnknownWordsFromText(text){
		var wordBank = {}
			,	i
			,	len
			,	unknown = [];
		text = text
			.toLowerCase()
			.replace(/[.,;?!]/g, " ")
			.replace(/\s+/g, " ")
			.split(" ");
		$.get("/chapters?chapters=all", function(data){
			for(i = 0, len = data.length; i < len; ++i){
				wordBank[data[i]] = i;
			}
			
			for(i = 0, len = text.length; i < len; ++i){
				if(wordBank[text[i]] == null){
					unknown.push(text[i]);
				}
			}
			
			alert("finished");
		});
		
		return unknown;
	}
	
	

	function parseWord(wordObj){
		var parsed
			,	word = wordObj.word;

		if(wordObj.important == null ||
			!!wordObj.important == false){
			parsed = $("<span>");
		}else{
			parsed = $("<em>");
		}
		
		if(~~wordObj.learnt >= 20){
			parsed.addClass("learnt");
		}else{
			parsed.addClass("notLearnt");
		}
		
		parsed = $("<a>")
			.attr("href", "#")
			.on("click", function(){ getWord(word); return false; })
			.append(parsed.text(word))
			.append(" - " + wordObj.explanation)
			.addClass("foundWord");
		return parsed;
	}
	
	function fillForm(wordObj){
		var i
			,	field
			,	len = fields.length;
		for(i = 0; i < len; ++i){
			field = fields[i];
			switch($s[field][0].tagName){
				case "P":
					$s[field].text(capitalize(field) + ": " + wordObj[field]);
					break;
				default:
					switch($s[field].attr("type")){
						case "checkbox":
							$s[field].attr("checked", !!(~~wordObj[field]));
							break;
						default:
							$s[field].attr("value", wordObj[field]);
					}
			}
		}
	}
	
	function emptyForm(){
		var i
			,	field
			,	len = fields.length;
		for(i = 0; i < len; ++i){
			field = fields[i];
			switch($s[field][0].tagName){
				case "P":
					$s[field].text("");
					break;
				default:
					switch($s[field].attr("type")){
						case "checkbox":
							$s[field].attr("checked", false);
							break;
						default:
							$s[field].attr("value", "");
					}
			}
		}
	}
	
	function formToWordObj(){
		var wordObj = {}
			,	i
			,	field
			,	len = fields.length;
		for(i = 0; i < len; ++i){
			field = fields[i];
			switch($s[field].attr("type")){
				case "checkbox":
					wordObj[field] = ~~!!$s[field].attr("checked");
					break;
				default:
					if(typeof $s[field].attr("value") === "string"){
						wordObj[field] = $s[field].attr("value");
					}
			}
		}
		return wordObj;
	}
	
	function getWord(word){
		$.get("/search/" + word, appendWords);
		getWR(word);
	}
	
	function getWR(word){//"http://mini.wordreference.com/mini/index.aspx?dict=fren&u=1&w="
		$s.WRiframe
			.attr("src", "http://www.wordreference.com/fren/" + word)
			[0].onload = (function(e){
				$s.active.focus();
			});
	}
	
	function appendWords(data){
		var $list = $("<ul>")
			,	i
			,	len = data.length;
		
		if(data.length == null){
			fillForm(data);
		}else if(len === 1){
			fillForm(data[0]);
		}else if(len === 0){
			emptyForm();
			$s.def.empty();
		}else{
			for(i = 0; i < len; ++i){
				$("<li>").html(parseWord(data[i])).appendTo($list);
			}
			$s.def.empty();
			$s.def.append($("<p>").text(len + " search results:")).append($list)
		}
	}
	
	function submitSearch(){
		getWord($s.textWord[0].value);
	}
	
	function postWord(word){
		$.ajax({
			type: "POST"
		,	url: "/edit"
		,	data: word
		,	success: function(data){
				$s.info.text(data);
			}
		,	statusCode: {
				401: tellToLogIn
			}
		});
	}
	
	function tellToLogIn(){
		alert("You have to be logged in to change content");
	}
	
	function submitEdit(){
		postWord(formToWordObj());
	}
	
	function delWord(word, func){
		$.ajax({
			type: "DELETE"
		,	url: "/edit/" + word
		,	success: function(data){
				$s.info.text(data);
			}
		,	statusCode: {
				401: tellToLogIn
			}
		});
	}
	
	function submitDel(){
		delWord($s.word[0].value);
	}
	
	function catchChapters(str){
		var chaps = []
			,	group;

		while(group = chaptersPattern.exec(str)){
			if(group[3] != null){
				group = [ ~~group[3] ];
				group[1] = group[0];
			}else{
				group = [ ~~group[1], ~~group[2] ];
				group = [
					Math.min(group[0], group[1])
				,	Math.max(group[0], group[1])
				];
			}

			chaps.push(group);
		}
		
		if(!chaps.length){
			chaps.push([0, 0]);
		}
		
		return minificateChapters(chaps);
	}
	
	function minificateChapters(arr){
		var i
			,	j;
		
		arr = arr || [];
		
		if(arr.length){
			arr = arr.sort(function(a, b){
				if(a[0] === b[0]){
					if(a.length === 2 && b.length === 2){
						return a[1] - b[1];
					}else{
						return a.length - b.length;
					}
				}else{
					return a[0] - b[0];
				}
			});

			for(i = 0, j = 1; j < arr.length;){
				if(arr[i][1] + 1 >= arr[j][0]){
					arr[i] = [
						Math.min(arr[i][0], arr[j][0])
					,	Math.max(arr[i][1], arr[j][1])
					];
					arr.splice(j, 1);
				}else{
					i += 1;
					j += 1;
				}
			}
		}
		
		for(i = 0; i < arr.length; ++i){
			if(arr[i][0] === arr[i][1]){
				arr[i] = [arr[i][0]];
			}
		}

		return arr;
	}

	function stringifyChapters(arr){
		var str = []
			,	i
			,	len = arr.length;
		
		for(i = 0; i < len; ++i){
			if(arr[i][0] === arr[i][1]){
				str[i] = arr[i][0] + "";
			}else{
				str[i] = arr[i].join(" - ");
			}
		}
		
		return str.join(", ");
	}

	function getChapters(str, opts){
		opts = opts || {};

		opts.chapters = catchChapters(str || "0");

		return opts;
	}
	
	function controlChapters($input, opts){
		opts = opts || {};

		opts = getChapters($input.attr("value"), opts);

		$input.attr("value", stringifyChapters(opts.chapters));
		
		opts.chapters = JSON.stringify(opts.chapters);

		return opts;
	}
	
	function getSearchOptions(opt){
		var i
			,	optArr;
		opt = opt || {};
		
		optArr = [
			{ value: $s.selImpo.attr("value"), prop: "important" }
		,	{ value: $s.selLearnt.attr("value"), prop: "learnt" }
		,	{ value: $s.selType.attr("value"), prop: "type" }
		];
		
		for(i = 0; i < optArr.length; ++i){
			if(optArr[i].value !== "all"){
				opt[optArr[i].prop] = optArr[i].value;
			}
		}

		return opt;
	}
	
	function getWordsFromChapters(){
		var options = getSearchOptions(controlChapters($s.chapterText));
		
		$.get("/chapters", options, appendWords);
	}
	
	function getAll(){
		var options = getSearchOptions({ chapters: "all" });
		
		$.get("/chapters", options, appendWords);
	}

	function submitLogin(){
		var loginData = {
			userId: $s.loginId[0].value
		,	password: $s.loginPass[0].value
		};
		$.ajax({
			type: "POST"
		,	url: "/login"
		,	data: loginData
		,	success: function(data){
				console.log(data);
				
				loginAnimation(loginData.userId);
				overwriteSubmit($s.loginForm, submitLogout);
				deleteUserClick(submitDeleteUser);
			}
		,	statusCode: {
				401: function(){
					alert("Bad login or password");
					$s.loginPass.attr("value", "");
				}
			,	500: function(){
					alert("Internal server error!");
				}
			}
		});
	}
	
	function submitLogout(){
		$.ajax({
			type: "POST"
		,	url: "/logout"
		,	success: function(data){
				logoutAnimation();
				overwriteSubmit($s.loginForm, submitLogin);
			}
		}).fail(function(msg){
			alert("Error while logging out:\n" + msg);
		});
	}
	
	function submitNewUser(){
		var newUserData = {
			userId: $s.loginId[0].value
		,	password: $s.loginPass[0].value
		};
		$.ajax({
			type: "POST"
		,	url: "/newUser"
		,	data: newUserData
		,	success: function(msg){
				console.log(msg);
				
				newUserAnimation(newUserData.userId)
				overwriteSubmit($s.loginForm, submitLogout);
				deleteUserClick(submitDeleteUser);
			}
		,	statusCode: {
				409: function(){
					$s.loginPass.attr("value", "");
					alert("Choose different user name!");
				}
			}
		}).fail(function(msg){
			console.log(msg);
		});
	}
	
	function submitDeleteUser(){
		$.ajax({
			type: "DELETE"
		,	url: "/deleteUser"
		,	success: function(msg){
			console.log(msg);
				logoutAnimation();
				$s.loginId.attr("value", "");
				overwriteSubmit($s.loginForm, submitLogin);
			}
		});
	}
	
	function capitalize(str){
		str[0] = str[0].toUpperCase;
		return str;
	}
	
	function cancel(){
		cancelAnimation();
		overwriteSubmit($s.loginForm, submitLogin);
	}
	
	function activateRegister(){
		registerAnimation();
		
		deleteUserClick(cancel);
		overwriteSubmit($s.loginForm, submitNewUser);
	}
	
	function overwriteSubmit($form, func){
		$form[0].onsubmit = function(e){
			e.preventDefault();
			func();
		};
	}
	
	function deleteUserClick(func){
		$s.buttonDelete[0].onclick = func;
	}
	
	//animations
	
	function hideRegisterWrapper(time){
		if(time == null){
			time = 1000;
		}
		$s.registerWrapper.hide("blind", time);
	}
	
	function showRegisterWrapper(time){
		if(time == null){
			time = 1000;
		}
		$s.registerWrapper.show("blind", time);
	}
	
	function hideStudyWrapper(time){
		if(time == null){
			time = 1000;
		}
		$s.studyWrapper.hide("blind", time);
	}
	
	function showStudyWrapper(time){
		if(time == null){
			time = 1000;
		}
		$s.studyWrapper.show("blind", time);
	}
	
	function hideLoginWrapper(time){
		if(time == null){
			time = 1000;
		}
		$s.loginWrapper.hide("clip", time);
	}
	
	function showLoginWrapper(time){
		if(time == null){
			time = 1000;
		}
		$s.loginWrapper.show("clip", time);
	}
	
	function shuffleUserInfo(newInfo, time, time2){
		if(time == null){
			time = 700;
		}
		$s.userInfo.hide("slide", { direction: "right"}, time, function(){
			if(time2 == null){
				time2 = 600;
			}
			$s.userInfo.text(newInfo).show("slide", time2);
		});
	}
	
	function contentFadeOut(){
		$s.content.fadeOut(500);
	}
	
	function contentFadeIn(){
		$s.content.fadeIn(500);
	}
	
	function centralizeUserPanel(){
		$s.userPanel.addClass("cl", 1000);
		$s.opa.removeClass("opa");
	}
	
	function decentralizeUserPanel(){
		$s.userPanel.removeClass("cl", 1000);
		$s.opa.addClass("opa");
	}
	
	function shuffleLoginButton(newValue){
		$s.buttonLogin.hide("blind", 700, function(){
			$s.buttonLogin.attr("value", newValue).show("blind", 400);
		});
	}
	
	
	function shuffleDeleteButton(newValue){
		hideDeleteButton(function(){ showDeleteButton(newValue); });
	}
	
	function hideDeleteButton(callback){
		$s.buttonDelete.hide("blind", 700, callback);
	}
	
	function showDeleteButton(newValue, time){
		if(newValue != null){
			$s.buttonDelete.attr("value", newValue).show("blind", time || 400);
		}else{
			$s.buttonDelete.show("blind", 1100);
		}
	}
	
	function loginAnimation(userId, time){
		hideLoginWrapper(time);
		hideRegisterWrapper(time);
		shuffleUserInfo("Welcome " + userId + "!", time, time);
		shuffleLoginButton("Log out");
		showDeleteButton("Delete user", 1100);
		showStudyWrapper();
		$s.loginPass.attr("value", "");
	}
	
	function logoutAnimation(time){
		showLoginWrapper(time);
		showRegisterWrapper(time);
		shuffleUserInfo("Log in", time, time);
		shuffleLoginButton("Log in");
		hideStudyWrapper();
		hideDeleteButton();
	}
	
	function registerAnimation(){
		contentFadeOut();
		centralizeUserPanel();
		hideRegisterWrapper();
		shuffleUserInfo("Register now!");
		shuffleLoginButton("Register");
		showDeleteButton("Cancel", 1100);
		$s.loginId.attr("value", "");
		$s.loginPass.attr("value", "");		
	}
	
	function newUserAnimation(userId){
		decentralizeAnimation();
		hideLoginWrapper();
		hideRegisterWrapper();
		shuffleUserInfo("Welcome " + userId + "!");
		shuffleLoginButton("Log out");
		shuffleDeleteButton("Delete user");
		$s.loginPass.attr("value", "");
	}
	
	function decentralizeAnimation(){
		decentralizeUserPanel();
		contentFadeIn();
	}
	
	function cancelAnimation(){
		decentralizeAnimation();
		shuffleUserInfo("Log in");
		shuffleLoginButton("Log in");
		hideDeleteButton();
		showRegisterWrapper();
		$s.loginId.attr("value", "");
		$s.loginPass.attr("value", "");
	}	
});
