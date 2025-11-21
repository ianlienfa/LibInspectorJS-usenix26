$(function () {
  var s = location.search;
  if (s && typeof URLSearchParams == 'function' && typeof URL == 'function' && typeof Array.from == 'function') {
    var searchParams = new URLSearchParams(location.search);
    var arr = ['ada'];
    var flag = false;
    for (var i = 0; i < arr.length; i++) {
      if (searchParams.has(arr[i])) {
        flag = true;
        break;
      }
    }
    if (flag) {
      var resetHref = function () {
        $("a").each(function () {
          var originHref = $(this).attr("href");
          var href = $(this)[0].href;
          if (originHref && originHref.indexOf('#') !== 0 && href && href.indexOf(location.origin) == 0) {
            try {
              var _url = new URL(href);
              var _searchParams = _url.searchParams;
              for (var i = 0; i < arr.length; i++) {
                if (searchParams.has(arr[i]) && !_searchParams.has(arr[i])) {
                  _searchParams.append(arr[i], searchParams.get(arr[i]));
                }
              }
              $(this).attr("href", _url.origin + _url.pathname + (Array.from(_searchParams).length ? '?' + _searchParams.toString() : '') + _url.hash);
            } catch (err) { }
          }
        })
      };
      resetHref();
      if (typeof MutationObserver == 'function') {
        var config = { attributes: false, childList: true, subtree: true };
        var observer = new MutationObserver(function () {
          resetHref();
        });
        observer.observe(document.body, config);
      }
    }
  }
})