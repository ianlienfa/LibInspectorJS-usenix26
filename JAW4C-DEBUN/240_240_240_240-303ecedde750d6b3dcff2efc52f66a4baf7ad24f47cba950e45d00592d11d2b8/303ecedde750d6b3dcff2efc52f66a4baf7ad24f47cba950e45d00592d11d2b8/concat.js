if (typeof tp !== 'undefined') {
  tp.searchSuggest("/us/search-suggest.html?q={keywords}&category=soho", $(".tp-soho-header .tp-soho-form"), "tp-soho-form-suggest");
  tp.searchSuggest("/us/search-suggest.html?q={keywords}&category=soho", $(".tp-soho-header .tp-m-soho-form"), "tp-m-soho-form-suggest");
}
$(function() {
  var $header = $(".tp-soho-header").after("<div id='headerContainer-curtain'></div>");
  var $li = $header.find(".tp-soho-nav-li");
  var $item = $li.find(".tp-soho-sub-item-text");
  /* $li.on("mouseenter", function () {
    $(this).children(".tp-soho-sub-nav").slideDown();
  }).on("mouseleave", function () {
    $(this).children(".tp-soho-sub-nav").hide();
  }); */
  var resizeNum = function() {
    var t = -1;
    $li.show().each(function() {
      if (t < 0) {
        t = $(this).offset().top;
      } else if ($(this).offset().top > t + 1) {
        $(this).hide();
      } else {
        $(this).show();
      }
    });
  };
  resizeNum();
  $(window).on("resize", resizeNum);
  $header.find(".stop-propagation").on("click", function(e) {
    e.stopPropagation();
  });
  $header.find(".tp-soho-search-box-icon").on("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(window).scrollTop(0);
    $("html").addClass("fixed");
    $header.addClass("active");
    $header.find(".tp-soho-form-input").focus();
  });
  $header.find(".tp-soho-form-close").on("click", function() {
    $header.removeClass("active");
    $("html").removeClass("fixed");
  });
  var $mSearch = $header.find(".tp-m-soho-search");
  var $mSearchIcon = $header.find(".tp-m-soho-action .tp-m-soho-search-icon");
  var $mMenu = $header.find(".tp-m-soho-menu");
  var $mMenuIcon = $header.find(".tp-m-soho-action .tp-m-soho-menu-icon");
  var $mMenuItem = $mMenu.find(".tp-m-soho-menu-list>.tp-m-soho-menu-item");
  var $mSubMenuItem = $mMenu.find(".tp-m-soho-submenu-list .tp-container-inner");
  $mMenuIcon.on("click", function(e) {
    e.stopPropagation();
    if ($(this).hasClass("active")) {
      $("html").removeClass("fixed");
    } else {
      $(window).scrollTop(0);
      $("html").addClass("fixed");
    }
    $mSearchIcon.removeClass("active");
    $mSearch.hide();
    $(this).toggleClass("active");
    $mMenu.slideToggle(200, function() {
      $mMenu.removeClass("active");
      $mMenu.height($(window).height() - $mMenu.offset().top);
    });
  });
  $mSearchIcon.on("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    if ($(this).hasClass("active")) {
      $("html").removeClass("fixed");
    } else {
      $(window).scrollTop(0);
      $("html").addClass("fixed");
    }
    $mMenuIcon.removeClass("active");
    $mMenu.hide().removeClass("active").find(".active").removeClass("active");
    $mMenu.find(".tp-m-soho-lastmenu").hide();
    $(this).toggleClass("active");
    $mSearch.slideToggle(200, function() {
      $mSearch.find(".tp-m-soho-form-input").val('');
      $mSearch.find(".tp-m-soho-form-suggest").empty();
      if ($mSearchIcon.hasClass("active")) {
        $mSearch.find(".tp-m-soho-form-input").focus();
      }
    });
  });
  $mMenu.find(".tp-m-soho-submenu-back").on("click", function(e) {
    e.stopPropagation();
    $mMenu.removeClass("active").find(".tp-m-soho-submenu-list .active").removeClass("active");
    $mMenu.find(".tp-m-soho-lastmenu").hide();
  });
  $mMenuItem.on("click", function(e) {
    e.stopPropagation();
    $(this).addClass("active").siblings().removeClass("active");
    $(this).find(".tp-m-soho-submenu").length && $mMenu.addClass("active");
  });
  $mSubMenuItem.on("click", function(e) {
    e.stopPropagation();
    $(this).next(".tp-m-soho-lastmenu").slideToggle(200).parent().toggleClass("active").siblings().removeClass("active").find(".tp-m-soho-lastmenu").slideUp();
  });
  $(document).on("click", function() {
    $header.removeClass("active");
    $mSearchIcon.removeClass("active");
    $mSearch.hide();
    $mSearch.find(".tp-m-soho-form-input").val('');
    $mSearch.find(".tp-m-soho-form-suggest").empty();
    $("html").removeClass("fixed");
  });
});

