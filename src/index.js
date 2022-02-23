$ = document.querySelector.bind(document);
$$ = document.querySelectorAll.bind(document);
i18n = chrome.i18n.getMessage;

var Settings = {
    get searchEngine(){
        return localStorage.getItem('searchEngine');
    },
    set searchEngine(value){
        localStorage.setItem('searchEngine', value);
    },
    get openBookmarkType(){
        return localStorage.getItem('openBookmarkType');
    },
    set openBookmarkType(value){
        localStorage.setItem('openBookmarkType', value);
    },
    get bookmarkCount(){
        return localStorage.getItem('bookmarkCount');
    },
    set bookmarkCount(value){
        localStorage.setItem('bookmarkCount', value);
    },
    get backgroundOpen(){
        return localStorage.getItem('backgroundOpen');
    },
    set backgroundOpen(value){
        localStorage.setItem('backgroundOpen', value);
    }
};

var SearchEngines = {
    baidu: 'https://www.baidu.com/s?wd={keyword}',
    google: 'https://www.google.com/search?q={keyword}',
    bing: 'https://cn.bing.com/search?q={keyword}'
};

var searchInput = $('.search-ctn input');
var suggestionsCtn = $('.suggestions-ctn');
var showedBookmarks = {};
var selectedBookmark = null;

initSettings();
initI18n();
initSearch();
initRefreshBtn();
initSettingWindow();

function initI18n(){
    document.title = i18n('pluginName');
    $('#label-search-engine').innerHTML = i18n('searchEngine') + ':&nbsp;';
    $('#label-radio-baidu').innerHTML = i18n('baidu');
    $('#label-bookmark-open-type').innerHTML = i18n('bookmarkOpenType') + ':&nbsp;';
    $('#label-radio-thistab').innerHTML = i18n('thistab');
    $('#label-radio-newtab').innerHTML = i18n('newtab');
    $('#label-bookmark-count').innerHTML = i18n('bookmarkCount') + ':&nbsp;';
    $('#label-checkbox-is-background-open').innerHTML = i18n('backgroundOpen');
}

function initSettings(){
    if(!Settings.searchEngine){
        Settings.searchEngine = 'baidu';
    }
    if(!Settings.openBookmarkType){
        Settings.openBookmarkType = '0';
    }
    if(!Settings.bookmarkCount){
        Settings.bookmarkCount = '3';
    }
    if(!Settings.backgroundOpen){
        Settings.backgroundOpen = '1';
    }
}

//搜索框
var showAllBookmarks = false;
var oldKeyword = '';
var inputFinishFlag = true;
function initSearch(){
    $('body').onkeyup = function(e){
        if(e.keyCode == 27){
            //ESC
            searchInput.value = '';
            searchInput.blur();
            suggestionsCtn.innerHTML = '';
        }
    }
    $('body').onkeydown = function(e){
        if(e.keyCode == 17 || e.keyCode == 91 || e.keyCode == 93){
            //Control or Command
            searchInput.focus();
        }
    }
    $('body').onkeydown = function(e){
        searchInput.focus();
    }
    searchInput.addEventListener('compositionstart', function(){
        inputFinishFlag = false;
    });
    searchInput.addEventListener('compositionend', function(){
        setTimeout(function() {
            inputFinishFlag = true;
        }, 150);
    });
    searchInput.onkeyup = function(e){
        if(e.keyCode == 13){
            if(inputFinishFlag){
                doSearch(this.value, $('.suggestions-ctn li span.selected'));
            } else {
                inputFinishFlag = true;
            }
            return;
        }
        if(e.keyCode == 27){
            //ESC
            showAllBookmarks = false;
            return;
        }
        if(e.keyCode == 38){
            //up arrow
            return;
        }
        if(e.keyCode == 40){
            //down arrow
            return;
        }
        var keyword = searchInput.value;
        if(keyword == ''){
            showAllBookmarks = false;
        }
        if(keyword == oldKeyword){
            return;
        }
        oldKeyword = keyword;
        showSuggestions(keyword);
    };
    
    searchInput.onkeydown = function(e){
        if(e.keyCode == 38){
            //up arrow
            preSuggestion();
            return;
        }
        if(e.keyCode == 40){
            //down arrow
            nextSuggestion();
            return;
        }
    }
}

