! function() {
  var i = 736 < $(window).width();
  var e = new Swiper(".large .swiper-container", {
    effect: i ? "fade" : "slide",
    loop: !i,
    autoplay: !i && {
      delay: 5e3
    },
    lazy: i || {
      loadPrevNext: !0
    },
    pagination: i ? {} : {
      el: ".large .swiper-pagination"
    },
    thumbs: i && document.querySelectorAll(".thumb .swiper-container").length ? {
      swiper: {
        el: ".thumb .swiper-container",
        slidesPerView: 6,
        spaceBetween: 10,
        lazy: !0,
        navigation: {
          nextEl: ".thumb .thumb-next",
          prevEl: ".thumb .thumb-prev"
        }
      }
    } : {},
    on: {
      click: i ? function() {
        t(this.clickedIndex);
      } : function() {}
    }
  });

  function t(e) {
    var i = tp.showDialog($(".large-gallery").html(), {
      className: "large-gallery"
    });
    var t = (i.find(".large-gallery-index").text(e + 1), new Swiper(".tp-dialog.large-gallery .swiper-container", {
      initialSlide: e,
      lazy: !0,
      navigation: {
        nextEl: ".tp-dialog.large-gallery .swiper-button-next",
        prevEl: ".tp-dialog.large-gallery .swiper-button-prev"
      },
      on: {
        slideChangeTransitionEnd: function() {
          i.find(".large-gallery-index").text(this.realIndex + 1);
          var e = $(this.slides[this.activeIndex]).find("img");
          var e = e.attr("src") || e.attr("data-src");
          i.find("a.download").attr("href", e);
          $(this.slides[this.activeIndex]).find("a").focus();
        }
      }
    }));

    function n(i) {
      $(".tp-dialog.large-gallery .swiper-container .swiper-slide").each(function(e) {
        $(this).attr("aria-selected", e === i ? "true" : "false");
        $(this).attr("aria-hidden", e === i ? "false" : "true");
        $(this).find("a").attr("tabindex", e === i ? "0" : "-1");
      });
      t.slideTo(i);
    }
    n(e);
    $(".tp-dialog.large-gallery .swiper-container .swiper-slide").on("keydown", function(e) {
      var i;
      var t = e.key;
      "ArrowLeft" !== t && "ArrowRight" !== t || (e.preventDefault(), e = $(".tp-dialog.large-gallery .swiper-container .swiper-slide-active").index(), "ArrowLeft" === t ? i = e - 1 : "ArrowRight" === t && (i = e + 1), t = $(".tp-dialog.large-gallery .swiper-container .swiper-slide").length, i < 0 ? i = t - 1 : t <= i && (i = 0), n(i));
    });
  }
  $(".large .swiper-container .swiper-slide").on("keydown", function(e) {
    e = e.key;
    $();
    "Enter" !== e && "" !== e || i && t($(this).index());
  });
  var n = $(".thumb .swiper-slide button");
  var o = $(".large .swiper-slide");

  function a(i) {
    n.each(function(e) {
      $(this).attr("aria-selected", e === i ? "true" : "false");
      $(this).attr("tabindex", e === i ? "0" : "-1");
    });
    o.each(function(e) {
      $(this).attr("aria-hidden", e !== i);
      $(this).attr("tabindex", e === i ? "0" : "-1");
    });
    e.slideTo(i);
  }
  n.each(function(t) {
    $(this).on("click", function() {
      a(t);
    });
    $(this).on("keydown", function(e) {
      var i = e.key;
      "ArrowLeft" !== i && "ArrowRight" !== i || (e.preventDefault(), e = t, "ArrowLeft" === i ? e = 0 < t ? t - 1 : n.length - 1 : "ArrowRight" === i && (e = t < n.length - 1 ? t + 1 : 0), a(e), n.eq(e).focus());
    });
  });
  a(0);
  var r = $(".product-info-basic .gallery");
  var l = $(".product-info-basic .brief");
  var s = r.find(".gallery-inner");
  var d = r.width();
  var c = ($(window).on("resize", function() {
    d = r.width();
  }), $(window).on("scroll resize", function() {
    736 < $(window).width() && l.height() > s.height() && r[0].getBoundingClientRect().top < 0 ? (r.css({
      height: l.height()
    }), l[0].getBoundingClientRect().bottom < s.height() ? s.css({
      position: "absolute",
      top: "auto",
      bottom: 0,
      width: d
    }) : s.css({
      position: "fixed",
      top: 0,
      bottom: "auto",
      width: d
    })) : (r.removeAttr("style"), s.removeAttr("style"));
  }), $(".brief .model-select>p").on("click", function(e) {
    e.stopPropagation();
    $(".brief .model-select>ul").toggleClass("active");
  }), $(document).on("click", function() {
    $(".brief .model-select>ul").removeClass("active");
  }), $(".add-to-cart-box"));
  var p = c.find(".tp-btn");
  var h = p.clone();
  p.length && h.appendTo($("<li class='col buy" + (c.hasClass("hidden") ? " hidden" : "") + "'></li>").appendTo($(".product-menu-list"))).on("click", function() {
    $(this).attr("href") || p.trigger("click");
  });
  c.on("click", ".default-button", function() {
    var e = $(".buy-now-dialog-tpl");
    "undefined" != typeof tp && e.length && (e.find("a").length || "" != e.text().trim()) && tp.showDialog(e.html(), {
      className: "buy-now-dialog"
    }).attr("data-model", ($("#ga-product-name").attr("data-name") + " " + $("#ga-product-name").attr("data-pack")).trim());
  });
}();
$(function() {
  var e = $(".list .cat li");
  0 != e.length && e.each(function(e, i) {
    var t;
    var n;
    var o;
    var a;
    var r = $(this);
    var l = r.children("div.hover").children("div.wrapper");
    0 != l.length && (t = $("<tbody/>"), l.find("li").each(function(e, i) {
      $("<tr/>").append($("<td/>").append($(this).children("img").remove())).append($("<td/>").append($(this).html())).appendTo(t);
    }), a = tpWeb.browser.msie, a = !!(a && a.version && a.version < 8), n = $("<dl/>"), o = this, a && n.width(o.clientWidth - 76), n.append($("<dt/>").append(((a = r.children("a").clone()).children("i").add(a.children("br:first")).remove(), a))).append($("<dd/>").append($("<table/>").append(t))).appendTo(l.html("")), r.hover(function() {
      $(this).click(function() {
        var e = $(this).find("dt>a");
        "_blank" == e.attr("target") ? window.open(e.attr("href")) : window.location.href = e.attr("href");
      }).children("div.hover").show();
    }, function() {
      $(this).children("div.hover").hide();
    }));
  });
});
$(function() {
  function e() {
    var e = $(window).width();
    var i = $(".product-info");
    var t = location.hash.slice(1);
    var t = $("#div_" + t);
    e <= 736 ? $("#div_solutions_cases").insertAfter(i.children(".overview")) : i.children("#div_solutions_cases").remove();
    e <= 736 && 0 == n ? 1 != i.children(".visible").length && ((t.length ? t : i.children("div").eq(0)).addClass("visible"), n = !0) : 736 < e && 1 == n && (n = !1);
  }
  var n = !1;
  e();
  $(window).resize(e);
  $(document).on("click", ".mobile-web .product-info .h2-box a", function() {
    var e = $(this).parent().parent();
    e.siblings("div").slideToggle("fast", function() {
      $(this).removeAttr("style").parent().toggleClass("visible");
      e[0].scrollIntoView();
    }).parent().siblings(".visible").removeClass("visible");
  });
  $(document).on("click", ".mobile-web .product-info .specifications thead th a", function() {
    $(this).parents("thead").siblings("tbody").toggleClass("visible").parent().siblings("table").children(".visible").removeClass("visible");
  });
});
$(function() {
  var e = $(".product-info-nav .related_solutions_cases");
  e.on("click", function() {
    736 < $(window).width() && ($(".product-info-nav .product-menu-list li").eq(0).find("a").trigger("click"), $("html, body").animate({
      scrollTop: $("#div_solutions_cases").offset().top
    }, 0), $(this).parent().addClass("active").siblings().removeClass("active"));
  });
  "#solutions_cases" == location.hash && 736 < $(window).width() && e.trigger("click");
  e.length && $(window).on("scroll", function() {
    !$("#div_overview").is(":hidden") && 736 < $(window).width() && (document.getElementById("div_solutions_cases").getBoundingClientRect().top < $(window).height() / 10 ? e.parent() : e.parents(".product-menu-list").children("li").eq(0)).addClass("active").siblings().removeClass("active");
  });
});
$(function() {
  var e = $("#product-video-box .swiper-slide").size();
  1 < e && new Swiper("#product-video-box .swiper-container", {
    slidesPerView: "auto",
    sapceBetween: 20,
    initialSlide: parseInt(e / 2),
    loop: !1,
    navigation: {
      nextEl: "#product-video-box .swiper-button-next",
      prevEl: "#product-video-box .swiper-button-prev"
    },
    breakpoints: {
      768: {
        slidesPerView: 2.9,
        sapceBetween: 0,
        centeredSlides: !0
      }
    }
  });
});
"undefined" != typeof tpWeb && tpWeb.products.initSiteTopNav("product-info-nav");