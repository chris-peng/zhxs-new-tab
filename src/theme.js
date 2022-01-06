var Theme = {
    cssRulesMap: {},
    loadCssRules: function(){
        var cssSheets = document.styleSheets;
        for(var i = 0; i < cssSheets.length; i++){
            var cssSheet = document.styleSheets[i];
            if(!cssSheet.disabled){
                try{
                    var cssRules = cssSheet.cssRules;
                } catch (e){
                    console.log(e);
                    continue;
                }
                for(var j = 0; j < cssRules.length; j++){
                    Theme.cssRulesMap[cssRules[j].selectorText] = cssRules[j];
                }
            }
        }
    },
    changeRule: function(selector, style, newValue){
        var cssRule = Theme.cssRulesMap[selector];
        if(cssRule){
            cssRule.style[style] = newValue;
        }
    }
};

Theme.loadCssRules();