function showSuggestions(keyword){
    var timer = setTimeout(function(){
        clearTimeout(timer);
        suggestionsCtn.innerHTML = '';
        chrome.bookmarks.search(keyword, function(relatedBookmarks){
            Ajax.get('http://suggestion.baidu.com/su?' + formatParams({wd: keyword, t: new Date().getTime(), action: 'opensearch'}), function(r){
                onSuggestionReceived(JSON.parse(r), relatedBookmarks, keyword);
            });
        });
    }, 200);
}


//搜索建议相关事件
function onSuggestionReceived(r, relatedBookmarks, keyword){
    var suggestionLimit = 10;
    var suggestionBookmarkLimit = 3;
    if(showAllBookmarks){
        suggestionBookmarkLimit = Infinity;
    }
    var suggestionsHtml = '';
    if(relatedBookmarks){
        var suggestionCount = 0;
        relatedBookmarks.forEach(function(v, i){
            if(suggestionCount >= suggestionBookmarkLimit){
                return false;
            }
            suggestionsHtml += '<li><span class="suggestion-bookmark" data-href="' + v.url + '" title="' + v.title + '">' + '🔖 ' + ellipsis(v.title) + '</span></li>';
            suggestionCount++;
        });
        if(suggestionCount > 0 && !showAllBookmarks && relatedBookmarks.length > suggestionCount){
            suggestionsHtml += '<li><span class="suggestion-allbookmark" data-type="showAllBookmarks" title="Show all bookmarks">🔖 ...</span></li>';
            suggestionCount++;
        }
    }
    if(r.length>1){
        r[1].forEach(function(v, i){
            if(suggestionCount >= suggestionLimit){
                return false;
            }
            suggestionsHtml += '<li><span class="suggestion-keyword">' + v + '</span></li>';
            suggestionCount++;
        });
    }
    currentSelectSuggestionIndex = -1;
    suggestionsCtn.innerHTML = suggestionsHtml;
    $$('.suggestions-ctn li span').forEach(function(v, i){
        v.onclick = function(){doSearch(this.innerText, this)};
    });
}
function doSearch(keyword, suggestionEl){
    if(suggestionEl && suggestionEl.getAttribute('data-href')){
        window.location.href = suggestionEl.getAttribute('data-href');
    } else if(suggestionEl && suggestionEl.getAttribute('data-type') == 'showAllBookmarks'){
        showAllBookmarks = true;
        showSuggestions(oldKeyword);
    } else {
        window.location.href = SearchEngines[Settings.searchEngine].replace('{keyword}', keyword);
    }
}
var currentSelectSuggestionIndex = -1;
function preSuggestion(){
    if(currentSelectSuggestionIndex <= 0){
        return;
    }
    if(currentSelectSuggestionIndex >= 0 && currentSelectSuggestionIndex < suggestionsCtn.childNodes.length){
        suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.remove('clear-box-shadow');
        suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.remove('selected');
    }
    currentSelectSuggestionIndex--;
    var selectedSuggestionEl = suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0];
    selectedSuggestionEl.classList.add('clear-box-shadow');
    selectedSuggestionEl.classList.add('selected');
    selectedSuggestionEl.scrollIntoView(false);
    if(selectedSuggestionEl.classList.contains('suggestion-keyword')){
        searchInput.value = selectedSuggestionEl.innerHTML;
    } else {
        searchInput.value = oldKeyword;
    }
}
function nextSuggestion(){
    if(currentSelectSuggestionIndex >= suggestionsCtn.childNodes.length - 1){
        return;
    }
    if(currentSelectSuggestionIndex >= 0 && currentSelectSuggestionIndex < suggestionsCtn.childNodes.length){
        suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.remove('clear-box-shadow');
        suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0].classList.remove('selected');
    }
    currentSelectSuggestionIndex++;
    var selectedSuggestionEl = suggestionsCtn.childNodes[currentSelectSuggestionIndex].childNodes[0];
    selectedSuggestionEl.classList.add('clear-box-shadow');
    selectedSuggestionEl.classList.add('selected');
    selectedSuggestionEl.scrollIntoView(false);
    if(selectedSuggestionEl.classList.contains('suggestion-keyword')){
        searchInput.value = selectedSuggestionEl.innerHTML;
    } else {
        searchInput.value = oldKeyword;
    }
}

function initRefreshBtn(){
    $('.refresh a').onclick = function(){
        setWallpaper(true);
    };
}

