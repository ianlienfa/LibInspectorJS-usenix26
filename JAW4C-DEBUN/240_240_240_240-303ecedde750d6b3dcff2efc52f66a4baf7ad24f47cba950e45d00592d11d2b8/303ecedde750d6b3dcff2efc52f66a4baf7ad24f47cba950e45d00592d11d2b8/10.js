(function() {
  if (typeof $ !== 'function') return;
  var setClass = function() {
    var $body = $("body");
    var width = $(window).width();
    if (width <= 736 && !$body.hasClass("mobile-web")) {
      $body.addClass("mobile-web");
    } else if (width > 736 && $body.hasClass("mobile-web")) {
      $body.removeClass("mobile-web");
    }
  };
  setClass();
  $(window).on("resize", setClass);
})();
var privacyAgree = 'I have read and agree to the <a href="https://privacy.tp-link.com/web/official/privacy-policy?region=US" target="_blank">Privacy Policy</a>';
var cookieAgree = 'We have updated our Policies. Read <a href="https://privacy.tp-link.com/web/official/privacy-policy?region=US" target="_blank" aria-label="Click here to browse \'TP-Link Privacy Policy\' page.">Privacy Policy</a> and <a href="https://privacy.tp-link.com/web/official/terms-of-use?region=US" target="_blank" aria-label="Click here to browse \'TP-Link Term of Use\' page.">Terms of Use</a> here.<br> This website uses cookies to improve website navigation, analyze online activities and have the best possible user experience on our website. You can object to the use of cookies at any time. You can find more information in our <a href="https://privacy.tp-link.com/web/official/privacy-policy?region=US" target="_blank" aria-label="Click here to browse \'TP-Link Privacy Policy\' page."> privacy policy </a>. }';
var receiveNewsletter = 'I would like to be kept up to date with TP-Link news, product updates and promotions.}';
var privacyAgreeForNewsletter = 'By completing this form you confirm that you understand and agree to our <a href ="https://privacy.tp-link.com/web/official/privacy-policy?region=US" target="_blank">Privacy Policy</a>.}';