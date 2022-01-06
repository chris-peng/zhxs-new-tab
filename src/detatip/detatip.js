function detaTitle(){
    var deta_title = document.querySelectorAll("[deta-title]");
    for (var i = 0; i < deta_title.length; i++){
        deta_title[i].setAttribute("deta-title",deta_title[i].getAttribute("title"));
        deta_title[i].removeAttribute("title");
    }
}
detaTitle();