function initSettingWindow(){
    $('.setting a').onclick = function(){
        $('#setting-window').style.display='flex';
    };
    var settingWindow = $('#setting-window');
    settingWindow.onkeypress = function(e){
        e.stopPropagation();
    };
    $('#setting-window .window-close').onclick = function(){
        this.parentNode.parentNode.parentNode.style.display='none';
    };

    var seRadios = document.getElementsByName('search-engine');
    var radioClick = function(){
        Settings.searchEngine = this.value;
    };
    var currentSe = Settings.searchEngine;
    seRadios.forEach(function(v, i){
        if(v.value == currentSe){
            v.checked = 'checked';
        }else{
            delete v.checked;
        }
        v.onclick = radioClick;
    });

    var openBookmarkTypeRadios = document.getElementsByName('bookmark-open-type');
    var openBookmarkTypeRadioClick = function(){
        Settings.openBookmarkType = this.value;
        displayBookmarks();
    };
    var currentOpenBookmarkType = Settings.openBookmarkType;
    openBookmarkTypeRadios.forEach(function(v, i){
        if(v.value == currentOpenBookmarkType){
            v.checked = 'checked';
        }else{
            delete v.checked;
        }
        v.onclick = openBookmarkTypeRadioClick;
    });

    var bookmarkCountRadios = document.getElementsByName('bookmark-count');
    var bookmarkCountRadioClick = function(){
        Settings.bookmarkCount = this.value;
        loadRandomBookmarks();
    };
    var currentBookmarkCount = Settings.bookmarkCount;
    bookmarkCountRadios.forEach(function(v, i){
        if(v.value == currentBookmarkCount){
            v.checked = 'checked';
        }else{
            delete v.checked;
        }
        v.onclick = bookmarkCountRadioClick;
    });

    var backgroundOpenCheckbox = document.querySelector('#checkbox-background-open');
    var currentBackgroundOpen = Settings.backgroundOpen;
    backgroundOpenCheckbox.checked = currentBackgroundOpen == '1';
    backgroundOpenCheckbox.onclick = function(e){
        Settings.backgroundOpen = e.target.checked ? '1' : '0';
    }
}

function setWallpaper(refresh){
    var today = getToday();
    var day = localStorage.getItem('wallpaper-day');
    var wallpaperUrl = localStorage.getItem('wallpaper-url');
    if(wallpaperUrl && day == today && !refresh){
        doSetWallpaper(wallpaperUrl);
    } else {
        var wallpaperIndex = localStorage.getItem('wallpaper-index');
        if(wallpaperIndex == null || day != today){
            wallpaperIndex = 0;
            localStorage.setItem('wallpaper-index', wallpaperIndex);
        }
        if(refresh){
            wallpaperIndex = parseInt(wallpaperIndex) + 1;
            if(wallpaperIndex > 7){
                wallpaperIndex = 0;
            }
            localStorage.setItem('wallpaper-index', wallpaperIndex);
        }
        Ajax.get('https://www.bing.com/HPImageArchive.aspx?format=js&idx=' + wallpaperIndex + '&n=1', function(r){
        var result = JSON.parse(r);
            var url = 'https://www.bing.com' + result.images[0].url;
            localStorage.setItem('wallpaper-url', url);
            localStorage.setItem('wallpaper-day', today);
            doSetWallpaper(url);
        });
    }
}

function doSetWallpaper(url){
    document.body.style['background-image'] = 'url(' + url + ')';
    document.body.style['background-repeat'] = 'no-repeat';
    document.body.style['background-size'] = 'cover';
}

function getRandomBookmarks(count, callback){
    var allBookMarks = [];
    chrome.bookmarks.getTree(function(bookmarkArray){
        for(var i = 0; i < bookmarkArray.length; i++){
            allBookMarks = allBookMarks.concat(findBookmarks(bookmarkArray[i]));
        }
        var total = allBookMarks.length;
        var randomBookmarks = [];
        for(var i = 0; i < count; i++){
            var randomIndex = Math.floor(Math.random() * total);
            randomBookmarks.push(allBookMarks[randomIndex]);
        }
        callback(randomBookmarks);
    });
}

function findBookmarks(b){
    var subBookmarks = [];
    if(b.children){
        for(var i = 0; i < b.children.length; i++){
            b.children[i].parentPath = (b.parentPath ? (b.parentPath + ' -> ') : '') + b.title;
            var subSubBookmarks = findBookmarks(b.children[i]);
            subBookmarks = subBookmarks.concat(subSubBookmarks);
        }
    } else if(b.url){
        subBookmarks.push(b);
    }
    return subBookmarks;
}

function getToday(){
    var now = new Date();
    return '' + now.getFullYear() + now.getMonth() + now.getDate();
}

