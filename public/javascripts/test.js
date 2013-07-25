$(function(){
	var $s = {
			chapterText: $("#chapterText")
		,	chapterCheck: $("#chapterCheck")
		,	chapterWrapper: $("#chapterLabel")
		,	selLearnt: $("#selLearnt")
		,	selImpo: $("#selImpo")
		,	selType: $("#selType")
		,	wordNumber: $("#wordNumber")
		}
	,	chapterWrapperDisp = false
	,	chapterAnimSpeed = 300,	chaptersPattern = /([1-9]\d*|\d)\s*-\s*([1-9]\d*|\d)|([1-9]\d*|\d)/g;

	(function init(){
		$(".floatLeft").removeClass("floatLeft");
		$("#content").addClass("center");

		$s.chapterWrapper = $s.chapterWrapper.add($s.chapterText).hide();

		$s.chapterCheck
			.on("change", function(){
				chapterWrapperDisp = !chapterWrapperDisp;
				if(chapterWrapperDisp){
					$s.chapterWrapper.show("blind", chapterAnimSpeed);
				}else{
					$s.chapterWrapper.hide("blind", chapterAnimSpeed);
				}
			})
			.attr("checked", true);
		
		$(".testAnc").each(function(){
			var $this = $(this)
				,	defaultHref = $this.attr("href");
			$this.on("click", function(e){
				var href = defaultHref + getOptions();
				$this.attr("href", href);
			});
		});
		
		$("form")
			.on("change", getCount)
			.submit(function(e){
				e.preventDefault();
				return false;
			});
		
		getCount();
		
	})();
	
	function getCount(){
		$.get("/count" + getOptions(), function(data){
			$s.wordNumber.text(data[0].words);
		});
	}
	
	function getOptions(opts){		
		var optArr = [
			{ value: $s.selImpo.attr("value"), prop: "important" }
		,	{ value: $s.selLearnt.attr("value"), prop: "learnt" }
		,	{ value: $s.selType.attr("value"), prop: "type" }
		];
		
		opts = opts || {};

		if($s.chapterCheck.attr("checked")){
			opts.chapters = "all";
		}else{
			opts = controlChapters($s.chapterText, opts);
		}

		for(i = 0; i < optArr.length; ++i){
			if(optArr[i].value !== "all"){
				opts[optArr[i].prop] = optArr[i].value;
			}
		}
		
		return parseGetOpts(opts);
	}
	
	function parseGetOpts(obj){
		var i
			,	res = [];
		obj = obj || {};

		for(i in obj){
			if(typeof obj[i] !== "function" && obj.hasOwnProperty(i)){
				res.push(i + "=" + obj[i]);
			}
		}
		
		if(res.length){
			res = "?" + res.join("&");
		}else{
			res = "";
		}
		
		return res;
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
	
});
