$.getScript("https://static.tp-link.com/assets/js/livechat-data_v3.js", function() {
  if ("function" == typeof createLivechatCat && !$("#tp-chat-now").length) {
    var t = "Chat Now";
    switch (location.pathname.split("/")[1].toLowerCase()) {
      case "tw":
      case "zh-hk":
        t = "立即諮詢";
        break;
      case "jp":
        t = "今すぐチャットする";
    }
    var a = location.pathname.split("/")[1].toLowerCase();
    "undefined" != typeof livechatData && void 0 !== livechatData[a] && ($("head").append('<link type="text/css" rel="stylesheet" href="https://static.tp-link.com/assets/css/livechat_v3.css"/>'), $('<div class="ga-click" data-vars-event-category="LiveChat-Button" id="tp-chat-now">' + t + "</div>").appendTo($("body")).on("click", function() {
      var t = tp.showDialog('<div class="livechat-container"></div>', {
        className: "livechat-dialog"
      });
      createLivechatCat(a, t.find(".livechat-container"));
    }));
  }
});