$(function() {
  //头部的跳转按钮，用于跳过header。主要解决的是希望键盘用户不要重复看到导航栏
  $('.skip-to-main-button').on('click', function() {
    var headerContainer = $('#headerContainer');
    if (headerContainer.length) {
      // 检查是否存在 #headerContainer
      var nextFocusableElement = findFirstFocusableElement(headerContainer.nextAll());
      if (nextFocusableElement) {
        nextFocusableElement.focus(); // 聚焦第一个可聚焦的元素
      } else {
        console.log('没有找到可聚焦的元素');
      }
    }
  });

  function findFirstFocusableElement(elements) {
    for (var i = 0; i < elements.length; i++) {
      var element = $(elements[i]);
      if (element.is(':input, a, button, [tabindex], [contenteditable="true"]')) {
        return element; // 返回第一个可聚焦的元素
      }
      var childFocusableElement = findFirstFocusableElement(element.children());
      if (childFocusableElement) {
        return childFocusableElement; // 返回子元素中的第一个可聚焦的元素
      }
    }
    return null; // 如果没有找到可聚焦的元素，返回 null
  }
});

//底部subscribe旁边提示按钮的ada适配
$(function() {
  var followTitle = $('.tp-follow-title');
  var followIcon = followTitle.find('.tp-follow-icon');
  var followTip = followTitle.find('tp-follow-tip');
  followIcon.on('click', function() {
    if (followTitle.hasClass('active')) {
      followTitle.removeClass('active');
    } else {
      followTitle.addClass('active');
      followTip.focus();
    }
  });
});