function getTimeDiff(milsecs){
    var diffDays = Math.round((new Date().getTime() - milsecs) / 1000 / 3600 / 24);
    var years = Math.floor(diffDays / 365);
    var days = diffDays % 365;
    return (years > 0 ? (years + '年') : '') + days + '天之前';
}

function ellipsis(s, maxLength){
    if(!s){
        return s;
    }
    maxLength = maxLength ? maxLength : 30;
    s = s + '';
    if(s.length > maxLength + 3){
        return s.substr(0, maxLength) + '...';
    }
    return s;
}

function initContextMenu(){
    var rm=document.getElementById("rightMenu");
    var bookmarks = document.querySelectorAll('.flower-ctn .icon');
    for(var i = 0; i < bookmarks.length; i++){
        bookmarks[i].oncontextmenu = handleContextMenu;
    }
    
    document.documentElement.onclick=function () {
        rm.style.display="none";
    }

    document.querySelector('#menu-new-tab').onclick = function(e){
        var bm = showedBookmarks[selectedBookmark.getAttribute('data-id')];
        window.open(bm.url);
    };

    document.querySelector('#menu-remove').onclick = function(e){
        var bmId = selectedBookmark.getAttribute('data-id');
        var bm = showedBookmarks[bmId];
        var msg = '确定要删除书签"' + bm.title + '"吗？';
        if(confirm(msg)){
            chrome.bookmarks.remove(bmId, function(){
                selectedBookmark.parentElement.remove();
            });
        }
    };
}

function handleContextMenu(e) {
    var rm=document.getElementById("rightMenu");
    
    var mx=e.clientX;
    var my=e.clientY;
    var rmWidth=parseInt(rm.style.width);
    var pageWidth=document.documentElement.clientWidth;
    if((mx+rmWidth)<pageWidth)
    {
        rm.style.left=mx+"px";
        rm.style.top=my+"px";
    }
    else
    {
        rm.style.right=mx+"px";
        rm.style.top=my+"px";
    }
    selectedBookmark = e.target;
    rm.style.display="block";
    
    return false;
}

setWallpaper();
loadRandomBookmarks();

function loadRandomBookmarks(){
    getRandomBookmarks(parseInt(Settings.bookmarkCount), function(bookmarks){
        showedBookmarks = {};
        for(var i = 0; i < bookmarks.length; i++){
            showedBookmarks[bookmarks[i].id + ''] = bookmarks[i];
        }
        displayBookmarks();
    });
}

function displayBookmarks(){
    var flowerCtn = document.querySelector('.flower-ctn');
    flowerCtn.innerHTML = '';
    var flowerGround = document.querySelector('.flower-ground');
    var groundWidth = parseInt(Settings.bookmarkCount) * 10;
    flowerGround.style.width = groundWidth + '%';
    flowerGround.style.left = (50 - groundWidth / 2 + 0.5) + '%';
    var html = '';
    var bookmarks = [];
    for(var i in showedBookmarks){
        bookmarks.push(showedBookmarks[i]);
    }
    for(var i = 0; i < bookmarks.length; i++){
        var bm = bookmarks[i];
        showedBookmarks[bm.id + ''] = bm;
        var tip = getTimeDiff(bm.dateAdded) + '&#10;' + ellipsis(bm.title) + '&#10;@' + ellipsis(bm.parentPath) + '&#10;' + ellipsis(bm.url);
        html += '<a deta-title title="' + tip + '" href="###" data-href="' + bm.url + '"><img data-id="' + bm.id + '" class="icon icon-ani-ini" src="chrome://favicon/' + bm.url + '" /></a>';
    }
    flowerCtn.innerHTML = html;
    detaTitle();
    initContextMenu();
    initClickAction();
    var flowers = document.querySelectorAll('.flower-ctn img');
    setTimeout(function(){
        for(var i = 0; i < flowers.length; i++){
            var flower = flowers[i];
            flower.style['transition-delay'] = i * 100 + 'ms';
            flower.classList.add('icon-ani');
        }
    }, 100);
}

function initClickAction(){
    var bookmarkLinks = document.querySelectorAll("[deta-title]");
    for(var i = 0; i < bookmarkLinks.length; i++){
        bookmarkLinks[i].onclick = openBookmark;
    }
}

function openBookmark(e){
    var url = e.target.getAttribute('data-href');
    if(!url){
        url = e.target.parentElement.getAttribute('data-href');
    }
    if(Settings.openBookmarkType == '1'){
        chrome.tabs.create({
            url: url,
            active: Settings.backgroundOpen != '1'
        })
    } else {
        window.location.href = url;
    }
}
