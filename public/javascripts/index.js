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
		,	$selectors = {
				textWord: $("#textWord")
			,	def: $("#def")
			,	searchForm: $("#searchForm")
			,	editForm: $("#editForm")
			,	del: $("#del")
			,	textChapter: $("#textChapter")
			,	buttonChapter: $("#buttonChapter")
			,	buttonAll: $("#buttonAll")
			,	selLearnt: $("#selLearnt")
			,	selImpo: $("#selImpo")
			}
		,	chaptersPattern = /([1-9]\d*|\d)\s*-\s*([1-9]\d*|\d)|([1-9]\d*|\d)/;
	
	function parseWord(wordObj){
		var parsed
			,	word = wordObj.word;

		if(wordObj.important == null ||
			!!wordObj.important == false){
			parsed = $("<span>");
		}else{
			parsed = $("<em>");
		}
		
		if(!wordObj.learnt){
			parsed.addClass("notlearnt");
		}
		
		parsed = $("<p>")
			.append(parsed
				.on("click", function(){ getWord(word); })
				.text(word))
			.append(" - " + wordObj.explanation);
		return parsed;
	}
	
	function fillForm(wordObj){
		var i;
		for(i = 0; i < fields.length; ++i){
			switch($selectors[fields[i]][0].type){
				case "checkbox":
					$selectors[fields[i]][0].checked = !!(~~wordObj[fields[i]]);
					break;
				default:
					$selectors[fields[i]][0].value = wordObj[fields[i]];
			}
		}
	}
	
	function emptyForm(){
		var i;
		for(i = 0; i < fields.length; ++i){
			$selectors[fields[i]][0].value = "";
		}
	}
	
	function formToWordObj(){
		var wordObj = {}
			,	i;
		for(i = 0; i < fields.length; ++i){
			switch($selectors[fields[i]][0].type){
				case "checkbox":
					wordObj[fields[i]] = ~~$selectors[fields[i]][0].checked;
					break;
				default:
					wordObj[fields[i]] = $selectors[fields[i]][0].value;
			}
		}
		return wordObj;
	}
	
	function getWord(word){
		$.get("/search/" + word, appendWords);
	}
	
	function appendWords(data){
		var $list = $("<ul>")
			,	i;
			
		$selectors.def.empty();
		
		if(data.length === 1){
			fillForm(data[0]);
		}else if(data.length === 0){
			emptyForm();
		}else{
			for(i = 0; i < data.length; ++i){
				$("<li>").html(parseWord(data[i])).appendTo($list);
			}
			
			$selectors.def.append($list)
		}
	}
	
	function submitSearch(){
		getWord($selectors.textWord[0].value);
	}
	
	function postWord(word){
		$.post("/edit", word, function(){}, "json");
	}
	
	function submitEdit(){
		postWord(formToWordObj());
	}
	
	function delWord(word, func){
		$.ajax({
			type: "DELETE"
		,	url: "/edit/" + word
		});
	}
	
	function submitDel(){
		delWord($selectors.word[0].value);
	}
	
	function getChapters(str){
		var chaps = chaptersPattern.exec(str || "0");
		if(chaps == null){
			return { from: "0" };
		}else	if(chaps[3] != null){
			return { from: chaps[3] };
		}else{
			chaps[1] = ~~chaps[1];
			chaps[2] = ~~chaps[2];
			return {
				from: Math.min(chaps[1], chaps[2])
			,	to: Math.max(chaps[1], chaps[2])
			};
		}
	}
	
	function controlChapters(input){
		var chaps = getChapters(input.value);
			
		if(chaps.to == null){
			input.value = chaps.from;
		}else{
			input.value = chaps.from + " - " + chaps.to;
		}
		
		return chaps;
	}
	
	function getSearchOptions(opt){
		opt = opt || {};
		
		switch($selectors.selImpo[0].value){
			case "true":
				opt.important = "1";
				break;
			case "false":
				opt.important = "0";
				break;
		}
		switch($selectors.selLearnt[0].value){
			case "true":
				opt.learnt = "1";
				break;
			case "false":
				opt.learnt = "0";
				break;
		}
		
		return opt;
	}
	
	function getWordsFromChapters(){
		var options = getSearchOptions(controlChapters($selectors.textChapter[0]));
		
		$.get("/chapters", options, appendWords);
	}
	
	function getAll(){
		var options = getSearchOptions();
		
		$.get("/all", options, appendWords);
	}
	
	(function init(){
		var i;
		for(i = 0; i < fields.length; ++i){
			$selectors[fields[i]] = $("#" + fields[i]);
		}
		
		$selectors.searchForm.submit(function(e){
			e.preventDefault();
			submitSearch();
		});
		
		$selectors.editForm.submit(function(e){
			e.preventDefault();
			submitEdit();
		});
		
		$selectors.del.on("click", submitDel);
		
		$selectors.buttonChapter.on("click", getWordsFromChapters);
		
		$selectors.buttonAll.on("click", getAll);
	})();
});