//监听导航栏的hover，当检测到这个区域被hover或者focus的时候就打开
$(function() {
  $('.tp-soho-nav-li .arrow-img').on('keydown', function(event) {
    if (event.key === 'Enter') {
      // 获取当前按钮的父元素
      var parentLi = $(this).closest('.tp-soho-nav-li');
      $('.tp-soho-nav-li').not(parentLi).removeClass('active');
      // 触发 mouseenter 事件
      parentLi.addClass('active');
    }
  });
  $('.tp-soho-nav-li .arrow-img').on('click', function() {
    // 获取当前按钮的父元素
    var parentLi = $(this).closest('.tp-soho-nav-li');
    $('.tp-soho-nav-li').not(parentLi).removeClass('active');
    // 触发 mouseenter 事件
    parentLi.addClass('active');
  });
  // 获取导航栏元素
  var navBar = $('.tp-soho-nav-li');

  // 添加鼠标悬停事件监听器
  navBar.on('mouseover', function(event) {
    openNavBar($(this));
  });

  // 定义打开导航栏的函数
  function openNavBar(parentLi) {
    // 移除其他导航项的 active 类
    $('.tp-soho-nav-li').not(parentLi).removeClass('active');
    // 添加当前导航项的 active 类
    parentLi.addClass('active');
  }
  // 添加鼠标悬停事件监听器
  navBar.on('mouseout', function(event) {
    $(this).removeClass('active');
  });
  var navBarItemm = $('.tp-soho-sub-nav');
  // 可选：添加鼠标离开事件监听器以关闭导航栏
  navBarItemm.on('mouseout', function(event) {
    closeNavBar($(this));
  });

  // 定义关闭导航栏的函数
  function closeNavBar(currentTarget) {
    // 移除 active 类
    const parentLi = currentTarget.closest('.tp-soho-nav-li');
    parentLi.removeClass('active');
  }
  var offNavTab = true;
  $('.page-content-wrapper').on('keydown', function(event) {
    var activeElement = document.activeElement;
    if (event.key === 'Tab') {
      if (!$(activeElement).closest('.tp-soho-nav-box').length) {
        if (!offNavTab) {
          offNavTab = true;
          $('.tp-soho-nav-li').removeClass('active');
        }
      } else if ($(activeElement).closest('.tp-soho-nav-box').length) {
        offNavTab = false;
      }
    } else if (event.key === 'Escape') {
      // 找到最近的 .tp-soho-nav-li 元素并设置焦点
      var closestNavItem = $(activeElement).closest('.tp-soho-nav-li');
      console.log(closestNavItem);
      closestNavItem.removeClass('active');
      if (closestNavItem.length) {
        closestNavItem.find('#tp-ada-hiddenButton').focus();
      } else {
        // 如果没有找到最近的 .tp-soho-nav-li，可以设置默认的导航项
        navBar.focus();
      }
    }
  });
});

var video = document.getElementById("myVideo");

// When the video ends, stop it at the last frame
video.onended = function() {
  video.pause(); // Pause the video at the last frame
  video.currentTime = video.duration; // Ensure it ends at the last frame
};

// Optionally, start the video automatically when the page loads
video.autoplay = true;

$(function() {
  var childMenu = $(".wifi7-landingpage-navgation .ul-menu");
  $(".wifi7-landingpage-navgation .header").on("click", function() {
    if ($(this).hasClass('active')) {
      $(this).removeClass('active');
      childMenu.removeClass('active');
    } else {
      $(this).addClass('active');
      childMenu.addClass('active');
    }
  });
  if (window.screen.width > 0) {
    var init = function() {
      $(".wifi7-landingpage-navgation .ul-menu li").on("click", function() {
        $(this).siblings().removeClass("active");
        $(this).addClass("active");
      });
      $(".wifi7-landingpage-navgation .ul-menu").wrap("<div class='sticky-box'>");
    };
    init();
    var $box = $(".section-box");
    var $container = $(".section-container");
    var $section = $("section");
    var $sectionNav = $(".wifi7-landingpage-navgation");
    $(window).scroll(function(e) {
      var scroll = $(window).scrollTop();
      var navTop = $(".wifi7-landingpage-navgation .sticky-box").offset().top;
      var cotTop = $(".section-container").offset().top;
      var cotHeight = $(".section-container").height();
      var navHeight = 0;
      if (navTop <= scroll + navHeight && cotTop > scroll + navHeight - cotHeight) {
        if ($(".wifi7-landingpage-navgation .ul-menu").attr("class").indexOf("fixed") < 0) {
          $(".wifi7-landingpage-navgation .ul-menu").addClass("fixed");
          $(".wifi7-landingpage-navgation .ul-menu.fixed").css("top", navHeight);
        }
      } else {
        if ($(".wifi7-landingpage-navgation .ul-menu").attr("class").indexOf("fixed") > -1) {
          $(".wifi7-landingpage-navgation .ul-menu").removeClass("fixed");
        }
      }
      $(".wifi7-landingpage-navgation .ul-menu li").eq(minDist()).addClass("active").siblings().removeClass("active");
    });
    //tabindex
    function minDist() {
      var array = [];
      $(".section-container .sub-sections").each(function() {
        var temp = $(this).offset().top - $(window).scrollTop() + $(this).height() - 70;
        //content50pxcontent
        if (temp > 0) {
          array.push(temp);
        }
      });
      return $(".section-container .sub-sections").length - array.length;
    }
  }
});
$(function() {
  if (typeof tp === 'undefined') {
    tapo.playVideo($(".video-content-section .video"));
  } else {
    tp.playVideo($(".video-content-section .video"));
  }
  var handleClick = function($item) {
    $item.parent("li").addClass("active").siblings().removeClass("active");
    $item.parents("ul").find("li").each(function() {
      if ($(this).hasClass("active")) {
        $(this).find("p").slideDown();
      } else {
        $(this).find("p").slideUp();
      }
    });
  };
  handleClick($(".questions li .title").eq(0));
  $(".questions li .title").click(function() {
    handleClick($(this));
  });
});
$(function() {
  tp.playVideo($(".video-content-section .video"));
  $('.overview-content .total-control-one-app').addClass('active');
  if (window != top) {
    $('.overview-content .total-control-one-app .img').css({
      height: 'auto',
      width: 'auto'
    });
    $('.overview-content .total-control-one-app .bg').css({
      position: 'relative',
      height: '59.6875em',
      opacity: '1'
    });
    $('.overview-content .total-control-one-app .text').css({
      opacity: '1'
    });
  } else {
    var $container = $(".section-container");
    var $section = $container.find("section");
    var $d = $(".total-control-one-app");
    var $subtitle = $d.find(".subtitle");
    var $dBox = $d.find(".c410-box");
    var $bg = $d.find(".bg");
    var $imgContent = $d.find('.img-content');
    var $icon = $d.find('.icon');
    var $content = $d.find('.content');
    var $desc = $d.find('.desc-container .desc');
    var $text = $d.find(".text");
    var range = 200;
    var resetHeight = function() {
      $dBox.removeClass("fixed").removeClass("absolute");
      $d.height($dBox.outerHeight(true) + range * 2 * $d.find(".bg").length);
    };
    var topLength = 0;
    //tp头部高度
    if ($('.product-info-nav').length > 0) {
      topLength = $('.product-info-nav').height();
    }
    //tapo头部高度
    if ($('.sticky-top').length > 0) {
      topLength = $('.sticky-top').height();
    }
    //de shop头部高度
    if ($('.header').length > 0) {
      topLength = $('.header').height();
    }
    var hardwareScroll = function() {
      var dTop = $d[0].getBoundingClientRect().top;
      if (dTop > topLength) {
        $dBox.removeClass("fixed");
      } else {
        if (dTop <= $dBox.outerHeight(true) - $d.outerHeight(true)) {
          $dBox.removeClass("fixed").addClass("absolute");
        } else {
          var index = -dTop / range;
          index = index > 0 ? Math.floor(index) : 0;
          index = index >= 2 ? 2 : index;
          if (index != $bg.index($bg.filter(".active"))) {
            $imgContent.removeClass("active").eq(index).addClass("active");
            $subtitle.removeClass("active").eq(index).addClass("active");
            $icon.removeClass("active").eq(index).addClass("active");
            $content.removeClass("active").eq(index).addClass("active");
            $desc.removeClass("active").eq(index).addClass("active");
          }
          $dBox.addClass("fixed").removeClass("absolute");
        }
      }
    };
    var hardwareResize = function() {
      resetHeight();
    };
    if ($(window).width() > 0) {
      $(window).on("resize", function() {
        hardwareResize();
        hardwareScroll();
      });
      $(window).on("scroll", function() {
        hardwareScroll();
      });
      setTimeout(function() {
        hardwareResize();
      }, 300);
    }
  }
});

typeof tp !== 'undefined' && tp.subscription($("form.tp-follow-subscribe-form"), $(".tp-follow-subscribe-tpl").html());

