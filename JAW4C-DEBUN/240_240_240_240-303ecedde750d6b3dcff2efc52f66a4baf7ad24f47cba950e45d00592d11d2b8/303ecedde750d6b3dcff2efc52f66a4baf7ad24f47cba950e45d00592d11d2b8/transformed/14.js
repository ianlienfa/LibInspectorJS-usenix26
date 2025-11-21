function _tmp(t) {
  function a(a) {
    for (l = a[0], r = a[1], c = a[2], d = 0, g = [], void 0; d < l.length; d++) {
      var i;
      var s;
      var l;
      var r;
      var c;
      var d;
      var g;
      s = l[d];
      Object.prototype.hasOwnProperty.call(n, s) && n[s] && g.push(n[s][0]);
      n[s] = 0;
    }
    for (i in r) Object.prototype.hasOwnProperty.call(r, i) && (t[i] = r[i]);
    A && A(a);
    while (g.length) g.shift()();
    o.push.apply(o, c || []);
    const _tmp_alltmo = e();
    return _tmp_alltmo;
  }

  function e() {
    for (a = 0, void 0; a < o.length; a++) {
      var t;
      var a;
      for (e = o[a], i = !0, l = 1, void 0; l < e.length; l++) {
        var e;
        var i;
        var l;
        var r = e[l];
        0 !== n[r] && (i = !1);
      }
      i && (o.splice(a--, 1), t = s(s.s = e[0]));
    }
    return t;
  }
  var i = {};
  var n = {
    index: 0
  };
  var o = [];

  function s(a) {
    if (i[a]) return i[a].exports;
    var e = i[a] = {
      i: a,
      l: !1,
      exports: {}
    };
    t[a].call(e.exports, e, e.exports, s);
    e.l = !0;
    const _tmp_n9ytid = e.exports;
    return _tmp_n9ytid;
  }
  s.m = t;
  s.c = i;
  s.d = function(t, a, e) {
    s.o(t, a) || Object.defineProperty(t, a, {
      enumerable: !0,
      get: e
    });
  };
  s.r = function(t) {
    "undefined" !== typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
      value: "Module"
    });
    Object.defineProperty(t, "__esModule", {
      value: !0
    });
  };
  s.t = function(t, a) {
    if (1 & a && (t = s(t)), 8 & a) return t;
    if (4 & a && "object" === typeof t && t && t.__esModule) return t;
    var e = Object.create(null);
    if (s.r(e), Object.defineProperty(e, "default", {
        enumerable: !0,
        value: t
      }), 2 & a && "string" != typeof t)
      for (var i in t) s.d(e, i, function(a) {
        return t[a];
      }.bind(null, i));
    return e;
  };
  s.n = function(t) {
    var a = t && t.__esModule ? function() {
      return t["default"];
    } : function() {
      return t;
    };
    s.d(a, "a", a);
    const _tmp_0ajhkv = a;
    return _tmp_0ajhkv;
  };
  s.o = function(t, a) {
    return Object.prototype.hasOwnProperty.call(t, a);
  };
  s.p = "/";
  var l = window["webpackJsonpada"] = window["webpackJsonpada"] || [];
  var r = l.push.bind(l);
  l.push = a;
  l = l.slice();
  for (var c = 0; c < l.length; c++) a(l[c]);
  var A = r;
  o.push([0, "chunk-vendors"]);
  const _tmp_hn77t = e();
  return _tmp_hn77t;
}
var ada = _tmp({
  0: function(t, a, e) {
    t.exports = e("56d7");
  },
  "00bf": function(t, a, e) {
    "use strict";

    e("bb72");
  },
  "01c8": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "02e6": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "075a": function(t, a, e) {},
  "090b": function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "test",
      new: "New",
      open: "Open",
      save: "Save",
      download: "Download",
      about: "About",
      github: "Github",
      stop: "STOP",
      animationarea: "Anination Area",
      HideImagesAudioVideoAnimation: "Hide Images/Audio/Video/Animation",
      AdjustContrast: "Adjust Contrast",
      AdjustFontsize: "Adjust Fontsize",
      alignleft: "Align Left",
      aligncenter: "Align Center",
      alignRight: "Align Right",
      seizureSafe: "Seizure Safe",
      seizureSafeDetail: "Eliminates flashes and reduces color",
      StopMedia: "Stop Media",
      StopVideo: "Stop Video",
      stopAudio: "Stop Audio",
      stopAnimation: "Stop Animation",
      SetBackgroundColor: "Set BackgroundColor",
      SetTextColors: "Set Text Colors",
      HideImages: "Hide Images",
      HideMedia: "Hide Video/Audio",
      HideAnimation: "Hide Animation",
      lowSaturate: "Low Saturate",
      RESET: "RESET",
      clear: "Clear"
    }, n(i, "seizureSafe", "Seizure Safe"), n(i, "cognitivedisability", "Cognitive Disability"), n(i, "cognitivedisabilityDetail", "Assists with reading and focusing"), n(i, "visionImpaired", "Vision Impaired"), n(i, "visionImpairedDetail", "Enhances the website's visuals"), n(i, "highLighLink", "Highlight Link"), n(i, "highLighTitle", "Highlight Title"), n(i, "hightSaturateBtn", "High Saturate"), n(i, "readableFont", "Readable Font"), n(i, "ADHDFriendlySlider", "ADHD Friendly"), n(i, "ADHDFriendlySliderDetail", "More focus and fewer distractions"), n(i, "AdjustLineHeight", "Adjust LineHeight"), n(i, "AdjustScale", "Adjust Scale"), n(i, "AdjustLetterSpacing", "Adjust LetterSpacing"), n(i, "monochrome", "Monochrome"), n(i, "darkContrast", "Dark Contrast"), n(i, "lightContrast", "Light Contrast"), n(i, "muted", "Muted"), n(i, "bigblackcursor", "Big Black Cursor"), n(i, "bigwhitecursor", "Big White Cursor"), n(i, "readguide", "Reading Guide"), n(i, "readmask", "Reading Mask"), n(i, "highlighthover", "Highlight Hover"), n(i, "SetTitleColors", "Set Title Colors"), n(i, "textmagnifier", "Text Magnifier"), n(i, "readmode", "Read Mode"), n(i, "usefullinks", "Useful Links"), n(i, "selectoption", "select an option"), n(i, "highContrast", "High Contrast"), n(i, "AccessibilityAdjustments", "Accessibility Adjustments"), n(i, "ProfileOption", "Choose the right accessibility profile for you"), n(i, "ColorAdjust", "Color Adjustment"), n(i, "orientationadjusttitle", "Orientation Adjustments"), n(i, "ContentAdjustments", "Content Adjustments"), n(i, "WebADA", "Web Accessibility Solution"), n(i, "pleasechoose", "please choose"), n(i, "nodatatext", "no data"), i);
  },
  "0e87": function(t, a, e) {
    "use strict";

    e("c9d1");
  },
  "0f47": function(t, a, e) {},
  1476: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "216d": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "2ada": function(t, a, e) {},
  "2d04": function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "テスト",
      new: "新しい",
      open: "開いた",
      save: "保存する",
      download: "ダウンロード",
      about: "だいたい",
      github: "Github",
      stop: "ストップ",
      animationarea: "アニメーションエリア",
      HideImagesAudioVideoAnimation: "画像/オーディオ/ビデオ/アニメーションを非表示",
      AdjustContrast: "コントラストを調整する",
      AdjustFontsize: "フォントサイズを調整する",
      alignleft: "左揃え",
      aligncenter: "センターを揃える",
      alignRight: "右揃え",
      seizureSafe: "発作セーフ",
      seizureSafeDetail: "フラッシュを排除し、色を減らします",
      StopMedia: "メディアを停止する",
      StopVideo: "ビデオを停止",
      stopAudio: "オーディオを停止する",
      stopAnimation: "ストップアニメーション",
      SetBackgroundColor: "背景色を設定する",
      SetTextColors: "テキストの色を設定する",
      HideImages: "画像を隠す",
      HideMedia: "ビデオ/オーディオを非表示",
      HideAnimation: "アニメーションを隠す",
      lowSaturate: "低飽和",
      RESET: "リセット",
      clear: "クリア"
    }, n(i, "seizureSafe", "発作セーフ"), n(i, "cognitivedisability", "認知障害"), n(i, "cognitivedisabilityDetail", "読書と集中を支援します"), n(i, "visionImpaired", "視力障害"), n(i, "visionImpairedDetail", "Webサイトのビジュアルを強化します"), n(i, "highLighLink", "ハイライトリンク"), n(i, "highLighTitle", "ハイライトタイトル"), n(i, "hightSaturateBtn", "高飽和"), n(i, "readableFont", "読みやすいフォント"), n(i, "ADHDFriendlySlider", "ADHDにやさしい"), n(i, "ADHDFriendlySliderDetail", "より多くの焦点とより少ない気晴らし"), n(i, "AdjustLineHeight", "LineHeightを調整する"), n(i, "AdjustScale", "スケールを調整する"), n(i, "AdjustLetterSpacing", "文字間隔を調整する"), n(i, "monochrome", "モノクロ"), n(i, "darkContrast", "ダークコントラスト"), n(i, "lightContrast", "光のコントラスト"), n(i, "muted", "ミュート"), n(i, "bigblackcursor", "大きな黒いカーソル"), n(i, "bigwhitecursor", "大きな白いカーソル"), n(i, "readguide", "読書ガイド"), n(i, "readmask", "読書マスク"), n(i, "highlighthover", "ホバーを強調表示"), n(i, "SetTitleColors", "タイトルの色を設定する"), n(i, "textmagnifier", "テキスト拡大鏡"), n(i, "readmode", "読み取りモード"), n(i, "usefullinks", "便利なリンク"), n(i, "selectoption", "選択肢一つを選択してください"), n(i, "highContrast", "ハイコントラスト"), n(i, "AccessibilityAdjustments", "アクセシビリティの調整"), n(i, "ProfileOption", "適切なアクセシビリティプロファイルを選択してください"), n(i, "ColorAdjust", "色調整"), n(i, "orientationadjusttitle", "向きの調整"), n(i, "ContentAdjustments", "コンテンツの調整"), n(i, "WebADA", "Webアクセシビリティソリューション"), n(i, "pleasechoose", "選んでください"), n(i, "nodatatext", "データなし"), i);
  },
  "2eaf": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAiFJREFUeF7t14uNw0AUw0C7/6Id+NODAnCugY0YnR5zHv7SBM50euEPBYiXQAEUIE4gHt8CKECcQDy+BVCAOIF4fAugAHEC8fgWQAHiBOLxLYACxAnE41sABYgTiMe3AAoQJxCPbwEUIE4gHt8CKECcQDy+BVCAOIF4fAugAHEC8fgWQAHiBOLxLYACxAnE41sABZgTuOafYPsBpv+E08c/7gowLKACDOF/T0+/g+njFuAhMP0Opo8rgALcBDjA8AxZgCF8DvASsADDElqAIXwLYAH8CnAC/AzkAMMzxAGG8DkAB+AAHIADcIDhGeIAQ/gcgANwAA7AATjA8AxxgCF8DsABOAAH4AAcYHiGOMAQPgfgAByAA3AADjA8QxxgCJ8DcAAOwAE4AAcYniEOMITPATgAB+AAHIADDM8QBxjC5wAcgANwAA7AAYZniAMM4XMADsABOAAH4ADDM8QBhvA5AAfgAByAA3CA4RniAEP4HIADcAAOwAE4wPAMcYAhfA7AATgAB+AAHGB4hjjAED4H4AAcgANwAA4wPEMcYAifA3AADsABOAAHGJ6hf3CAYXxPK0C8AwqgAHEC8fgWQAHiBOLxLYACxAnE41sABYgTiMe3AAoQJxCPbwEUIE4gHt8CKECcQDy+BVCAOIF4fAugAHEC8fgWQAHiBOLxLYACxAnE41sABYgTiMe3AAoQJxCPbwEUIE4gHt8CKECcQDz+D2duQIF8AasUAAAAAElFTkSuQmCC";
  },
  "2f93": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAA3pJREFUeF7tnctyYzEIRJ3//+hJuequbXoIiBYna8Sj+whrYVd+XvytVuBn9fQM/wKA5RAAAAAsV2D5+GwAAFiuwPLx2QAAsFyB5eOzAQBguQLLx2cDAMByBZaPzwYAgOUKLB+fDQAAsgL/5BMc6FRAutRS8DMFAHTaqdeSPJWCAUB348AJyVMpGAAO2KmXlDyVggFAd+PACclTKRgADtipl5Q8lYIBQHfjwAnJUykYAA7YqZeUPJWCAUB348AJyVMpGAAO2KmXlDyVggFAd+PACclTKRgADtipl5Q8lYL1XjgxXQEAmO5QcX8AUCzw9PQAMN2h4v4AoFjg6ekBYLpDxf0BQLHA09MDwHSHivsDgGKBp6cHgOkOFfcHAMUCT08PANMdKu4PAIoFnp4eAKY7VNwfABQLPD09AEx3qLi/EwDw07LPprZ60lrsmRsAAKB4r3mnb72UrcXYACEyWz1pLQYAAPBWgDcAb4DQTdga1LqVW4vxERBiutWT1mIAAAC8Ab4z0HopW4uxAb67/3r1/h8nAAh50hrU6klrsVYZKRZSAABCMt0bBAD3ehuaDABCMt0bBAD3ehuaDABCMt0bBAD3ehuaDABCMt0bBAD3ehuaDABCMt0bBAD3ehuaDABCMt0bBAD3ehuaDABCMt0bBAD3ehuaDABCMt0b9D8A8LXu2TxInkrBz9wAAACzFVjenXSppWA2gAVakqdSMAAAwFsB3gCzOZAutRTMBpjt/NOd5KkUDAAAwEfAfAakSy0FswHmu6/+tAwALDyVmpQ8lYLZAJIRp4IlT6XgUxNRt04BAKjT1iIzAFjYVNckANRpa5EZACxsqmsSAOq0tcgMABY21TUJAHXaWmQGAAub6poEgDptLTIDgIVNdU0CQJ22FpkBwMKmuiYBoE5bi8wAYGFTXZMAUKetReYTAPC18s9otHrSWuyZGwAAwGI7nmqy9VK2FmMDhJhq9aS1GAAAwFsB3gC8AUI3YWtQ61ZuLcZHQIjpVk9aiwEAAPAG+M5A66VsLcYG+O6++uPOUMYPQQCQVfDvz7d60lrs77UiY1YBAMgqaH4eAMwNzLYPAFkFzc8DgLmB2fYBIKug+XkAMDcw2z4AZBU0Pw8A5gZm2weArILm5wHA3MBs+wCQVdD8PACYG5htHwCyCpqfBwBzA7PtA0BWQfPzvyVBMIHuMI9WAAAAAElFTkSuQmCC";
  },
  "395f": function(t, a, e) {},
  "3c37": function(t, a, e) {},
  "3dbf": function(t, a, e) {
    "use strict";

    e("ddfc");
  },
  "3e84": function(t, a, e) {
    "use strict";

    e("cce0");
  },
  "3f7f": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  4556: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "462e": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  5050: function(t, a, e) {
    "use strict";

    e("d959");
  },
  "56d7": function(t, a, e) {
    "use strict";

    e.r(a);
    e("bd49");
    e("450d");
    var i = e("18ff");
    var n = e.n(i);
    var o = (e("960d"), e("defb"));
    var s = e.n(o);
    var l = (e("cb70"), e("b370"));
    var r = e.n(l);
    var c = (e("1951"), e("eedf"));
    var A = e.n(c);
    var d = (e("6611"), e("e772"));
    var g = e.n(d);
    var u = (e("1f1a"), e("4e4b"));
    var p = e.n(u);
    var h = (e("e960"), e("b35b"));
    var m = e.n(h);
    var f = (e("c526"), e("1599"));
    var C = e.n(f);
    var v = (e("e260"), e("e6cf"), e("cca6"), e("a79d"), e("2b0e"));
    var S = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-widget tp-ada-close-widget",
        attrs: {
          id: "ada-plugin"
        }
      }, [e("div", {
        staticClass: "tp-ada-plugin-box"
      }, [e("div", {
        staticClass: "tp-ada-nav"
      }, [e("closeBtn", {
        attrs: {
          closeIconPath: t.defaultIcon.close_icon_path
        }
      }), e("selectLang")], 1), e("div", {
        staticClass: "tp-ada-panel-main"
      }, [e("div", {
        staticClass: "tp-ada-hero"
      }, [e("p", [t._v(t._s(t.$t(t.ADAtitle)))]), e("resetBtn", {
        attrs: {
          resetIconPath: t.defaultIcon.reset_icon_path
        }
      })], 1), e("div", {
        staticClass: "tp-ada-profile-option"
      }, [e("p", {
        staticClass: "tp-ada-option-title"
      }, [t._v(" " + t._s(t.$t(t.profileoptiontitle)) + " ")]), e("seizureSafeSlider"), e("cognitiveDisabilitySlider"), e("visionImpairedSlider"), e("ADHDFriendlySlider")], 1), e("div", {
        staticClass: "tp-ada-contain-adjust"
      }, [e("p", {
        staticClass: "tp-ada-option-title"
      }, [t._v(t._s(t.$t(t.contentadjustments)))]), e("div", {
        staticClass: "tp-ada-contain-adjust-btns"
      }, [e("adjustScale", {
        attrs: {
          biggerScaleIconPath: t.defaultIcon.bigger_scale_icon_path,
          smallerScaleIconPath: t.defaultIcon.smaller_scale_icon_path
        }
      }), e("highLightTitle", {
        attrs: {
          highLighIconPath: t.defaultIcon.highligh_title_icon_path
        }
      }), e("highLightLink", {
        attrs: {
          highLighLINKIconPath: t.defaultIcon.highligh_link_icon_path
        }
      }), e("magnifier", {
        attrs: {
          textmagnifierIconPath: t.defaultIcon.text_magnifier_icon_path
        }
      }), e("readableFont", {
        attrs: {
          readableIconPath: t.defaultIcon.readableIconPath
        }
      }), e("textCenter", {
        attrs: {
          centerIconPath: t.defaultIcon.center_icon_path
        }
      }), e("textLeft", {
        attrs: {
          leftIconPath: t.defaultIcon.left_icon_path
        }
      }), e("textRight", {
        attrs: {
          rightIconPath: t.defaultIcon.right_icon_path
        }
      })], 1)]), e("div", {
        staticClass: "tp-ada-color-adjust"
      }, [e("p", {
        staticClass: "tp-ada-option-title"
      }, [t._v(t._s(t.$t(t.coloradjusttitle)))]), e("div", {
        staticClass: "tp-ada-color-adjust-btn"
      }, [e("lowsaturateBtn", {
        attrs: {
          saturateIconPath: t.defaultIcon.lowsaturate_icon_path
        }
      }), e("hightSaturateBtn", {
        attrs: {
          hightSaturateIconPath: t.defaultIcon.hightsaturate_icon_path
        }
      }), e("darkContrast", {
        attrs: {
          darkContrastIconPath: t.defaultIcon.dark_contrast_icon_path
        }
      }), e("lightContrast", {
        attrs: {
          lightContrastIconPath: t.defaultIcon.lightContrastIconPath
        }
      }), e("textcolorBtn"), e("monochrome", {
        attrs: {
          monochromeIconPath: t.defaultIcon.monochrome_icon_path
        }
      }), e("titleColor"), e("highContrast", {
        attrs: {
          highContrastIconPath: t.defaultIcon.high_contrast_icon_path
        }
      }), e("bgcBtn")], 1)]), e("div", {
        staticClass: "tp-ada-orientation-adjust"
      }, [e("p", {
        staticClass: "tp-ada-option-title"
      }, [t._v(t._s(t.$t(t.orientationadjusttitle)))]), e("div", {
        staticClass: "tp-ada-orientation-adjust-btn"
      }, [e("muted", {
        attrs: {
          mutedIconPath: t.defaultIcon.muted_icon_path
        }
      }), e("hideImgs", {
        attrs: {
          hideBtnIconPath: t.defaultIcon.hide_image_icon_path
        }
      }), e("stopAnimation", {
        attrs: {
          stopIconPath: t.defaultIcon.stop_animation_icon_path
        }
      }), e("readMask", {
        attrs: {
          readMaskIconPath: t.defaultIcon.readmask_icon_path
        }
      }), e("highlighthover", {
        attrs: {
          highlighthoverIconPath: t.defaultIcon.highlight_hover_icon_path
        }
      }), e("bigblackcursor", {
        attrs: {
          bigBlackCursorIconPath: t.defaultIcon.bigblackcursor_icon_path
        }
      }), e("bigwhitecursor", {
        attrs: {
          bigWhiteCursorIconPath: t.defaultIcon.bigwhitecursor_icon_path
        }
      }), e("hideMedia", {
        attrs: {
          hideBtnIconPath: t.defaultIcon.hide_media_icon_path
        }
      }), e("stopVideo", {
        attrs: {
          stopIconPath: t.defaultIcon.stop_video_icon_path
        }
      }), e("stopAudio", {
        attrs: {
          stopIconPath: t.defaultIcon.stop_audio_icon_path
        }
      }), e("hideAnimation", {
        attrs: {
          hideBtnIconPath: t.defaultIcon.hide_animation_icon_path
        }
      }), e("readGuide", {
        attrs: {
          readGuideIconPath: t.defaultIcon.readguide_icon_path
        }
      }), e("selectLinks")], 1)])]), e("div", {
        staticClass: "tp-ada-footer tp-ada-footer-text"
      }, [e("p", [t._v(t._s(t.$t(t.ada_footer)))])])])]);
    };
    var b = [];
    var B = e("5530");
    var w = (e("a630"), e("3ca3"), e("d3b7"), e("e9c4"), e("2f62"));
    var I = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.magnifierclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.textmagnifierIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.textmagnifierIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("01c8"),
          alt: "icon"
        }
      })])]);
    };
    var k = [];
    e("b824");

    function L() {
      var t = document.getElementsByClassName("tp-ada-magnifier")[0];
      t.classList.remove("tp-ada-magnifier-show");
    }
    var D = L;
    var E = (e("498a"), e("1157"));

    function Q() {
      for (t = [], a = E("*:not(.tp-ada-panel-slider-title,#ada-plugin,#ada-plugin *)"), e = 0, void 0; e < a.length; e++) {
        var t;
        var a;
        var e;
        a[e].innerText && a[e].innerText.trim() && t.push(a[e]);
      }
      return t;
    }
    var F = Q;

    function O() {
      var t = document.getElementsByClassName("tp-ada-magnifier")[0];
      t.classList.add("tp-ada-magnifier-show");
      var a = F();
      Array.from(a, function(a) {
        a.addEventListener("mouseenter", function(e) {
          var i = a.innerText;
          t.innerText = i;
        });
        a.addEventListener("mouseleave", function(a) {
          t.innerText = "";
        });
      });
      document.addEventListener("mousemove", function(a) {
        var e = document.body.clientWidth;
        var i = a.pageX + 10;
        var n = a.pageY + 10;
        i + 600 < e ? (t.style.setProperty("left", i + "px"), t.style.setProperty("top", n + "px")) : (t.style.setProperty("right", "0px"), t.style.setProperty("top", n + "px"));
      });
    }
    var y = O;

    function H(t, a, e) {
      var i;
      return function() {
        var n = this;
        var o = arguments;
        if (i && clearTimeout(i), e) {
          var s = !i;
          i = setTimeout(function() {
            i = null;
          }, a);
          s && t.apply(n, o);
        } else i = setTimeout(function() {
          t.apply(n, o);
        }, a);
      };
    }
    var j = H;
    var x = {
      props: ["textmagnifierIconPath"],
      data: function() {
        return {
          comTitle: "textmagnifier"
        };
      },
      computed: {
        flag: {
          get: function() {
            return this.$store.state.magnifierstate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? (y(), localStorage.magnifier = !0) : (D(), localStorage.magnifier = !1);
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udmagnifierstate"])), {}, {
        magnifierclk: function() {
          var t = this.$store.state.magnifierstate;
          this.udmagnifierstate(!t);
        },
        initState: function() {
          if (this.flag && y(), localStorage.magnifier) {
            var t = "true" === localStorage.magnifier;
            t && this.udmagnifierstate(!0);
          } else {
            localStorage.magnifier = !1;
            this.flag = !1;
          }
        }
      })
    };
    var J = x;
    var M = (e("afdc"), e("2877"));
    var G = Object(M["a"])(J, I, k, !1, null, "c4bc6e6e", null);
    var Y = G.exports;
    var P = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-resetbtn",
        on: {
          click: t.resetclk
        }
      }, [t.resetIconPath ? e("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.resetIconPath,
          alt: "icon"
        }
      }) : e("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: "data:image/png;base64,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",
          alt: "icon"
        }
      }), e("span", [t._v(" " + t._s(t.$t(t.comTitle)))])]);
    };
    var R = [];
    var T = {
      props: ["resetIconPath"],
      data: function() {
        return {
          comTitle: "RESET"
        };
      },
      methods: {
        resetclk: function() {
          this.rst();
          location.reload();
        }
      }
    };
    var U = T;
    var K = (e("a0d7"), Object(M["a"])(U, P, R, !1, null, "41d8ab85", null));
    var N = K.exports;
    var z = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-close-btn",
        on: {
          click: t.closeclk
        }
      }, [e("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.closeIconPath ? e("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.closeIconPath,
          alt: "icon"
        }
      }) : e("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: "data:image/png;base64,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",
          alt: "icon"
        }
      })])]);
    };
    var V = [];
    var X = {
      props: ["closeIconPath"],
      data: function() {
        return {};
      },
      methods: {
        closeclk: function() {
          this.closeBtn();
        }
      }
    };
    var Z = X;
    var q = Object(M["a"])(Z, z, V, !1, null, null, null);
    var W = q.exports;
    var _ = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-select-language"
      }, [e("el-select", {
        attrs: {
          "popper-class": "tp-ada-select-language"
        },
        on: {
          change: function(a) {
            return t.handleClick(t.selectlang);
          }
        },
        model: {
          value: t.selectlang,
          callback: function(a) {
            t.selectlang = a;
          },
          expression: "selectlang"
        }
      }, t._l(this.langlist, function(t) {
        return e("el-option", {
          key: t.value,
          attrs: {
            label: t.name,
            value: t
          }
        });
      }), 1)], 1);
    };
    var $ = [];
    var tt = (e("b0c0"), {
      data: function() {
        return {
          selectlang: ""
        };
      },
      mounted: function() {
        var t;
        localStorage.curLang || (localStorage.setItem("curLang", localStorage.preLang), this.$store.commit("udlangstate", localStorage.curLang));
        this.langlist.some(function(a) {
          a.value == localStorage.curLang && (t = a);
        });
        this.selectlang = t;
      },
      computed: Object(B["a"])({}, Object(w["c"])({
        langlist: function(t) {
          return t.lang.langlist;
        },
        curLang: function(t) {
          return t.lang.curLang;
        }
      })),
      methods: {
        handleClick: function(t) {
          localStorage.setItem("curLang", t.value);
          this.selectlang = t.name;
          this.$i18n.locale = t.value;
        }
      }
    });
    var at = tt;
    var et = (e("8a37"), Object(M["a"])(at, _, $, !1, null, "45bf119b", null));
    var it = et.exports;
    var nt = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-large-btn"
      }, [i("p", {
        staticClass: "tp-ada-action-title"
      }, [t._v(t._s(t.$t(t.comTitle)))]), i("div", {
        staticClass: "tp-ada-action-wrap"
      }, [i("div", {
        staticClass: "tp-ada-icon-style",
        on: {
          click: t.scaleclkSub
        }
      }, [t.smallerScaleIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.smallerScaleIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("6f9a"),
          alt: "icon"
        }
      })]), i("span", {
        staticClass: "tp-ada-action-percent"
      }, [t._v(t._s(t.cur_scale_percent) + "% ")]), i("div", {
        staticClass: "tp-ada-icon-style",
        on: {
          click: t.scaleclkAdd
        }
      }, [t.biggerScaleIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.biggerScaleIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("58ac"),
          alt: "icon"
        }
      })])])]);
    };
    var ot = [];
    e("1157");
    var st = {
      props: ["biggerScaleIconPath", "smallerScaleIconPath"],
      data: function() {
        return {
          comTitle: "AdjustScale"
        };
      },
      computed: Object(w["c"])(["cur_scale_percent", "scalevalue"]),
      watch: {
        scalevalue: function(t, a) {
          document.body.style.setProperty("zoom", t, "important");
        }
      },
      mounted: function() {
        this.initState();
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udscalevalue"])), {}, {
        initState: function() {
          var t = 1;
          var a = parseFloat(localStorage.ada_scale_percent) / 100;
          var e = parseFloat(t) * a;
          this.udscalevalue(e);
        },
        scaleclkAdd: function() {
          this.scaleAdd();
        },
        scaleclkSub: function() {
          this.scaleSub();
        }
      })
    };
    var lt = st;
    var rt = (e("5e3e"), Object(M["a"])(lt, nt, ot, !1, null, "762d35bc", null));
    var ct = rt.exports;
    var At = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.highLighTitleClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.highLighIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.highLighIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("7756"),
          alt: "icon"
        }
      })])]);
    };
    var dt = [];
    var gt = e("1157");
    var ut = {
      props: ["highLighIconPath"],
      data: function() {
        return {
          comTitle: "highLighTitle"
        };
      },
      computed: {
        flag: {
          get: function() {
            return this.$store.state.highlighttitlestate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = gt("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          if (t) {
            for (var i = 0; i < e.length; i++) e[i].classList.add("tp-ada-highligh-title");
            localStorage.setItem("highLighTitle", !0);
          } else {
            for (i = 0; i < e.length; i++) e[i].classList.remove("tp-ada-highligh-title");
            localStorage.setItem("highLighTitle", !1);
          }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.getItem("highLighTitle");
        "true" == t && this.udhighlighttitlestate(!0);
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udhighlighttitlestate"])), {}, {
        highLighTitleClk: function() {
          this.udhighlighttitlestate(!this.flag);
        },
        initState: function() {
          var t = gt("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          if (this.flag)
            for (var a = 0; a < t.length; a++) t[a].classList.add("tp-ada-highligh-title");
          else
            for (a = 0; a < t.length; a++) t[a].classList.remove("tp-ada-highligh-title");
          if (localStorage.highLighTitle) {
            var e = localStorage.highLighTitle;
            this.flag = "true" === e;
            this.flag && this.udhighlighttitlestate(!0);
          } else {
            localStorage.highLighTitle = !1;
            this.flag = !1;
          }
        }
      })
    };
    var pt = ut;
    var ht = (e("fae2"), Object(M["a"])(pt, At, dt, !1, null, "8e037222", null));
    var mt = ht.exports;
    var ft = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.highLightLinkClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.highLighLINKIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.highLighLINKIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("1476"),
          alt: "icon"
        }
      })])]);
    };
    var Ct = [];
    var vt = e("1157");
    var St = {
      props: ["highLighLINKIconPath"],
      data: function() {
        return {
          comTitle: "highLighLink"
        };
      },
      computed: {
        flag: {
          get: function() {
            return this.$store.state.highlightlinkstate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = vt("a:not(#ada-plugin,#ada-plugin *)");
          if (t) {
            for (var i = 0; i < e.length; i++) e[i].classList.add("tp-ada-highligh-link");
            localStorage.setItem("highLighLink", !0);
          } else {
            for (i = 0; i < e.length; i++) e[i].classList.remove("tp-ada-highligh-link");
            localStorage.setItem("highLighLink", !1);
          }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.getItem("highLighLink");
        "true" == t && this.udhighlightlinkstate(!0);
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udhighlightlinkstate"])), {}, {
        highLightLinkClk: function() {
          this.udhighlightlinkstate(!this.$store.state.highlightlinkstate);
        },
        initState: function() {
          var t = vt("a:not(#ada-plugin,#ada-plugin *)");
          if (this.flag)
            for (var a = 0; a < t.length; a++) t[a].classList.add("tp-ada-highligh-link");
          else
            for (a = 0; a < t.length; a++) t[a].classList.remove("tp-ada-highligh-link");
          if (localStorage.highLighLink) {
            var e = localStorage.highLighLink;
            this.flag = "true" === e;
            this.flag && this.udhighlightlinkstate(!0);
          } else {
            localStorage.highLighLink = !1;
            this.flag = !1;
          }
        }
      })
    };
    var bt = St;
    var Bt = Object(M["a"])(bt, ft, Ct, !1, null, null, null);
    var wt = Bt.exports;
    var It = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.readableFontClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.readableIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.readableIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("462e"),
          alt: "icon"
        }
      })])]);
    };
    var kt = [];
    var Lt = {
      props: ["readableIconPath"],
      data: function() {
        return {
          comTitle: "readableFont"
        };
      },
      computed: {
        flag: {
          get: function() {
            return this.$store.state.readableFont;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? this.addreadableFont() : this.clearreadableFont();
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udreadableFont"])), {}, {
        readableFontClk: function() {
          this.udreadableFont(!this.flag);
        },
        initState: function() {
          if (this.flag && this.addreadableFont(), localStorage.readableFont) {
            var t = localStorage.readableFont;
            this.flag = "true" === t;
            "true" == t && this.udreadableFont(!0);
          } else {
            localStorage.readableFont = !1;
            this.flag = !1;
          }
        }
      })
    };
    var Dt = Lt;
    var Et = Object(M["a"])(Dt, It, kt, !1, null, null, null);
    var Qt = Et.exports;
    var Ft = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.centerclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.centerIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.centerIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("2f93"),
          alt: "icon"
        }
      })])]);
    };
    var Ot = [];
    var yt = e("1157");
    var Ht = {
      props: ["centerIconPath"],
      data: function() {
        return {
          comTitle: "aligncenter"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "center" == this.$store.state.textalign;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = yt("body *:not(.tp-ada-option-title,#ada-plugin,#ada-plugin *)");
          if (t)
            for (var i = 0; i < e.length; i++) {
              e[i].classList.remove("tp-ada-alignleft");
              e[i].classList.remove("tp-ada-alignright");
              e[i].classList.add("tp-ada-aligncenter");
            } else
              for (i = 0; i < e.length; i++) e[i].classList.remove("tp-ada-aligncenter");
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udtextalign"])), {}, {
        centerclk: function() {
          var t = localStorage.getItem("textAlign");
          "center" != t ? (localStorage.setItem("textAlign", "center"), this.udtextalign("center")) : (localStorage.setItem("textAlign", "false"), this.udtextalign("false"));
        },
        initState: function() {
          var t = yt("body *:not(.tp-ada-option-title,#ada-plugin,#ada-plugin *)");
          if (this.flag)
            for (var a = 0; a < t.length; a++) {
              t[a].classList.remove("tp-ada-alignleft");
              t[a].classList.remove("tp-ada-alignright");
              t[a].classList.add("tp-ada-aligncenter");
            } else
              for (a = 0; a < t.length; a++) t[a].classList.remove("tp-ada-aligncenter");
          if (localStorage.textAlign) {
            var e = localStorage.textAlign;
            this.flag = "center" === e;
            "center" == e && this.udtextalign("center");
          } else {
            localStorage.textAlign = !1;
            this.flag = !1;
          }
        }
      })
    };
    var jt = Ht;
    var xt = Object(M["a"])(jt, Ft, Ot, !1, null, null, null);
    var Jt = xt.exports;
    var Mt = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn tp-ada-panel-textright-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.rightclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.rightIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.rightIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("92f9"),
          alt: "icon"
        }
      })])]);
    };
    var Gt = [];
    var Yt = e("1157");
    var Pt = {
      props: ["rightIconPath"],
      data: function() {
        return {
          comTitle: "alignRight"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "right" == this.$store.state.textalign;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = Yt("body *:not(.tp-ada-option-title,#ada-plugin,#ada-plugin *)");
          if (t)
            for (var i = 0; i < e.length; i++) {
              e[i].classList.remove("tp-ada-aligncenter");
              e[i].classList.remove("tp-ada-alignleft");
              e[i].classList.add("tp-ada-alignright");
            } else
              for (i = 0; i < e.length; i++) e[i].classList.remove("tp-ada-alignright");
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.textAlign;
        "right" == t && this.udtextalign("right");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udtextalign"])), {}, {
        rightclk: function() {
          var t = localStorage.getItem("textAlign");
          "right" != t ? (localStorage.setItem("textAlign", "right"), this.udtextalign("right"), this.flag = !0) : (localStorage.setItem("textAlign", "false"), this.udtextalign("false"), this.flag = !1);
        },
        initState: function() {
          var t = Yt("body *:not(.tp-ada-option-title,#ada-plugin,#ada-plugin *)");
          if (this.flag)
            for (var a = 0; a < t.length; a++) {
              t[a].classList.remove("tp-ada-aligncenter");
              t[a].classList.remove("tp-ada-alignleft");
              t[a].classList.add("tp-ada-alignright");
            } else
              for (a = 0; a < t.length; a++) t[a].classList.remove("tp-ada-alignright");
          if (localStorage.textAlign) {
            var e = localStorage.textAlign;
            this.flag = "right" === e;
            this.flag && this.udtextalign("right");
          } else {
            localStorage.textAlign = !1;
            this.flag = !1;
          }
        }
      })
    };
    var Rt = Pt;
    var Tt = (e("3dbf"), Object(M["a"])(Rt, Mt, Gt, !1, null, "77b35230", null));
    var Ut = Tt.exports;
    var Kt = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.leftclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.leftIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.leftIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("8eb8"),
          alt: "icon"
        }
      })])]);
    };
    var Nt = [];
    var zt = e("1157");
    var Vt = {
      props: ["leftIconPath"],
      data: function() {
        return {
          comTitle: "alignleft"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "left" == this.$store.state.textalign;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = zt("body *:not(.tp-ada-option-title,#ada-plugin,#ada-plugin *)");
          if (t)
            for (var i = 0; i < e.length; i++) {
              e[i].classList.remove("tp-ada-aligncenter");
              e[i].classList.remove("tp-ada-alignright");
              e[i].classList.add("tp-ada-alignleft");
            } else
              for (i = 0; i < e.length; i++) e[i].classList.remove("tp-ada-alignleft");
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.textAlign;
        "left" == t && this.udtextalign("left");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udtextalign"])), {}, {
        leftclk: function() {
          var t = localStorage.getItem("textAlign");
          "left" != t ? (localStorage.setItem("textAlign", "left"), this.udtextalign("left"), this.flag = !0) : (localStorage.setItem("textAlign", "false"), this.udtextalign("false"), this.flag = !1);
        },
        initState: function() {
          var t = zt("body *:not(.tp-ada-option-title,#ada-plugin,#ada-plugin *)");
          if (this.flag)
            for (var a = 0; a < t.length; a++) {
              t[a].classList.remove("tp-ada-aligncenter");
              t[a].classList.remove("tp-ada-alignright");
              t[a].classList.add("tp-ada-alignleft");
            } else
              for (a = 0; a < t.length; a++) t[a].classList.remove("tp-ada-alignleft");
          if (localStorage.textAlign) {
            var e = localStorage.textAlign;
            this.flag = "left" === e;
            this.flag && this.udtextalign("left");
          } else {
            localStorage.textAlign = !1;
            this.flag = !1;
          }
        }
      })
    };
    var Xt = Vt;
    var Zt = (e("f1b6"), Object(M["a"])(Xt, Kt, Nt, !1, null, "4be0de76", null));
    var qt = Zt.exports;
    var Wt = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.lowSaturateClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.stopComTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.saturateIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.saturateIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("bd05"),
          alt: "icon"
        }
      })])]);
    };
    var _t = [];
    var $t = e("1157");
    var ta = {
      props: ["saturateIconPath"],
      data: function() {
        return {
          stopComTitle: "lowSaturate"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "low" == this.$store.state.saturatestate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = $t(":root");
          t ? (e.removeClass("tp-ada-hightsaturate"), e.addClass("tp-ada-lowersaturate")) : e.removeClass("tp-ada-lowersaturate");
        }
      },
      mounted: function() {
        this.initState();
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udsaturatestate"])), {}, {
        lowSaturateClk: function() {
          var t = this.$store.state.saturatestate;
          "low" == t ? (localStorage.setItem("saturate", "false"), this.udsaturatestate("false")) : (localStorage.setItem("saturate", "low"), this.udsaturatestate("low"));
        },
        initState: function() {
          if (localStorage.saturate) {
            var t = localStorage.saturate;
            "low" == t && this.udsaturatestate("low");
          } else localStorage.saturate = !1;
        }
      })
    };
    var aa = ta;
    var ea = Object(M["a"])(aa, Wt, _t, !1, null, null, null);
    var ia = ea.exports;
    var na = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.hightSaturateClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.hightSaturateBtn)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.hightSaturateIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.hightSaturateIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("9c9e"),
          alt: "icon"
        }
      })])]);
    };
    var oa = [];
    var sa = e("1157");
    var la = {
      props: ["hightSaturateIconPath"],
      data: function() {
        return {
          hightSaturateBtn: "hightSaturateBtn"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "high" == this.$store.state.saturatestate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          var e = sa(":root");
          t ? (e.removeClass("tp-ada-lowersaturate"), e.addClass("tp-ada-hightsaturate")) : e.removeClass("tp-ada-hightsaturate");
        }
      },
      mounted: function() {
        this.initState();
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udsaturatestate"])), {}, {
        hightSaturateClk: function() {
          var t = this.$store.state.saturatestate;
          "high" == t ? (this.udsaturatestate("false"), localStorage.setItem("saturate", "false")) : (this.udsaturatestate("high"), localStorage.setItem("saturate", "high"));
        },
        initState: function() {
          if (localStorage.saturate) {
            var t = localStorage.saturate;
            "high" == t && this.udsaturatestate("high");
          } else localStorage.saturate = !1;
        }
      })
    };
    var ra = la;
    var ca = Object(M["a"])(ra, na, oa, !1, null, null, null);
    var Aa = ca.exports;
    var da = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.darkContrastClk
        }
      }, [e("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), e("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.darkContrastIconPath ? e("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.darkContrastIconPath,
          alt: "icon"
        }
      }) : e("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: "data:image/png;base64,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",
          alt: "icon"
        }
      })])]);
    };
    var ga = [];
    var ua = {
      props: ["darkContrastIconPath"],
      data: function() {
        return {
          comTitle: "darkContrast"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "dark" == this.$store.state.contrastmode;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? this.darkContrast() : this.clearDarkContrast();
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.contrast;
        "dark" == t && this.udcontrastmode("dark");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udcontrastmode"])), {}, {
        darkContrastClk: function() {
          var t = localStorage.contrast;
          "dark" != t ? (this.udcontrastmode("dark"), localStorage.setItem("contrast", "dark"), this.flag = !0) : (this.udcontrastmode("false"), localStorage.setItem("contrast", !1), this.flag = !1);
        },
        initState: function() {
          if (this.flag && this.darkContrast(), localStorage.contrast) {
            var t = localStorage.contrast;
            this.flag = "dark" === t;
            this.flag && this.udcontrastmode("dark");
          } else {
            localStorage.contrast = !1;
            this.flag = !1;
            this.udcontrastmode("false");
          }
        }
      })
    };
    var pa = ua;
    var ha = Object(M["a"])(pa, da, ga, !1, null, null, null);
    var ma = ha.exports;
    var fa = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.lightContrastClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.lightContrastIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.lightContrastIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("75e6"),
          alt: "icon"
        }
      })])]);
    };
    var Ca = [];
    var va = {
      props: ["lightContrastIconPath"],
      data: function() {
        return {
          comTitle: "lightContrast"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "light" == this.$store.state.contrastmode;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? this.lightContrast() : this.clearLightContrast();
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.contrast;
        "light" == t && this.udcontrastmode("light");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udcontrastmode"])), {}, {
        lightContrastClk: function() {
          var t = localStorage.contrast;
          "light" != t ? (localStorage.setItem("contrast", "light"), this.udcontrastmode("light"), this.flag = !0) : (localStorage.setItem("contrast", !1), this.udcontrastmode("false"), this.flag = !1);
        },
        initState: function() {
          if (this.flag && this.lightContrast(), localStorage.contrast) {
            var t = localStorage.contrast;
            this.flag = "light" === t;
            this.flag && this.udcontrastmode("light");
          } else {
            localStorage.contrast = !1;
            this.flag = !1;
          }
        }
      })
    };
    var Sa = va;
    var ba = Object(M["a"])(Sa, fa, Ca, !1, null, null, null);
    var Ba = ba.exports;
    var wa = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-color-btn"
      }, [e("p", {
        staticClass: "tp-ada-action-title"
      }, [t._v(t._s(t.$t(t.comTitle)))]), e("div", [e("ul", t._l(t.tColor, function(a, i) {
        return e("li", {
          key: i,
          class: {
            tp_ada_color_select: t.textcolorstate == i
          },
          style: {
            backgroundColor: a
          },
          on: {
            click: function(e) {
              return t.updatecolor(a, i);
            }
          }
        });
      }), 0)]), e("button", {
        staticClass: "tp-ada-action-text",
        attrs: {
          id: "rst"
        },
        on: {
          click: function(a) {
            t.isactive = !1;
          }
        }
      }, [t._v(" " + t._s(t.$t(t.comText)) + " ")])]);
    };
    var Ia = [];
    var ka = e("1157");

    function La() {
      for (t = [], a = ka("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *):not(.tp-ada-skip-links *)"), e = 0, void 0; e < a.length; e++) {
        var t;
        var a;
        var e;
        a[e].firstChild && a[e].firstChild.nodeValue && a[e].firstChild.nodeValue.trim() && t.push(a[e]);
      }
      return t;
    }
    var Da = La;
    var Ea = e("1157");

    function Qa() {
      for (t = [], a = Ea("body *:not(h1,h2,h3,h4,h5,h6,.tp-ada-panel-slider-title,#ada-plugin,#ada-plugin *)"), e = 0, void 0; e < a.length; e++) {
        var t;
        var a;
        var e;
        a[e].innerText && a[e].innerText && a[e].innerText.trim() && t.push(a[e]);
      }
      return t;
    }
    var Fa = Qa;
    var Oa = (e("1157"), {
      data: function() {
        return {
          comTitle: "SetTextColors",
          comText: "clear",
          isactive: !1,
          ispicked: !1,
          tColor: ["#0076B4", "#7A549C", "#C83733", "#D07021", "#26999F", "#4D7831", "#ffffff", "#000000"]
        };
      },
      computed: Object(w["c"])(["textcolorstate"]),
      watch: {
        textcolorstate: function(t, a) {
          var e = Fa();
          if (t || 0 == t)
            for (i = "tp-ada-text-color-picker-" + t, n = 0, void 0; n < e.length; n++) {
              var i;
              var n;
              e[n].classList.remove("tp-ada-text-color-picker-0");
              e[n].classList.remove("tp-ada-text-color-picker-1");
              e[n].classList.remove("tp-ada-text-color-picker-2");
              e[n].classList.remove("tp-ada-text-color-picker-3");
              e[n].classList.remove("tp-ada-text-color-picker-4");
              e[n].classList.remove("tp-ada-text-color-picker-5");
              e[n].classList.remove("tp-ada-text-color-picker-6");
              e[n].classList.remove("tp-ada-text-color-picker-7");
              e[n].classList.add(i);
            } else
              for (n = 0; n < e.length; n++) {
                e[n].classList.remove("tp-ada-text-color-picker-0");
                e[n].classList.remove("tp-ada-text-color-picker-1");
                e[n].classList.remove("tp-ada-text-color-picker-2");
                e[n].classList.remove("tp-ada-text-color-picker-3");
                e[n].classList.remove("tp-ada-text-color-picker-4");
                e[n].classList.remove("tp-ada-text-color-picker-5");
                e[n].classList.remove("tp-ada-text-color-picker-6");
                e[n].classList.remove("tp-ada-text-color-picker-7");
              }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.handle, 1500, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        this.initRst();
      },
      methods: {
        updatecolor: function(t, a) {
          this.$store.commit("uptextcolorstate", a);
          localStorage.setItem("textColor", a);
        },
        initRst: function() {
          var t = document.getElementById("rst");
          t && t.addEventListener("click", this.clearcolor);
        },
        clearcolor: function() {
          localStorage.setItem("textColor", !1);
          this.$store.commit("uptextcolorstate", "x");
        },
        handle: function() {
          if (localStorage.textColor || (localStorage.textColor = !1), localStorage.textColor && "false" != localStorage.textColor)
            for (t = Fa(), a = parseInt(localStorage.textColor), e = "tp-ada-text-color-picker-" + a, i = 0, void 0; i < t.length; i++) {
              var t;
              var a;
              var e;
              var i;
              t[i].classList.add(e);
            }
          "x" == this.textcolorstate && "false" != localStorage.textColor && this.$store.commit("uptextcolorstate", parseInt(localStorage.textColor));
        }
      }
    });
    var ya = Oa;
    var Ha = (e("9e7b"), Object(M["a"])(ya, wa, Ia, !1, null, "b1426af2", null));
    var ja = Ha.exports;
    var xa = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.monochromeclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.monochromeIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.monochromeIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("609d"),
          alt: "icon"
        }
      })])]);
    };
    var Ja = [];
    var Ma = {
      props: ["monochromeIconPath"],
      data: function() {
        return {
          comTitle: "monochrome"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "monochrome" == this.$store.state.contrastmode;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? this.monochromemode() : this.clsmonochromemode();
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.contrast;
        "monochrome" == t && this.udcontrastmode("monochrome");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udcontrastmode"])), {}, {
        monochromeclk: function() {
          var t = localStorage.contrast;
          "monochrome" != t ? (this.udcontrastmode("monochrome"), this.flag = !0, localStorage.setItem("contrast", "monochrome")) : (localStorage.setItem("contrast", !1), this.udcontrastmode("false"), this.flag = !1);
        },
        initState: function() {
          if (this.flag && this.monochromemode(), localStorage.contrast) {
            var t = localStorage.contrast;
            this.flag = "monochrome" === t;
            1 == this.flag && this.udcontrastmode("monochrome");
          } else {
            localStorage.contrast = !1;
            this.flag = !1;
            this.udcontrastmode("false");
          }
        }
      })
    };
    var Ga = Ma;
    var Ya = (e("c2ed"), Object(M["a"])(Ga, xa, Ja, !1, null, "655e30a7", null));
    var Pa = Ya.exports;
    var Ra = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-color-btn"
      }, [e("p", {
        staticClass: "tp-ada-action-title"
      }, [t._v(t._s(t.$t(t.comTitle)))]), e("div", [e("ul", t._l(t.tColor, function(a, i) {
        return e("li", {
          key: i,
          class: {
            tp_ada_color_select: t.titlecolorstate == i
          },
          style: {
            backgroundColor: a
          },
          on: {
            click: function(e) {
              return t.updatecolor(a, i);
            }
          }
        });
      }), 0)]), e("button", {
        staticClass: "tp-ada-action-text",
        attrs: {
          id: "cleartitlecolor"
        },
        on: {
          click: function(a) {
            t.isactive = !1;
          }
        }
      }, [t._v(" " + t._s(t.$t(t.comText)) + " ")])]);
    };
    var Ta = [];
    var Ua = (e("7db0"), e("fb6a"), e("1157"));

    function Ka() {
      var t = localStorage.initnavclassname;
      var a = Ua(t).find("*");
      var e = localStorage.initfooterclassname;
      var i = Ua(e).find("*");
      var n = Ua("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)").not(a).not(i);
      n = [].slice.call(n);
      var o = Array.from(n, function(t) {
        var a = [];
        var e = window.getComputedStyle(t, null).getPropertyValue("color");
        a.push(e);
        var i = t.style.color;
        i = "" != i.trim();
        a.push(i);
        const _tmp_rirgkn = a;
        return _tmp_rirgkn;
      });
      return o;
    }
    var Na = Ka;
    var za = e("1157");
    var Va = {
      data: function() {
        return {
          comTitle: "SetTitleColors",
          comText: "clear",
          isactive: !1,
          ispicked: !1,
          tColor: ["#0076B4", "#7A549C", "#C83733", "#D07021", "#26999F", "#4D7831", "#ffffff", "#000000"]
        };
      },
      computed: Object(w["c"])(["titlecolorstate"]),
      watch: {
        titlecolorstate: function(t, a) {
          var e = za("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          if (t || 0 == t)
            for (i = "tp-ada-title-color-picker-" + t, n = 0, void 0; n < e.length; n++) {
              var i;
              var n;
              e[n].classList.remove("tp-ada-title-color-picker-0");
              e[n].classList.remove("tp-ada-title-color-picker-1");
              e[n].classList.remove("tp-ada-title-color-picker-2");
              e[n].classList.remove("tp-ada-title-color-picker-3");
              e[n].classList.remove("tp-ada-title-color-picker-4");
              e[n].classList.remove("tp-ada-title-color-picker-5");
              e[n].classList.remove("tp-ada-title-color-picker-6");
              e[n].classList.remove("tp-ada-title-color-picker-7");
              e[n].classList.add(i);
            } else this.clrTitleColor();
        }
      },
      mounted: function() {
        new MutationObserver(j(this.handle, 1500, !1)).observe(document, {
          subtree: !0,
          childList: !0
        });
        this.initRst();
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["getPreTitleColor", "uptitlecolorstate"])), {}, {
        handle: function() {
          if (localStorage.titleColor || (localStorage.titleColor = !1), localStorage.titleColor && "false" != localStorage.titleColor)
            for (t = parseInt(localStorage.titleColor), a = za("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)"), e = 0, void 0; e < a.length; e++) {
              var t;
              var a;
              var e;
              a[e].classList.remove("tp-ada-title-color-picker-0");
              a[e].classList.remove("tp-ada-title-color-picker-1");
              a[e].classList.remove("tp-ada-title-color-picker-2");
              a[e].classList.remove("tp-ada-title-color-picker-3");
              a[e].classList.remove("tp-ada-title-color-picker-4");
              a[e].classList.remove("tp-ada-title-color-picker-5");
              a[e].classList.remove("tp-ada-title-color-picker-6");
              a[e].classList.remove("tp-ada-title-color-picker-7");
              a[e].classList.add("tp-ada-title-color-picker-" + t);
            }
          if ("x" == this.titlecolorstate && "false" != localStorage.titleColor) {
            var i = localStorage.titleColor;
            this.uptitlecolorstate(i);
            this.$store.commit("uptitlecolorstate", localStorage.titleColor);
          }
        },
        updatecolor: function(t, a) {
          localStorage.setItem("titleColor", a);
          this.uptitlecolorstate(a);
        },
        initRst: function() {
          var t = document.getElementById("cleartitlecolor");
          t && t.addEventListener("click", this.clearcolor);
        },
        clearcolor: function() {
          localStorage.setItem("titleColor", !1);
          this.uptitlecolorstate("x");
        }
      })
    };
    var Xa = Va;
    var Za = (e("3e84"), Object(M["a"])(Xa, Ra, Ta, !1, null, "16c52fee", null));
    var qa = Za.exports;
    var Wa = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.highContrastClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.highContrastIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.highContrastIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("e6fa"),
          alt: "icon"
        }
      })])]);
    };
    var _a = [];
    var $a = {
      props: ["highContrastIconPath"],
      data: function() {
        return {
          comTitle: "highContrast"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "high" == this.$store.state.contrastmode;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? this.highContrast() : this.clearhighContrast();
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.contrast;
        "high" == t && this.udcontrastmode("high");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udcontrastmode"])), {}, {
        highContrastClk: function() {
          var t = localStorage.contrast;
          "high" != t ? (localStorage.setItem("contrast", "high"), this.udcontrastmode("high"), this.flag = !0) : (localStorage.setItem("contrast", !1), this.udcontrastmode("false"), this.flag = !1);
        },
        initState: function() {
          if (localStorage.contrast) {
            var t = localStorage.contrast;
            this.flag = "high" === t;
            this.flag && this.udcontrastmode("high");
          } else {
            localStorage.contrast = !1;
            this.flag = !1;
          }
        }
      })
    };
    var te = $a;
    var ae = Object(M["a"])(te, Wa, _a, !1, null, null, null);
    var ee = ae.exports;
    var ie = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.ishide
        },
        on: {
          click: t.hideImgsClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.hideBtnIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.hideBtnIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("c6f0"),
          alt: "icon"
        }
      })])]);
    };
    var ne = [];
    var oe = e("1157");

    function se(t) {
      return Array.from(oe("img:not(.tp-ada-trigger,#ada-plugin,#ada-plugin *)"));
    }
    var le = se;
    var re = (e("25f0"), e("1157"));

    function ce(t) {
      for (a = re("*:not(.tp-ada-trigger,#ada-plugin,#ada-plugin *)"), e = [], i = 0, void 0; i < a.length; i++) {
        var a;
        var e;
        var i;
        var n = window.getComputedStyle(a[i], null).getPropertyValue("background-image");
        "none" != n.toString() && "BUTTON" != a[i].tagName && e.push(a[i]);
      }
      return e;
    }
    var Ae = ce;
    var de = (e("395f"), {
      props: ["hideBtnIconPath"],
      data: function() {
        return {
          comTitle: "HideImages"
        };
      },
      computed: {
        ishide: {
          get: function() {
            return this.$store.state.hideimgstate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        ishide: function(t, a) {
          var e = le(document);
          var i = Ae(document);
          if (t) {
            for (var n = 0; n < e.length; n++) e[n].classList.add("tp-ada-hide");
            for (n = 0; n < i.length; n++) i[n].classList.add("tp-ada-hide-bgimage");
            localStorage.setItem("hideImgs", !0);
          } else {
            for (n = 0; n < e.length; n++) e[n].classList.remove("tp-ada-hide");
            for (n = 0; n < i.length; n++) i[n].classList.remove("tp-ada-hide-bgimage");
            localStorage.setItem("hideImgs", !1);
          }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udhideimgstate"])), {}, {
        hideImgsClk: function() {
          this.udhideimgstate(!this.$store.state.hideimgstate);
        },
        initState: function() {
          var t = le(document);
          var a = Ae(document);
          if (this.$store.state.hideimgstate) {
            for (var e = 0; e < t.length; e++) t[e].classList.add("tp-ada-hide");
            for (e = 0; e < a.length; e++) a[e].classList.add("tp-ada-hide-bgimage");
          }
          if (localStorage.hideImgs) {
            var i = localStorage.hideImgs;
            this.ishide = "false" !== i;
            "true" == i && this.udhideimgstate(!0);
          } else {
            localStorage.hideImgs = !1;
            this.ishide = !1;
          }
        }
      })
    });
    var ge = de;
    var ue = (e("5050"), Object(M["a"])(ge, ie, ne, !1, null, "00d23c90", null));
    var pe = ue.exports;
    var he = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.readmodeclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.readmodeIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.readmodeIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("98f9"),
          alt: "icon"
        }
      })])]);
    };
    var me = [];
    var fe = (e("1157"), {
      props: ["readmodeIconPath"],
      data: function() {
        return {
          comTitle: "readmode"
        };
      },
      computed: {
        flag: {
          get: function() {
            return this.$store.state.readmodestate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          if (t) {
            var e = document.createElement("div");
            var i = document.createElement("div");
            e.classList.add("tp-ada-readmode-box");
            i.classList.add("tp-ada-readmode-box-content");
            document.body.appendChild(e);
            e.appendChild(i);
            this.readmode();
          } else {
            e = document.getElementsByClassName("tp-ada-readmode-box")[0];
            i = document.getElementsByClassName("tp-ada-readmode-box-content")[0];
            i && e.removeChild(i);
            i = null;
            e && document.body.removeChild(e);
          }
        }
      },
      mounted: function() {
        this.initBtnState();
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udreadmodestate"])), {}, {
        readmodeclk: function() {
          var t = this.$store.state.readmodestate;
          t ? (localStorage.setItem("readmode", "false"), this.udreadmodestate(!1)) : (localStorage.setItem("readmode", "true"), this.udreadmodestate(!0));
        },
        initBtnState: function() {
          if (localStorage.readmode) {
            var t = "true" === localStorage.readmode;
            this.udreadmodestate(t);
          } else {
            localStorage.setItem("readmode", !1);
            this.udreadmodestate(!1);
          }
        }
      })
    });
    var Ce = fe;
    var ve = Object(M["a"])(Ce, he, me, !1, null, null, null);
    var Se = ve.exports;
    var be = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.isstop
        },
        on: {
          click: t.stopclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.stopComTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.stopIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.stopIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("e95a7"),
          alt: "icon"
        }
      })])]);
    };
    var Be = [];
    var we = e("1157");

    function Ie(t) {
      for (a = we("*:not(#ada-plugin,#ada-plugin *)"), e = [], i = 0, void 0; i < a.length; i++) {
        var a;
        var e;
        var i;
        "none" !== window.getComputedStyle(a[i], null).getPropertyValue("animation-name") && e.push(a[i]);
      }
      return e;
    }
    var ke = Ie;
    var Le = e("1157");

    function De(t) {
      return Array.from(Le("audio:not(#ada-plugin,#ada-plugin *)"));
    }
    var Ee = De;
    var Qe = e("1157");

    function Fe(t) {
      return Array.from(Qe("video:not(#ada-plugin,#ada-plugin *)"));
    }
    var Oe = Fe;
    e("1157");

    function ye() {
      var t = ke(document);
      var a = Array.from(t, function(t) {
        var a = window.getComputedStyle(t, null).getPropertyValue("animation-play-state");
        return "paused" != a;
      });
      return a;
    }
    var He;
    var je = ye;
    var xe = {
      props: ["stopIconPath"],
      data: function() {
        return {
          stopComTitle: "stopAnimation"
        };
      },
      computed: {
        isstop: {
          get: function() {
            return this.$store.state.stopanistate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        isstop: function(t, a) {
          localStorage.getItem("stopAnimation");
          var e = ke(document);
          var i = this.$store.state.animationState;
          if (t) {
            for (var n = 0; n < e.length; n++) {
              e[n].classList.remove("tp-ada-play-animation");
              e[n].classList.add("tp-ada-stop-animation");
            }
            localStorage.setItem("stopAnimation", !0);
          } else {
            for (n = 0; n < e.length; n++) i[n] && (e[n].classList.remove("tp-ada-stop-animation"), e[n].classList.add("tp-ada-play-animation"));
            localStorage.setItem("stopAnimation", !1);
          }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udstopanistate", "setAnimationState"])), {}, {
        stopclk: function() {
          this.$store.commit("udstopanistate", !this.$store.state.stopanistate);
        },
        initState: function() {
          var t = je();
          this.setAnimationState(t);
          localStorage.getItem("stopAnimation");
          var a = ke(document);
          if (this.isstop)
            for (var e = 0; e < a.length; e++) {
              a[e].classList.remove("tp-ada-play-animation");
              a[e].classList.add("tp-ada-stop-animation");
            }
          if (localStorage.stopAnimation) {
            var i = localStorage.stopAnimation;
            "true" == i && this.udstopanistate(!0);
          } else localStorage.stopAnimation = !1;
        }
      })
    };
    var Je = xe;
    var Me = Object(M["a"])(Je, be, Be, !1, null, null, null);
    var Ge = Me.exports;
    var Ye = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn tp-ada-panel-readmask-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.readmaskclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.readMaskIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.readMaskIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("d9e8"),
          alt: "icon"
        }
      })])]);
    };
    var Pe = [];
    var Re = e("ade3");
    var Te = (He = {
      props: ["readMaskIconPath"],
      data: function() {
        return {
          comTitle: "readmask"
        };
      },
      computed: Object(w["c"])({
        flag: function(t) {
          return t.readmask;
        }
      })
    }, Object(Re["a"])(He, "computed", {
      flag: {
        get: function() {
          return this.$store.state.readmask;
        },
        set: function(t) {
          return t;
        }
      }
    }), Object(Re["a"])(He, "watch", {
      flag: function(t, a) {
        t ? this.readmask() : this.clsreadmask();
      }
    }), Object(Re["a"])(He, "mounted", function() {
      this.initState();
      var t = localStorage.readmask;
      "true" == t && this.udreadmask(!0);
    }), Object(Re["a"])(He, "methods", Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udreadmask"])), {}, {
      readmaskclk: function() {
        var t = localStorage.getItem("readmask");
        "true" != t ? (localStorage.setItem("readmask", "true"), this.udreadmask(!0)) : (localStorage.setItem("readmask", "false"), this.udreadmask(!1));
      },
      initState: function() {
        if (localStorage.readmask) {
          var t = localStorage.readmask;
          this.flag = "true" === t;
          this.flag && this.udreadmask(!0);
        } else {
          localStorage.readmask = !1;
          this.flag = !1;
        }
      }
    })), He);
    var Ue = Te;
    var Ke = Object(M["a"])(Ue, Ye, Pe, !1, null, null, null);
    var Ne = Ke.exports;
    var ze = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn tp-ada-panel-highlighthover-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.highlighthoverclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.highlighthoverIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.highlighthoverIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("4556"),
          alt: "icon"
        }
      })])]);
    };
    var Ve = [];
    var Xe = {
      props: ["highlighthoverIconPath"],
      data: function() {
        return {
          comTitle: "highlighthover"
        };
      },
      computed: Object(w["c"])({
        flag: function(t) {
          return t.highlighthoverstate;
        }
      }),
      watch: {
        flag: function(t, a) {
          t ? (localStorage.setItem("hlhover", "true"), document.body.classList.add("tp-ada-emphasize-hover")) : (localStorage.setItem("hlhover", "false"), document.body.classList.remove("tp-ada-emphasize-hover"));
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udhighlighthoverstate"])), {}, {
        highlighthoverclk: function() {
          this.udhighlighthoverstate(!this.flag);
        },
        initState: function() {
          if (this.flag && document.body.classList.add("tp-ada-emphasize-hover"), localStorage.hlhover) {
            var t = localStorage.hlhover;
            "true" === t && this.udhighlighthoverstate(!0);
          } else {
            localStorage.hlhover = !1;
            this.flag = !1;
          }
        }
      })
    };
    var Ze = Xe;
    var qe = Object(M["a"])(Ze, ze, Ve, !1, null, null, null);
    var We = qe.exports;
    var _e = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.ishide
        },
        on: {
          click: t.hideMediaClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.hideBtnIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.hideBtnIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("c6f0"),
          alt: "icon"
        }
      })])]);
    };
    var $e = [];
    var ti = (e("99af"), {
      props: ["hideBtnIconPath"],
      data: function() {
        return {
          comTitle: "HideMedia"
        };
      },
      computed: {
        ishide: {
          get: function() {
            return this.$store.state.hidemediastate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        ishide: function(t, a) {
          var e = Oe(document);
          var i = Ee(document);
          var n = i.concat(e);
          var o = (localStorage.hideMedia, this.$store.state.videoState);
          var s = this.$store.state.audioState;
          if (t)
            for (var l = 0; l < n.length; l++) {
              n[l].pause();
              n[l].classList.add("tp-ada-hide");
            } else {
              for (l = 0; l < e.length; l++)
                for (l = 0; l < e.length; l++) {
                  o[l] ? e[l].play() : e[l].pause();
                  e[l].classList.remove("tp-ada-hide");
                }
              for (l = 0; l < i.length; l++)
                for (l = 0; l < i.length; l++) {
                  s[l] ? i[l].play() : i[l].pause();
                  i[l].classList.remove("tp-ada-hide");
                }
            }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = "true" === localStorage.hideMedia;
        t && this.udhidemediastate(!0);
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udhidemediastate"])), {}, {
        hideMediaClk: function() {
          var t = this.$store.state.hidemediastate;
          t ? (localStorage.setItem("hideMedia", !1), this.udhidemediastate(!1)) : (this.udhidemediastate(!0), localStorage.setItem("hideMedia", !0));
        },
        initState: function() {
          var t = Oe(document);
          var a = Ee(document);
          var e = a.concat(t);
          localStorage.hideMedia;
          this.$store.state.videoState;
          this.$store.state.audioState;
          if (this.ishide)
            for (var i = 0; i < e.length; i++) {
              e[i].pause();
              e[i].classList.add("tp-ada-hide");
            }
          if (localStorage.hideMedia) {
            var n = localStorage.hideMedia;
            this.ishide = "false" !== n;
            this.ishide && this.udhidemediastate(!0);
          } else {
            localStorage.hideMedia = !1;
            this.ishide = !1;
          }
        }
      })
    });
    var ai = ti;
    var ei = (e("0e87"), Object(M["a"])(ai, _e, $e, !1, null, "2192f3c1", null));
    var ii = ei.exports;
    var ni = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.isstop
        },
        on: {
          click: t.stopclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.stopIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.stopIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("2eaf"),
          alt: "icon"
        }
      })])]);
    };
    var oi = [];
    var si = e("1157");

    function li() {
      var t = si("audio:not(#ada-plugin,#ada-plugin *)");
      var a = Array.from(t, function(t) {
        return !(t.paused && !t.autoplay);
      });
      return a;
    }
    var ri = li;
    var ci = {
      props: ["stopIconPath"],
      data: function() {
        return {
          comTitle: "stopAudio"
        };
      },
      computed: {
        isstop: {
          get: function() {
            return this.$store.state.stopaudiostate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        isstop: function(t, a) {
          var e = Ee(document);
          var i = (localStorage.getItem("stopAudio"), this.$store.state.audioState);
          if (t) {
            for (var n = 0; n < e.length; n++) e[n].pause();
            localStorage.setItem("stopAudio", !0);
          } else {
            for (n = 0; n < e.length; n++) i[n] ? e[n].play() : e[n].pause();
            localStorage.setItem("stopAudio", !1);
          }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udstopaudiostate", "setAudioState"])), {}, {
        stopclk: function() {
          this.udstopaudiostate(!this.$store.state.stopaudiostate);
        },
        initState: function() {
          var t = ri();
          this.setAudioState(t);
          var a = Ee(document);
          localStorage.getItem("stopAudio");
          this.$store.state.audioState;
          if (this.isstop)
            for (var e = 0; e < a.length; e++) a[e].pause();
          if (localStorage.stopAudio) {
            var i = localStorage.stopAudio;
            "true" == i && this.udstopaudiostate(!0);
          } else {
            localStorage.stopAudio = !1;
            this.isstop = !1;
          }
        }
      })
    };
    var Ai = ci;
    var di = Object(M["a"])(Ai, ni, oi, !1, null, null, null);
    var gi = di.exports;
    var ui = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn tp-ada-panel-bigblackcursor-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.bigblackcursorclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.bigBlackCursorIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.bigBlackCursorIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("dbb5"),
          alt: "mutedicon"
        }
      })])]);
    };
    var pi = [];
    e("1157");
    var hi = e("1157");
    var mi = {
      props: ["bigBlackCursorIconPath"],
      data: function() {
        return {
          comTitle: "bigblackcursor"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "black" == this.$store.state.bigcursor;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? (document.body.classList.add("tp-ada-big-black-cursor"), hi(".tp-ada-panel-big-btn").addClass("tp-ada-big-black-cursor"), hi(".tp-ada-panel-large-btn").addClass("tp-ada-big-black-cursor"), hi(".tp-ada-panel-color-btn").addClass("tp-ada-big-black-cursor")) : (document.body.classList.remove("tp-ada-big-black-cursor"), hi(".tp-ada-panel-big-btn").removeClass("tp-ada-big-black-cursor"), hi(".tp-ada-panel-large-btn").removeClass("tp-ada-big-black-cursor"), hi(".tp-ada-panel-color-btn").removeClass("tp-ada-big-black-cursor"));
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.bigcursor;
        "black" == t && document.body.classList.add("tp-ada-big-black-cursor");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udbigcursor"])), {}, {
        bigblackcursorclk: function() {
          var t = localStorage.getItem("bigcursor");
          "black" != t ? (localStorage.setItem("bigcursor", "black"), this.udbigcursor("black"), this.flag = !0) : (localStorage.setItem("bigcursor", "false"), this.udbigcursor("false"), this.flag = !1);
        },
        initState: function() {
          if (this.flag && (document.body.classList.add("tp-ada-big-black-cursor"), hi(".tp-ada-panel-big-btn").addClass("tp-ada-big-black-cursor"), hi(".tp-ada-panel-large-btn").addClass("tp-ada-big-black-cursor"), hi(".tp-ada-panel-color-btn").addClass("tp-ada-big-black-cursor")), localStorage.bigcursor) {
            var t = "black" === localStorage.bigcursor;
            t && this.udbigcursor("black");
          } else {
            localStorage.bigcursor = !1;
            this.flag = !1;
          }
        }
      })
    };
    var fi = mi;
    var Ci = Object(M["a"])(fi, ui, pi, !1, null, null, null);
    var vi = Ci.exports;
    var Si = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn tp-ada-panel-readguide-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.readguideclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.readGuideIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.readGuideIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("b008"),
          alt: "icon"
        }
      })])]);
    };
    var bi = [];
    var Bi = {
      props: ["readGuideIconPath"],
      data: function() {
        return {
          comTitle: "readguide"
        };
      },
      computed: {
        flag: {
          get: function() {
            return this.$store.state.readguidestate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? this.readguide() : this.clsreadguide();
        }
      },
      mounted: function() {
        this.initState();
        var t = localStorage.readguide;
        "true" == t && this.udreadguidestate(!0);
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udreadguidestate"])), {}, {
        readguideclk: function() {
          var t = localStorage.getItem("readguide");
          "true" != t ? (localStorage.setItem("readguide", "true"), this.udreadguidestate(!0)) : (localStorage.setItem("readguide", "false"), this.udreadguidestate(!1));
        },
        initState: function() {
          if (localStorage.readguide) {
            var t = localStorage.readguide;
            this.flag = "true" === t;
            this.flag && this.udreadguidestate(!0);
          } else {
            localStorage.readguide = !1;
            this.flag = !1;
          }
        }
      })
    };
    var wi = Bi;
    var Ii = Object(M["a"])(wi, Si, bi, !1, null, null, null);
    var ki = Ii.exports;
    var Li = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.isstop
        },
        on: {
          click: t.clkmuted
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.mutedIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.mutedIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("ce59"),
          alt: "icon"
        }
      })])]);
    };
    var Di = [];
    var Ei = e("1157");

    function Qi() {
      var t = Ei("audio:not(#ada-plugin,#ada-plugin *)");
      t = [].slice.call(t);
      var a = Ei("video:not(#ada-plugin,#ada-plugin *)");
      a = [].slice.call(a);
      var e = t.concat(a);
      var i = Array.from(e, function(t) {
        return !!t.muted;
      });
      return i;
    }
    var Fi = Qi;
    var Oi = {
      props: ["mutedIconPath"],
      data: function() {
        return {
          comTitle: "muted"
        };
      },
      computed: {
        isstop: {
          get: function() {
            return this.$store.state.mutedBtnstate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        isstop: function(t, a) {
          t ? (this.mutedClk(), localStorage.setItem("muted", !0)) : (this.clsmuted(), localStorage.setItem("muted", !1));
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udmutedstate", "setMutedState"])), {}, {
        clkmuted: function() {
          this.udmutedstate(!this.$store.state.mutedBtnstate);
        },
        initState: function() {
          var t = Fi();
          if (this.setMutedState(t), this.isstop && this.mutedClk(), localStorage.muted) {
            var a = localStorage.muted;
            "true" == a && this.udmutedstate(!0);
          } else localStorage.muted = !1;
        }
      })
    };
    var yi = Oi;
    var Hi = (e("f60e"), Object(M["a"])(yi, Li, Di, !1, null, "5a47f174", null));
    var ji = Hi.exports;
    var xi = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn tp-ada-panel-bigwhitecursor-btn",
        class: {
          "tp-ada-panel-btn-active": t.flag
        },
        on: {
          click: t.bigwhitecursorclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.bigWhiteCursorIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.bigWhiteCursorIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("216d"),
          alt: "icon"
        }
      })])]);
    };
    var Ji = [];
    var Mi = e("1157");
    var Gi = {
      props: ["bigWhiteCursorIconPath"],
      data: function() {
        return {
          comTitle: "bigwhitecursor"
        };
      },
      computed: {
        flag: {
          get: function() {
            return "white" == this.$store.state.bigcursor;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        flag: function(t, a) {
          t ? (Mi("body").addClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-big-btn").addClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-large-btn").addClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-color-btn").addClass("tp-ada-big-white-cursor")) : (Mi("body").removeClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-big-btn").removeClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-large-btn").removeClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-color-btn").removeClass("tp-ada-big-white-cursor"));
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var t = localStorage.bigcursor;
        "white" == t && document.body.classList.add("tp-ada-big-white-cursor");
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udbigcursor"])), {}, {
        bigwhitecursorclk: function() {
          var t = localStorage.getItem("bigcursor");
          "white" != t ? (localStorage.setItem("bigcursor", "white"), this.udbigcursor("white"), this.flag = !0) : (localStorage.setItem("bigcursor", "false"), this.udbigcursor("false"), this.flag = !1);
        },
        initState: function() {
          if (this.flag ? (Mi("body").addClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-big-btn").addClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-large-btn").addClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-color-btn").addClass("tp-ada-big-white-cursor")) : (Mi("body").removeClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-big-btn").removeClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-large-btn").removeClass("tp-ada-big-white-cursor"), Mi(".tp-ada-panel-color-btn").removeClass("tp-ada-big-white-cursor")), localStorage.bigcursor) {
            var t = "white" === localStorage.bigcursor;
            t && this.udbigcursor("white");
          } else {
            localStorage.bigcursor = !1;
            this.flag = !1;
            this.udbigcursor("false");
          }
        }
      })
    };
    var Yi = Gi;
    var Pi = Object(M["a"])(Yi, xi, Ji, !1, null, null, null);
    var Ri = Pi.exports;
    var Ti = e("1157");

    function Ui() {
      var t = Ti("video:not(#ada-plugin,#ada-plugin *)");
      var a = Array.from(t, function(t) {
        return !(t.paused && !t.autoplay);
      });
      return a;
    }
    var Ki = Ui;

    function Ni() {
      var t = [];
      var a = document.body;
      var e = window.getComputedStyle(a).getPropertyValue("background-color");
      t.push(e);
      var i = a.style.backgroundColor;
      i = "" != i.trim();
      t.push(i);
      const _tmp_lo0yux = t;
      return _tmp_lo0yux;
    }
    var zi = Ni;
    e("1157");
    e("1157");

    function Vi() {
      var t = document.querySelector(".tp-ada-trigger");
      t.addEventListener("click", function() {
        var a = document.querySelector(".tp-ada-widget").classList.contains("tp-ada-close-widget");
        a && (document.querySelector(".tp-ada-widget").classList.remove("tp-ada-close-widget"), t.classList.add("tp-ada-trigger-hide"));
        a = null;
      });
    }
    var Xi = Vi;
    var Zi = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-color-btn"
      }, [e("p", {
        staticClass: "tp-ada-action-title"
      }, [t._v(t._s(t.$t(t.comTitle)))]), e("div", [e("ul", t._l(t.tColor, function(a, i) {
        return e("li", {
          key: i,
          class: {
            tp_ada_color_select: t.bgcstate === t.tColor[i]
          },
          style: {
            backgroundColor: a
          },
          on: {
            click: function(e) {
              return t.updatecolor(a);
            }
          }
        });
      }), 0)]), e("button", {
        staticClass: "tp-ada-action-text",
        attrs: {
          id: "clsbgc"
        },
        on: {
          click: function(a) {
            t.isactive = !1;
          }
        }
      }, [t._v(" " + t._s(t.$t(t.comText)) + " ")])]);
    };
    var qi = [];
    var Wi = {
      data: function() {
        return {
          comTitle: "SetBackgroundColor",
          comText: "clear",
          isactive: !1,
          ispicked: !1,
          tColor: ["#0076B4", "#7A549C", "#C83733", "#D07021", "#26999F", "#4D7831", "#ffffff", "#000000"]
        };
      },
      mounted: function() {
        var t = document.getElementById("clsbgc");
        t && t.addEventListener("click", this.clearcolor);
        this.initState();
      },
      updated: function() {
        var t = localStorage.bgc;
        t ? (this.udbgcstate(t), this.updatecolor(t)) : this.clearcolor();
      },
      computed: Object(w["c"])(["bgcstate"]),
      watch: {
        bgcstate: function(t, a) {
          if (t) {
            var e = document.body;
            e.style.setProperty("background-color", t);
          } else this.clrBgc();
        }
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udbgcstate"])), {}, {
        updatecolor: function(t) {
          localStorage.setItem("bgc", t);
          this.udbgcstate(t);
        },
        clearcolor: function() {
          this.udbgcstate("");
          localStorage.bgc = "";
        },
        initState: function() {
          if (localStorage.bgc) {
            var t = localStorage.bgc;
            this.udbgcstate(t);
          }
        }
      })
    };
    var _i = Wi;
    var $i = (e("00bf"), Object(M["a"])(_i, Zi, qi, !1, null, "cc9daf50", null));
    var tn = $i.exports;
    var an = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.stopvideostate
        },
        on: {
          click: t.stopclk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.stopIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.stopIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("02e6"),
          alt: "icon"
        }
      })])]);
    };
    var en = [];
    var nn = {
      props: ["stopIconPath"],
      data: function() {
        return {
          comTitle: "StopVideo"
        };
      },
      computed: Object(w["c"])(["stopvideostate", "videoState"]),
      watch: {
        stopvideostate: function(t, a) {
          localStorage.getItem("stopVideo");
          var e = Oe(document);
          var i = this.videoState;
          if (t) {
            for (var n = 0; n < e.length; n++) e[n].pause();
            localStorage.setItem("stopVideo", !0);
          } else {
            for (n = 0; n < e.length; n++) i[n] ? e[n].play() : e[n].pause();
            localStorage.setItem("stopVideo", !1);
          }
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udstopvideostate", "setVideoState"])), {}, {
        stopclk: function() {
          this.udstopvideostate(!this.stopvideostate);
        },
        initState: function() {
          var t = Ki();
          this.setVideoState(t);
          localStorage.getItem("stopVideo");
          var a = Oe(document);
          this.videoState;
          if (this.stopvideostate)
            for (var e = 0; e < a.length; e++) a[e].pause();
          if (localStorage.stopVideo) {
            var i = localStorage.stopVideo;
            "true" == i && this.udstopvideostate(!0);
          } else localStorage.stopVideo = !1;
        }
      })
    };
    var on = nn;
    var sn = Object(M["a"])(on, an, en, !1, null, null, null);
    var ln = sn.exports;
    var rn = function() {
      var t = this;
      var a = t.$createElement;
      var i = t._self._c || a;
      return i("div", {
        staticClass: "tp-ada-panel-big-btn",
        class: {
          "tp-ada-panel-btn-active": t.ishide
        },
        on: {
          click: t.hideAnimationClk
        }
      }, [i("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.hideComTitle)) + " ")]), i("div", {
        staticClass: "tp-ada-icons-wrap"
      }, [t.hideBtnIconPath ? i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: t.hideBtnIconPath,
          alt: "icon"
        }
      }) : i("img", {
        staticClass: "tp-ada-icon-area",
        attrs: {
          src: e("3f7f"),
          alt: "icon"
        }
      })])]);
    };
    var cn = [];
    var An = {
      data: function() {
        return {
          hideComTitle: "HideAnimation"
        };
      },
      props: ["hideBtnIconPath"],
      computed: {
        ishide: {
          get: function() {
            return this.$store.state.hideanistate;
          },
          set: function(t) {
            return t;
          }
        }
      },
      watch: {
        ishide: function(t, a) {
          var e = ke(document);
          if (t)
            for (var i = 0; i < e.length; i++) e[i].classList.add("tp-ada-hide");
          else
            for (i = 0; i < e.length; i++) e[i].classList.remove("tp-ada-hide");
        }
      },
      mounted: function() {
        new MutationObserver(j(this.initState, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udhideanistate"])), {}, {
        hideAnimationClk: function() {
          var t = "true" === localStorage.hideAnimation;
          t ? (localStorage.setItem("hideAnimation", !1), this.udhideanistate(!1)) : (localStorage.setItem("hideAnimation", !0), this.udhideanistate(!0));
        },
        initState: function() {
          var t = ke(document);
          if (this.ishide)
            for (var a = 0; a < t.length; a++) t[a].classList.add("tp-ada-hide");
          else
            for (a = 0; a < t.length; a++) t[a].classList.remove("tp-ada-hide");
          if (localStorage.hideAnimation) {
            var e = localStorage.hideAnimation;
            this.ishide = "false" !== e;
            "true" == e && this.udhideanistate(!0);
          } else {
            localStorage.hideAnimation = !1;
            this.ishide = !1;
          }
        }
      })
    };
    var dn = An;
    var gn = (e("d77c"), Object(M["a"])(dn, rn, cn, !1, null, "5a7f8fb5", null));
    var un = gn.exports;
    var pn = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-large-btn"
      }, [e("p", {
        staticClass: "tp-ada-action-title tp-ada-action-title-area"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), e("el-select", {
        attrs: {
          "popper-class": "tp-ada-select-link",
          placeholder: t.$t(t.complaceholder),
          "no-data-text": t.$t(t.nodatatext)
        },
        on: {
          change: function(a) {
            return t.linkchange(t.curlinkitem);
          }
        },
        model: {
          value: t.curlinkitem,
          callback: function(a) {
            t.curlinkitem = a;
          },
          expression: "curlinkitem"
        }
      }, t._l(t.curLink, function(t) {
        return e("el-option", {
          key: t.index,
          attrs: {
            label: t.name.innerText,
            value: {
              value: t.name.innerText,
              label: t.name.href
            }
          }
        });
      }), 1)], 1);
    };
    var hn = [];
    var mn = e("1157");

    function fn() {
      var t = [];
      var a = mn("body").find("a");
      if (a.length > 0) {
        var e = 0;
        Array.from(a, function(a) {
          if (a.innerText && "" != a.innerText.trim()) {
            var i = new Object();
            i.index = e;
            i.name = a;
            t.push(i);
            e++;
          }
        });
      }
      t = t.slice(3, 20);
      const _tmp_judcs = t;
      return _tmp_judcs;
    }
    var Cn = fn;
    var vn = {
      data: function() {
        return {
          curlinkitem: {
            value: "",
            label: ""
          },
          curLink: "",
          links: [],
          comTitle: "usefullinks",
          complaceholder: "pleasechoose",
          nodatatext: "nodatatext"
        };
      },
      computed: {},
      created: function() {
        this.curLink = Cn();
      },
      mounted: function() {
        new MutationObserver(j(this.initLinks, 1e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
      },
      methods: {
        initLinks: function() {
          this.curLink = Cn();
        },
        linkchange: function(t) {
          var a = t.value;
          var e = t.label;
          this.curlinkitem = a;
          window.open(e);
        },
        handleClick: function(t) {
          window.open(t);
        }
      }
    };
    var Sn = vn;
    var bn = Object(M["a"])(Sn, pn, hn, !1, null, null, null);
    var Bn = bn.exports;
    var wn = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-slider"
      }, [e("div", {
        staticClass: "tp-ada-panel-slider-area"
      }, [e("el-switch", {
        attrs: {
          "active-text": "ON",
          "inactive-text": "OFF",
          "active-color": "#146FF8",
          "inactive-color": "gray"
        },
        model: {
          value: t.flag,
          callback: function(a) {
            t.flag = a;
          },
          expression: "flag"
        }
      })], 1), e("div", {
        staticClass: "tp-ada-panel-textarea"
      }, [e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title tp-ada-slider-text-detail"
      }, [t._v(" " + t._s(t.$t(t.comDetail)) + " ")])])]);
    };
    var In = [];
    var kn = {
      props: ["stopIconPath"],
      data: function() {
        return {
          flag: !1,
          comTitle: "seizureSafe",
          comDetail: "seizureSafeDetail"
        };
      },
      mounted: function() {
        this.initState();
      },
      watch: {
        flag: function(t, a) {
          localStorage.setItem("seizureSafe", t);
          this.udseizurestate(t);
          t ? (this.udstopanistate(!0), this.udsaturatestate("low")) : (this.udstopanistate(!1), this.udsaturatestate("false"));
        }
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udstopanistate", "udsaturatestate", "udseizurestate"])), {}, {
        initState: function() {
          if (localStorage.seizureSafe) {
            var t = "false" !== localStorage.seizureSafe;
            this.udseizurestate(t);
            this.flag = t;
          } else {
            localStorage.seizureSafe = !1;
            this.udseizurestate(!1);
            this.flag = !1;
          }
        }
      })
    };
    var Ln = kn;
    var Dn = Object(M["a"])(Ln, wn, In, !1, null, null, null);
    var En = Dn.exports;
    var Qn = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-slider"
      }, [e("div", {
        staticClass: "tp-ada-panel-slider-area"
      }, [e("el-switch", {
        attrs: {
          "active-text": "ON",
          "inactive-text": "OFF",
          "active-color": "#146FF8",
          "inactive-color": "gray"
        },
        model: {
          value: t.flag,
          callback: function(a) {
            t.flag = a;
          },
          expression: "flag"
        }
      })], 1), e("div", {
        staticClass: "tp-ada-panel-textarea"
      }, [e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title tp-ada-slider-text-detail"
      }, [t._v(" " + t._s(t.$t(t.comDetail)) + " ")])])]);
    };
    var Fn = [];
    var On = {
      props: ["stopIconPath"],
      data: function() {
        return {
          flag: !1,
          comTitle: "cognitivedisability",
          comDetail: "cognitivedisabilityDetail"
        };
      },
      mounted: function() {
        this.initState();
      },
      watch: {
        flag: function(t, a) {
          localStorage.setItem("cognitivedisability", t);
          this.udcognstate(t);
          t ? (this.udstopanistate(!0), this.udhighlightlinkstate(!0), this.udhighlighttitlestate(!0)) : (this.udstopanistate(!1), this.udhighlightlinkstate(!1), this.udhighlighttitlestate(!1));
        }
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udcognstate", "udstopanistate", "udhighlightlinkstate", "udhighlighttitlestate"])), {}, {
        initState: function() {
          if (localStorage.cognitivedisability) {
            var t = "false" !== localStorage.cognitivedisability;
            this.udcognstate(t);
            this.flag = t;
          } else {
            localStorage.cognitivedisability = !1;
            this.udcognstate(!1);
            this.flag = !1;
          }
        }
      })
    };
    var yn = On;
    var Hn = Object(M["a"])(yn, Qn, Fn, !1, null, null, null);
    var jn = Hn.exports;
    var xn = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-slider"
      }, [e("div", {
        staticClass: "tp-ada-panel-slider-area"
      }, [e("el-switch", {
        attrs: {
          "active-text": "ON",
          "inactive-text": "OFF",
          "active-color": "#146FF8",
          "inactive-color": "gray"
        },
        model: {
          value: t.flag,
          callback: function(a) {
            t.flag = a;
          },
          expression: "flag"
        }
      })], 1), e("div", {
        staticClass: "tp-ada-panel-textarea"
      }, [e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title tp-ada-slider-text-detail"
      }, [t._v(" " + t._s(t.$t(t.comDetail)) + " ")])])]);
    };
    var Jn = [];
    var Mn = {
      props: ["stopIconPath"],
      data: function() {
        return {
          flag: !1,
          comTitle: "visionImpaired",
          comDetail: "visionImpairedDetail"
        };
      },
      mounted: function() {
        this.initState();
      },
      watch: {
        flag: function(t, a) {
          localStorage.setItem("visionImpaired", t);
          this.udvisionimpairedstate(t);
          t ? (this.udreadmodestate(!0), this.udsaturatestate("high")) : (this.udreadmodestate(!1), this.udsaturatestate("false"));
        }
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udvisionimpairedstate", "udsaturatestate", "udreadmodestate"])), {}, {
        initState: function() {
          if (localStorage.visionImpaired) {
            var t = "false" !== localStorage.visionImpaired;
            this.udvisionimpairedstate(t);
            this.flag = t;
          } else {
            localStorage.visionImpaired = !1;
            this.udvisionimpairedstate(!1);
          }
        }
      })
    };
    var Gn = Mn;
    var Yn = Object(M["a"])(Gn, xn, Jn, !1, null, null, null);
    var Pn = Yn.exports;
    var Rn = function() {
      var t = this;
      var a = t.$createElement;
      var e = t._self._c || a;
      return e("div", {
        staticClass: "tp-ada-panel-slider"
      }, [e("div", {
        staticClass: "tp-ada-panel-slider-area"
      }, [e("el-switch", {
        attrs: {
          "active-text": "ON",
          "inactive-text": "OFF",
          "active-color": "#146FF8",
          "inactive-color": "gray"
        },
        model: {
          value: t.flag,
          callback: function(a) {
            t.flag = a;
          },
          expression: "flag"
        }
      })], 1), e("div", {
        staticClass: "tp-ada-panel-textarea"
      }, [e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title"
      }, [t._v(" " + t._s(t.$t(t.comTitle)) + " ")]), e("p", {
        staticClass: "tp-ada-slider-text tp-ada-panel-slider-title tp-ada-slider-text-detail"
      }, [t._v(" " + t._s(t.$t(t.comDetail)) + " ")])])]);
    };
    var Tn = [];
    var Un = {
      data: function() {
        return {
          flag: !1,
          comTitle: "ADHDFriendlySlider",
          comDetail: "ADHDFriendlySliderDetail"
        };
      },
      mounted: function() {
        this.initState();
      },
      watch: {
        flag: function(t, a) {
          localStorage.setItem("ADHD", t);
          this.$store.commit("udADHDstate", t);
          t ? (this.udreadmask(!0), this.udsaturatestate("high"), this.udstopanistate(!0)) : (this.udreadmask(!1), this.udsaturatestate("false"), this.udstopanistate(!1));
        }
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["udADHDstate", "udreadmask", "udsaturatestate", "udstopanistate"])), {}, {
        initState: function() {
          if (localStorage.ADHD) {
            var t = "true" === localStorage.ADHD;
            this.udADHDstate(t);
            this.flag = t;
          } else {
            localStorage.setItem("ADHD", !1);
            this.udADHDstate(!1);
            this.flag = !1;
          }
        }
      })
    };
    var Kn = Un;
    var Nn = Object(M["a"])(Kn, Rn, Tn, !1, null, null, null);
    var zn = Nn.exports;
    e("4de4");
    e("ac1f");
    e("1276");

    function Vn() {
      for (t = document.querySelectorAll("a"), a = document.querySelectorAll("button"), e = 0, void 0; e < t.length; e++) {
        var t;
        var a;
        var e;
        if (!t[e].getAttribute("aria-label"))
          if (t[e].innerText) t[e].innerText.trim() && t[e].setAttribute("aria-label", t[e].innerText);
          else {
            var i = t[e].href.split("/").filter(function(t) {
              return "" != t;
            }).slice(-1);
            t[e].setAttribute("aria-label", i);
          }
      }
      for (var n = 0; n < a.length; n++) a[n].getAttribute("aria-label") || a[n].innerText && a[n].innerText.trim() && a[n].setAttribute("aria-label", a[n].innerText);
    }
    var Xn = Vn;

    function Zn(t) {
      var a = document.querySelectorAll("iframe");
      if (a.length > 0)
        for (var e = 0; e < a.length; e++)
          if (!a[e].title) {
            var i = a[e].src.split("/").filter(function(t) {
              return "" != t;
            });
            if (i.length > 0) {
              var n = i[i.length - 1].split(".").filter(function(t) {
                return "" != t;
              }).slice(0, 1);
              a[e].title = n;
            }
          }
    }
    var qn = Zn;

    function Wn(t) {
      var a = Array.from(t.querySelectorAll("input"));
      var e = Array.from(t.querySelectorAll("textarea"));
      var i = Array.from(t.querySelectorAll("select"));
      var n = (Array.from(t.querySelectorAll("label")), a.filter(function(t) {
        return "text" == t.type || "checkbox" == t.type || "radio" == t.type || "file" == t.type || "password" == t.type;
      }));
      if (n = n.concat(e, i), n.length > 0)
        for (var o = 0; o < n.length; o++)
          if (n[o].id) {
            var s = document.querySelector('label[for="'.concat(n[o].id, '"]'));
            s || (n[o].placeholder ? n[o].title = n[o].placeholder : n[o].name ? n[o].title = n[o].name : n[o].title = n[o].id);
          } else n[o].placeholder ? n[o].title = n[o].placeholder : n[o].name ? n[o].title = n[o].name : n[o].title = "TP-Link";
    }
    var _n = Wn;
    var $n = [{
      name: "Chinese",
      value: "zh",
      langprop: "zh-CN"
    }, {
      name: "English",
      value: "en",
      langprop: "en"
    }, {
      name: "Japanese",
      value: "jp",
      langprop: "ja-jp"
    }, {
      name: "Vietnamese",
      value: "vn",
      langprop: "vi-vn"
    }, {
      name: "Dutch",
      value: "de",
      langprop: "de-de"
    }, {
      name: "Italian",
      value: "It",
      langprop: "it-it"
    }, {
      name: "Nederland",
      value: "nl",
      langprop: "nl-nl"
    }, {
      name: "America",
      value: "us",
      langprop: "en-us"
    }];
    var to = {
      namespaced: !0,
      state: {
        langlist: $n
      }
    };
    v["default"].use(w["a"]);
    var ao = new w["a"].Store({
      state: {
        is_normal_lineheight: [],
        is_normal_lineheight_fixarea: [],
        cur_font_percent: 100,
        videoState: [],
        audioState: [],
        animationState: [],
        mutedState: [],
        initLineHeight: [],
        cur_lineheight_percent: 100,
        lineheightval: [],
        fixarealineheight: [],
        prebgc: [],
        pretitlecolor: [],
        pretextcolor: [],
        readmodestate: !1,
        ADHDstate: !1,
        seizurestate: !1,
        cognstate: !1,
        visionimpairedstate: !1,
        cur_spacing_percent: 100,
        letterspacingval: [],
        initLetterSpacing: [],
        cur_scale_percent: 100,
        fixarealetterspacing: [],
        scalevalue: "",
        contrastmode: !1,
        bigcursor: "false",
        readguidestate: !1,
        readmask: !1,
        fontvalue: [],
        readableFont: !1,
        textalign: "false",
        hideanistate: !1,
        hideimgstate: !1,
        hidemediastate: !1,
        highlightlinkstate: !1,
        highlighttitlestate: !1,
        highlighthoverstate: !1,
        magnifierstate: !1,
        saturatestate: "false",
        langstate: localStorage.curLang,
        mutedBtnstate: !1,
        stopanistate: !1,
        stopaudiostate: !1,
        stopvideostate: !1,
        titlecolorstate: "x",
        textcolorstate: "x",
        bgcstate: "",
        fixedareafontsize: []
      },
      mutations: {
        udis_normal_lineheight: function(t, a) {
          t.is_normal_lineheight = a;
        },
        udis_normal_lineheight_fixarea: function(t, a) {
          t.is_normal_lineheight_fixarea = a;
        },
        updatefontpercent: function(t, a) {
          t.cur_font_percent = a;
        },
        updatelineheightpercent: function(t, a) {
          t.cur_lineheight_percent = a;
        },
        udfixarealineheight: function(t, a) {
          t.fixarealineheight = a;
        },
        updatespacingpercent: function(t, a) {
          t.cur_spacing_percent = a;
        },
        udfixarealetterspacing: function(t, a) {
          t.fixarealetterspacing = a;
        },
        updatescalepercent: function(t, a) {
          t.cur_scale_percent = a;
        },
        setVideoState: function(t, a) {
          t.videoState = a;
        },
        setAudioState: function(t, a) {
          t.audioState = a;
        },
        setAnimationState: function(t, a) {
          t.animationState = a;
        },
        setMutedState: function(t, a) {
          t.mutedState = a;
        },
        getInitLineHeight: function(t, a) {
          t.initLineHeight = a;
        },
        updateScale: function(t, a) {
          t.showScale += a;
        },
        resetScale: function(t) {
          t.showScale = 100;
        },
        getPreBgc: function(t, a) {
          t.prebgc = a;
        },
        getPreTitleColor: function(t, a) {
          t.pretitlecolor = a;
        },
        getPreTextColor: function(t, a) {
          t.pretextcolor = a;
        },
        udreadmodestate: function(t, a) {
          t.readmodestate = a;
        },
        udADHDstate: function(t, a) {
          t.ADHDstate = a;
        },
        udseizurestate: function(t, a) {
          t.seizurestate = a;
        },
        udcognstate: function(t, a) {
          t.cognstate = a;
        },
        udvisionimpairedstate: function(t, a) {
          t.visionimpairedstate = a;
        },
        udlineheightval: function(t, a) {
          t.lineheightval = a;
        },
        udletterspacingval: function(t, a) {
          t.letterspacingval = a;
        },
        getInitLetterSpacing: function(t, a) {
          t.initLetterSpacing = a;
        },
        udscalevalue: function(t, a) {
          t.scalevalue = a;
        },
        udcontrastmode: function(t, a) {
          t.contrastmode = a;
        },
        udbigcursor: function(t, a) {
          t.bigcursor = a;
        },
        udreadguidestate: function(t, a) {
          t.readguidestate = a;
        },
        udreadmask: function(t, a) {
          t.readmask = a;
        },
        udfontvalue: function(t, a) {
          t.fontvalue = a;
        },
        udfixedareafontsize: function(t, a) {
          t.fixedareafontsize = a;
        },
        udreadableFont: function(t, a) {
          t.readableFont = a;
        },
        udtextalign: function(t, a) {
          t.textalign = a;
        },
        udhideanistate: function(t, a) {
          t.hideanistate = a;
        },
        udhideimgstate: function(t, a) {
          t.hideimgstate = a;
        },
        udhidemediastate: function(t, a) {
          t.hidemediastate = a;
        },
        udhighlightlinkstate: function(t, a) {
          t.highlightlinkstate = a;
        },
        udhighlighttitlestate: function(t, a) {
          t.highlighttitlestate = a;
        },
        udhighlighthoverstate: function(t, a) {
          t.highlighthoverstate = a;
        },
        udmagnifierstate: function(t, a) {
          t.magnifierstate = a;
        },
        udsaturatestate: function(t, a) {
          t.saturatestate = a;
        },
        udlangstate: function(t, a) {
          t.langstate = a;
        },
        udmutedstate: function(t, a) {
          t.mutedBtnstate = a;
        },
        udstopanistate: function(t, a) {
          t.stopanistate = a;
        },
        udstopaudiostate: function(t, a) {
          t.stopaudiostate = a;
        },
        udstopvideostate: function(t, a) {
          t.stopvideostate = a;
        },
        uptitlecolorstate: function(t, a) {
          t.titlecolorstate = a;
        },
        uptextcolorstate: function(t, a) {
          t.textcolorstate = a;
        },
        udbgcstate: function(t, a) {
          t.bgcstate = a;
        }
      },
      getters: {},
      actions: {},
      modules: {
        lang: to
      }
    });

    function eo() {
      var t = ao.state.lang.langlist;
      if (!document.documentElement.lang.trim()) switch (localStorage.preLang) {
        case "zh":
          var a = t.filter(function(t) {
            return "zh" == t.value;
          });
          document.documentElement.lang = a[0].langprop;
          break;
        case "en":
          var e = t.filter(function(t) {
            return "en" == t.value;
          });
          document.documentElement.lang = e[0].langprop;
          break;
        case "jp":
          var i = t.filter(function(t) {
            return "jp" == t.value;
          });
          document.documentElement.lang = i[0].langprop;
          break;
        case "vn":
          var n = t.filter(function(t) {
            return "vn" == t.value;
          });
          document.documentElement.lang = n[0].langprop;
          break;
        case "de":
          var o = t.filter(function(t) {
            return "de" == t.value;
          });
          document.documentElement.lang = o[0].langprop;
          break;
        case "It":
          var s = t.filter(function(t) {
            return "It" == t.value;
          });
          document.documentElement.lang = s[0].langprop;
          break;
        case "nl":
          var l = t.filter(function(t) {
            return "nl" == t.value;
          });
          document.documentElement.lang = l[0].langprop;
          break;
        case "us":
          var r = t.filter(function(t) {
            return "us" == t.value;
          });
          document.documentElement.lang = r[0].langprop;
          break;
      }
    }
    var io = eo;
    var no = e("1157");

    function oo() {
      var t;
      var a = no("h1:not(#ada-plugin ,#ada-plugin  *),h2:not(#ada-plugin ,#ada-plugin  *),h3:not(#ada-plugin ,#ada-plugin  *),h4:not(#ada-plugin ,#ada-plugin  *),h5:not(#ada-plugin ,#ada-plugin  *),h6:not(#ada-plugin ,#ada-plugin  *),p:not(#ada-plugin ,#ada-plugin  *)");
      t = a.length > 0 ? a[0].innerText : "TP-Link";
      var e = no("title");
      if (0 == e.length) {
        var i = document.createElement("title");
        i.innerText = t;
        no("head").append(i);
      } else 0 == no.trim(e.html()).length && e.text(t);
    }
    var so = oo;
    var lo = e("1157");

    function ro() {
      for (t = window.location.href, a = lo("*:not(#ada-plugin ,#ada-plugin  *):not(.editor-component ,.editor-component *)"), e = 0, void 0; e < a.length; e++) {
        var t;
        var a;
        var e;
        a[e].addEventListener("focus", function(e) {
          return function() {
            t.indexOf("business") > -1 ? a[e].classList.add("tp-ada-highlight-focus-business") : a[e].classList.add("tp-ada-highlight-focus");
          };
        }(e));
        a[e].addEventListener("blur", function(e) {
          return function() {
            t.indexOf("business") > -1 ? a[e].classList.remove("tp-ada-highlight-focus-business") : a[e].classList.remove("tp-ada-highlight-focus");
          };
        }(e));
        a[e].addEventListener("mousedown", function(e) {
          return function() {
            t.indexOf("business") > -1 ? a[e].classList.add("tp-ada-mouseactivate-business") : a[e].classList.add("tp-ada-mouseactivate");
          };
        }(e));
        a[e].addEventListener("mouseleave", function(e) {
          return function() {
            t.indexOf("business") > -1 ? a[e].classList.remove("tp-ada-mouseactivate-business") : a[e].classList.remove("tp-ada-mouseactivate");
          };
        }(e));
      }
    }
    var co = ro;
    var Ao = e("1157");

    function go() {
      var t = localStorage.initnavclassname;
      var a = Ao(t);
      a.length > 0 && "nav" != t && Ao(t).attr("role", "navigation");
      var e = localStorage.initmainclassname;
      var i = Ao(e);
      i.length > 0 && "main" != e && Ao(i).attr("role", "main");
      var n = localStorage.initfooterclassname;
      var o = Ao(n);
      o.length > 0 && "footer" != n && Ao(o).attr("role", "contentinfo");
    }
    var uo = go;
    e("159b");
    e("00b4");

    function po(t) {
      var a = t.split("/");
      var e = a[a.length - 1].split(".")[0];
      var i = /([\w]+-[\w]){3}/;
      if (-1 !== e.indexOf("_")) {
        var n;
        var o = e.split("_");
        var s = [];
        o.forEach(function(t) {
          var a = i.test(t);
          a || s.push(t);
        });
        s && s.length > 0 && (n = s.toString());
      }
      return n || e || "TP-Link";
    }
    var ho = po;

    function mo(t) {
      for (a = [], e = t.parentNode.children, i = 0, void 0; i < e.length; i++) {
        var a;
        var e;
        var i;
        1 == e[i].nodeType && e[i] != t && "SCRIPT" != e[i].tagName && a.push(e[i]);
      }
      return a;
    }
    var fo = mo;
    var Co = e("1157");

    function vo() {
      var t = Co("img:not(.tp-ada-trigger,#ada-plugin,#ada-plugin *)");
      if (t.length > 0)
        for (var a = 0; a < t.length; a++) t[a].src.indexOf("base64") > -1 ? t[a].alt = "TP-Link" : t[a].alt || (t[a].alt = ho(t[a].src));
      var e = [];
      var i = Co("*:not(audio,video,.tp-ada-trigger,#ada-plugin,#ada-plugin *,.swiper-button-prev,.swiper-button-next,.swiper-button-black)");
      if (i.length > 0)
        for (var n = 0; n < i.length; n++) {
          var o = window.getComputedStyle(i[n], null).getPropertyValue("background-image");
          "none" != o.toString() && e.push(i[n]);
        }
      if (e.length > 0)
        for (var s = 0; s < e.length; s++) {
          var l;
          var r = e[s].querySelectorAll("span");
          if (r && r.length > 0 && r.forEach(function(t) {
              l = !(!t.getAttribute("role") || "img" != t.getAttribute("role"));
            }), !l) {
            var c;
            var A = window.getComputedStyle(e[s], null).getPropertyValue("background-image");
            var d = "";
            var g = A.split("(")[1].split(")")[0];
            g = g.indexOf("base64") > -1 ? "TP-Link" : ho(g);
            var u = document.createElement("span");
            u.setAttribute("role", "img");
            u.setAttribute("aria-label", g);
            u.setAttribute("aria-hidden", "false");
            e[s].appendChild(u);
            (e[s].querySelector("h2") || e[s].querySelector("h3") || e[s].querySelector("p")) && (e[s].querySelector("h2") && (d = e[s].querySelector("h2").textContent.trim()), e[s].querySelector("h3") && (d = d + "." + e[s].querySelector("h3").textContent.trim()), e[s].querySelector("p") && (d = d + "." + e[s].querySelector("p").textContent.trim()));
            var p = fo(e[s]);
            if (d) u.setAttribute("aria-label", d);
            else if (p.length > 0) {
              for (var h = 0; h < p.length; h++)
                if (p[h].innerText && "" != p[h].innerText.trim() && "NOSCRIPT" !== p[h].tagName) {
                  c = p[h].innerText;
                  u.setAttribute("aria-label", c);
                  break;
                }
            } else u.setAttribute("aria-label", g);
          }
        }
    }
    var So = vo;
    var bo = e("1157");

    function Bo() {
      var t = bo("a:not(#ada-plugin ,#ada-plugin  *)");
      if (t.length > 0)
        for (var a = 0; a < t.length; a++)
          if (!t[a].childElementCount && !t[a].innerText) {
            var e = "hidden" != window.getComputedStyle(t[a], null).getPropertyValue("visibility");
            var i = window.getComputedStyle(t[a], null).getPropertyValue("background-image");
            var n = t[a].getAttribute("aria-label");
            if (e && "none" == i.toString() && !n) {
              var o = t[a].href.split("/").filter(function(t) {
                return "" != t;
              }).slice(-1);
              o.length > 0 && t[a].setAttribute("aria-label", o);
            }
          }
    }
    var wo = Bo;
    var Io = e("1157");

    function ko() {
      var t = localStorage.getItem("initnavclassname") || "";
      var a = localStorage.getItem("initmainclassname") || "";
      var e = localStorage.getItem("initfooterclassname") || "";
      Io(t).attr("tabindex", 0);
      Io(a).attr("tabindex", 0);
      Io(e).attr("tabindex", 0);
      var i = window.innerWidth && window.innerWidth <= 736;
      var n = document.body.firstChild;
      var o = document.createElement("div");
      var s = document.createElement("a");
      var l = document.createElement("div");
      var r = document.createElement("span");
      if (o.classList.add("tp-ada-skip-links", "acsb-force-visible", "acsb-ready"), o.setAttribute("role", "region"), o.setAttribute("aria-label", "Skip Links"), s.classList.add("tp-ada-skip-link"), s.setAttribute("data-tp-ada-skip-link", "content"), s.setAttribute("tabindex", "1"), s.innerText = "Skip to Content", Io(a).attr("id") || Io(a).attr("id", "tpadaMain"), s.href = "#" + Io(a).attr("id"), l.setAttribute("aria-hidden", "true"), l.innerText = "ENTER", r.classList.add("tp-ada-acsb-symbol"), r.innerText = "↵", l.appendChild(r), s.appendChild(l), o.appendChild(s), !i) {
        var c = s.cloneNode(!0);
        c.innerText = "Skip to Menu";
        c.setAttribute("data-tp-ada-skip-link", "menu");
        Io(t).attr("id") || Io(t).attr("id", "tpadaNav");
        c.href = "#" + Io(t).attr("id");
        var A = l.cloneNode(!0);
        c.appendChild(A);
        var d = s.cloneNode(!0);
        d.setAttribute("data-tp-ada-skip-link", "footer");
        Io(e).attr("id") || Io(e).attr("id", "tpadaFooter");
        d.href = "#" + Io(e).attr("id");
        d.innerText = "Skip to Footer";
        var g = l.cloneNode(!0);
        d.appendChild(g);
        o.appendChild(c);
        o.appendChild(d);
      }
      document.body.insertBefore(o, n);
    }
    var Lo = ko;
    e("9c25");

    function Do() {
      var t = document.querySelectorAll("*:not(html):not(head):not(meta):not(link):not(style):not(title):not(body):not(noscript):not(script):not(#ada-plugin):not(#ada-plugin *)");

      function a(t) {
        for (a = function() {
            var a = t[e];
            i = a.getEventListeners();
            i.click && (a.setAttribute("tabindex", 0), a.onkeyup = function(t) {
              var e = t || window.event;
              var i = e.which || e.keyCode || e.charCode;
              13 === i && a.click();
            });
          }, e = 0, void 0; e < t.length; e++) {
          var a;
          var e;
          var i;
          a();
        }
      }
      a(t);
    }
    var Eo = Do;

    function Qo() {
      var t = document.querySelectorAll("label");
      t && t.forEach(function(t) {
        if (t.getAttribute("for")) {
          var a = t.getAttributeNode("for").value;
          var e = document.getElementById(a);
          e && (t.setAttribute("tabindex", 0), t.onkeyup = function(a) {
            var e = a || window.event;
            var i = e.which || e.keyCode || e.charCode;
            13 === i && t.click();
          });
        }
      });
    }
    var Fo = Qo;

    function Oo(t) {
      if (t)
        for (a = function() {
            var a = t[e];
            a.onkeyup = function(t) {
              var e = t || window.event;
              var i = e.which || e.keyCode || e.charCode;
              13 === i && a.click();
            };
          }, e = 0, void 0; e < t.length; e++) {
          var a;
          var e;
          a();
        }
    }
    var yo = Oo;

    function Ho() {
      var t = document.querySelectorAll("input[type='radio'],input[type='checkbox']");
      yo(t);
    }
    var jo = Ho;
    var xo = e("1157");

    function Jo() {
      var t = xo(".nav-box .subnav");
      var a = xo("#tapo-header .nav-detail");
      t && t.focus(function() {
        a && a.addClass("tp-ada-focus");
      });
      var e = xo(".navbar-item.is-paddingless.is-tab.is-hoverable a.navbar-item");
      var i = xo(".navbar-dropdown.is-hidden-mobile.desktop-menu");
      e && e.focus(function() {
        i && i.addClass("tp-ada-focus");
      });
      window.onkeyup = function(t) {
        var a = t || window.event;
        var e = a.which || a.keyCode || a.charCode;
        9 === e && document.body.classList.add("tp-ada-access");
      };
    }
    var Mo = Jo;
    var Go = (e("1157"), {
      props: {
        initposition: {
          type: String,
          default: "left"
        },
        defaultLang: {
          type: String,
          default: "us"
        },
        defaultNavClassName: {
          type: String,
          default: "nav"
        },
        defaultMainClassName: {
          type: String,
          default: "#tapo-header~div"
        },
        defaultfooterClassName: {
          type: String,
          default: "footer"
        },
        defaulttriggerlogo: {
          type: String,
          default: ""
        },
        defaultIcon: {
          type: Object,
          default: function() {
            return {
              close_icon_path: "",
              reset_icon_path: "",
              biggerfont_icon_path: "",
              smallerfont_icon_path: "",
              left_icon_path: "",
              center_icon_path: "",
              right_icon_path: "",
              readable_icon_path: "",
              dark_contrast_icon_path: "",
              light_contrast_icon_path: "",
              monochrome_icon_path: "",
              high_contrast_icon_path: "",
              stop_animation_icon_path: "",
              stop_video_icon_path: "",
              stop_audio_icon_path: "",
              hide_image_icon_path: "",
              hide_media_icon_path: "",
              hide_animation_icon_path: "",
              highligh_title_icon_path: "",
              highligh_link_icon_path: "",
              hightsaturate_icon_path: "",
              lowsaturate_icon_path: "",
              bigblackcursor_icon_path: "",
              bigwhitecursor_icon_path: "",
              readguide_icon_path: "",
              readmask_icon_path: "",
              highlight_hover_icon_path: "",
              muted_icon_path: "",
              sub_lineheight_icon_path: "",
              add_lineheight_icon_path: "",
              readmode_icon_path: "",
              text_magnifier_icon_path: "",
              bigger_scale_icon_path: "",
              smaller_scale_icon_path: "",
              sub_letterspacing_icon_path: "",
              add_letterspacing_icon_path: ""
            };
          }
        }
      },
      data: function() {
        return {
          ADAtitle: "AccessibilityAdjustments",
          profileoptiontitle: "ProfileOption",
          coloradjusttitle: "ColorAdjust",
          orientationadjusttitle: "orientationadjusttitle",
          contentadjustments: "ContentAdjustments",
          ada_footer: "WebADA",
          triggerBallEl: null
        };
      },
      computed: Object(B["a"])({}, Object(w["c"])({
        langlist: function(t) {
          return t.lang.langlist;
        }
      })),
      components: {
        highLightTitle: mt,
        highLightLink: wt,
        bgcBtn: tn,
        hideImgs: pe,
        stopAnimation: Ge,
        highlighthover: We,
        hideMedia: ii,
        stopVideo: ln,
        stopAudio: gi,
        hideAnimation: un,
        selectLinks: Bn,
        seizureSafeSlider: En,
        cognitiveDisabilitySlider: jn,
        visionImpairedSlider: Pn,
        ADHDFriendlySlider: zn,
        readableFont: Qt,
        textLeft: qt,
        textCenter: Jt,
        textRight: Ut,
        lowsaturateBtn: ia,
        hightSaturateBtn: Aa,
        resetBtn: N,
        closeBtn: W,
        selectLang: it,
        bigblackcursor: vi,
        bigwhitecursor: Ri,
        readGuide: ki,
        darkContrast: ma,
        lightContrast: Ba,
        textcolorBtn: ja,
        monochrome: Pa,
        titleColor: qa,
        highContrast: ee,
        muted: ji,
        readmode: Se,
        readMask: Ne,
        magnifier: Y,
        adjustScale: ct
      },
      created: function() {
        this.initLanguage();
        this.initnavclassname();
        this.initmainclassname();
        this.initfooterclassname();
        localStorage.curLang ? this.$i18n.locale = localStorage.curLang : this.$i18n.locale = localStorage.preLang;
        this.initpercent();
      },
      mounted: function() {
        var t = document.querySelectorAll(".el-select-dropdown ");
        t && Array.from(t, function(t) {
          t.classList.add("tp-ada-top-level");
        });
        var a = document.querySelector(".tp-ada-panel-select-language input");
        a && a.classList.add("tp-ada-elinput");
        new MutationObserver(j(this.onHrefChange, 2e3, !1)).observe(document, {
          attributes: !1,
          subtree: !0,
          characterData: !1,
          childList: !0
        });
        var e = document.createElement("div");
        e.classList.add("tp-ada-read-guide");
        document.body.appendChild(e);
        e.classList.add("tp-ada-read-guide-hide");
        var i = document.createElement("div");
        i.classList.add("tp-ada-read-mask-element-top");
        var n = document.createElement("div");
        n.classList.add("tp-ada-read-mask-element-bottom");
        document.body.appendChild(i);
        document.body.appendChild(n);
        this.triggerBallEl = document.createElement("div");
        this.triggerBallEl.classList.add("tp-ada-trigger");
        this.defaulttriggerlogo ? this.triggerBallEl.style.setProperty("background-image", "url(" + this.defaulttriggerlogo + ")") : this.triggerBallEl.classList.add("tp-ada-trigger-bgimg");
        document.body.appendChild(this.triggerBallEl);
        Xi();
        this.initPosition();
        var o = document.createElement("div");
        o.classList.add("tp-ada-magnifier");
        o.innerText = "";
        document.body.appendChild(o);
        this.init_element_state();
        Lo();
      },
      beforeDestroy: function() {
        this.triggerBallEl = null;
      },
      methods: Object(B["a"])(Object(B["a"])({}, Object(w["b"])(["updatefontpercent", "updatelineheightpercent", "updatespacingpercent", "updatescalepercent", "getPreBgc", "getPreTitleColor"])), {}, {
        verifylang: function() {
          var t = this.defaultLang;
          return this.langlist.some(function(a) {
            if (a.value == t) return !0;
          });
        },
        onHrefChange: function() {
          Fo();
          jo();
          Mo();
          Eo();
          Xn();
          qn();
          _n(document);
          io();
          so();
          co();
          So();
          wo();
          uo();
        },
        initPosition: function() {
          var t = document.querySelector(".tp-ada-plugin-box");
          var a = document.querySelector(".tp-ada-trigger");
          "right" == this.initposition ? (t.classList.add("tp-ada-app-right"), a.classList.add("tp-ada-trigger-right")) : (t.classList.add("tp-ada-app-left"), a.classList.add("tp-ada-trigger-left"));
        },
        initLanguage: function() {
          this.verifylang() ? localStorage.setItem("preLang", this.defaultLang) : localStorage.setItem("preLang", "en");
        },
        initnavclassname: function() {
          var t = this.defaultNavClassName;
          localStorage.setItem("initnavclassname", t);
        },
        initmainclassname: function() {
          var t = this.defaultMainClassName;
          localStorage.setItem("initmainclassname", t);
        },
        initfooterclassname: function() {
          var t = this.defaultfooterClassName;
          localStorage.setItem("initfooterclassname", t);
        },
        initpercent: function() {
          localStorage.ada_font_percent || localStorage.setItem("ada_font_percent", 100);
          localStorage.ada_lineheight_percent || localStorage.setItem("ada_lineheight_percent", 100);
          localStorage.ada_letterspacing_percent || localStorage.setItem("ada_letterspacing_percent", 100);
          localStorage.ada_scale_percent || localStorage.setItem("ada_scale_percent", 100);
          this.updatefontpercent(parseFloat(localStorage.ada_font_percent));
          this.updatelineheightpercent(parseFloat(localStorage.ada_lineheight_percent));
          this.updatespacingpercent(parseFloat(localStorage.ada_letterspacing_percent));
          this.updatescalepercent(parseFloat(localStorage.ada_scale_percent));
        },
        init_element_state: function() {
          if (localStorage.initLineHeight, !localStorage.initbodybgc) {
            var t = zi();
            localStorage.setItem("initbodybgc", JSON.stringify(t));
            this.getPreBgc(t);
          }
          if (!localStorage.inittitlecolor) {
            var a = Na();
            this.getPreTitleColor(a);
            localStorage.setItem("inittitlecolor", JSON.stringify(a));
          }
        }
      })
    });
    var Yo = Go;
    var Po = Object(M["a"])(Yo, S, b, !1, null, null, null);
    var Ro = Po.exports;
    var To = e("a925");
    v["default"].use(To["a"]);
    var Uo = {
      zh: e("abac"),
      en: e("090b"),
      jp: e("2d04"),
      vn: e("b3df"),
      de: e("8859"),
      It: e("b5c4"),
      nl: e("570f"),
      us: e("f9df")
    };
    var Ko = new To["a"]({
      locale: "",
      messages: Uo
    });
    var No = Ko;
    var zo = {
      install: function(t, a) {
        t.prototype.scaleAdd = function() {
          var t = parseFloat(localStorage.ada_scale_percent) + 10;
          localStorage.setItem("ada_scale_percent", t);
          this.$store.commit("updatescalepercent", parseFloat(localStorage.ada_scale_percent));
          var a;
          var e = 1;
          var i = window.getComputedStyle(document.body, null).getPropertyValue("zoom");
          "normal" == i && (i = 1);
          window.ActiveXObject || "ActiveXObject" in window ? (1 == i && (i = "100%"), parseFloat(i), parseFloat(e)) : a = parseFloat(i) + .1 * parseFloat(e);
          this.$store.commit("udscalevalue", a);
          localStorage.setItem("ada_scale", parseFloat(a));
        };
        t.prototype.scaleSub = function() {
          var t = parseFloat(localStorage.ada_scale_percent) - 10;
          localStorage.setItem("ada_scale_percent", t);
          this.$store.commit("updatescalepercent", parseFloat(localStorage.ada_scale_percent));
          var a;
          var e = 1;
          var i = window.getComputedStyle(document.body, null).getPropertyValue("zoom");
          "normal" == i && (i = 1);
          window.ActiveXObject || "ActiveXObject" in window ? (1 == i && (i = "100%"), parseFloat(i), parseFloat(e)) : a = parseFloat(i) - .1 * parseFloat(e);
          this.$store.commit("udscalevalue", a);
          localStorage.setItem("ada_scale", parseFloat(a));
        };
      }
    };
    var Vo = e("1157");

    function Xo() {
      for (t = localStorage.initnavclassname, a = Vo(t).find("*"), e = localStorage.initfooterclassname, i = Vo(e).find("*"), n = [], o = 0, void 0; o < a.length; o++) {
        var t;
        var a;
        var e;
        var i;
        var n;
        var o;
        a[o].innerText && a[o].innerText.trim() && n.push(a[o]);
      }
      for (o = 0; o < i.length; o++) i[o].innerText && i[o].innerText.trim() && n.push(i[o]);
      return n;
    }
    var Zo = Xo;
    var qo = e("1157");
    var Wo = {
      install: function(t, a) {
        t.prototype.fontAdd = function() {
          var t = parseFloat(localStorage.ada_font_percent);
          if (t < 200) {
            var a = localStorage.initnavclassname;
            var e = qo(a).find("*");
            var i = localStorage.initfooterclassname;
            var n = qo(i).find("*");
            var o = parseFloat(localStorage.ada_font_percent) + 10;
            localStorage.setItem("ada_font_percent", o);
            this.$store.commit("updatefontpercent", parseFloat(localStorage.ada_font_percent));
            for (l = qo("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *),span:not(#ada-plugin,#ada-plugin *,._hj-3obO5__EmotionIconDefault__commentIcon,._hj-3obO5__EmotionIconDefault__commentIcon *,._hj-2RA7u__EmotionIconDefault__expressionIcon,._hj-2RA7u__EmotionIconDefault__expressionIcon *)").not(e).not(n), r = JSON.parse(localStorage.initFontsize), c = Array.from(l, function(t) {
                s = window.getComputedStyle(t, null).getPropertyValue("font-size");
                const _tmp_q0jbhz = parseFloat(s);
                return _tmp_q0jbhz;
              }), A = [], d = 0, void 0; d < l.length; d++) {
              var s;
              var l;
              var r;
              var c;
              var A;
              var d;
              (function(t) {
                var a = c[t] + .1 * r[t];
                A.push(a);
              })(d);
            }
            this.$store.commit("udfontvalue", A);
            localStorage.setItem("fontsize", JSON.stringify(A));
            for (g = this.$store.state.fixedareafontsize, u = Zo(), p = parseFloat(localStorage.ada_font_percent) / 100, h = this.$store.state.is_normal_lineheight_fixarea, m = 0, void 0; m < g.length; m++) {
              var g;
              var u;
              var p;
              var h;
              var m;
              (function(t) {
                var a = g[t] * p;
                u[t].style.fontSize = a + "px";
                h[t] && (u[t].style.lineHeight = "normal");
              })(m);
            }
          }
        };
        t.prototype.fontSub = function() {
          var t = parseFloat(localStorage.ada_font_percent);
          if (t > 0) {
            var a = localStorage.initnavclassname;
            var e = qo(a).find("*");
            var i = localStorage.initfooterclassname;
            var n = qo(i).find("*");
            var o = parseFloat(localStorage.ada_font_percent) - 10;
            localStorage.setItem("ada_font_percent", o);
            this.$store.commit("updatefontpercent", parseFloat(localStorage.ada_font_percent));
            for (l = qo("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *),span:not(#ada-plugin,#ada-plugin *,._hj-3obO5__EmotionIconDefault__commentIcon,._hj-3obO5__EmotionIconDefault__commentIcon *,._hj-2RA7u__EmotionIconDefault__expressionIcon,._hj-2RA7u__EmotionIconDefault__expressionIcon *)").not(e).not(n), r = JSON.parse(localStorage.initFontsize), c = Array.from(l, function(t) {
                s = window.getComputedStyle(t, null).getPropertyValue("font-size");
                const _tmp_p6mtyi = parseFloat(s);
                return _tmp_p6mtyi;
              }), A = [], d = 0, void 0; d < l.length; d++) {
              var s;
              var l;
              var r;
              var c;
              var A;
              var d;
              (function(t) {
                var a = c[t] - .1 * r[t];
                A.push(a);
              })(d);
            }
            this.$store.commit("udfontvalue", A);
            localStorage.setItem("fontsize", JSON.stringify(A));
            for (g = this.$store.state.fixedareafontsize, u = Zo(), p = parseFloat(localStorage.ada_font_percent) / 100, h = this.$store.state.is_normal_lineheight_fixarea, m = 0, void 0; m < g.length; m++) {
              var g;
              var u;
              var p;
              var h;
              var m;
              (function(t) {
                var a = g[t] * p;
                u[t].style.fontSize = a + "px";
                h[t] && (u[t].style.lineHeight = "normal");
              })(m);
            }
          }
        };
        t.prototype.clearreadableFont = function() {
          var t = document.documentElement;
          t.classList.remove("tp-ada-readablefont");
          this.$store.commit("udreadableFont", !1);
          localStorage.setItem("readableFont", !1);
        };
        t.prototype.addreadableFont = function() {
          var t = document.documentElement;
          t.classList.add("tp-ada-readablefont");
          this.$store.commit("udreadableFont", !0);
          localStorage.setItem("readableFont", !0);
        };
      }
    };
    e("1157");
    var _o = e("1157");
    var $o = {
      install: function(t, a) {
        t.prototype.lineheightAdd = function() {
          var t = localStorage.initnavclassname;
          var a = _o(t).find("*");
          var e = localStorage.initfooterclassname;
          var i = _o(e).find("*");
          var n = parseFloat(localStorage.ada_lineheight_percent) + 10;
          localStorage.setItem("ada_lineheight_percent", n);
          this.$store.commit("updatelineheightpercent", parseFloat(localStorage.ada_lineheight_percent));
          for (o = _o("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *)").not(a).not(i), s = JSON.parse(localStorage.initLineHeight), l = Array.from(o, function(t) {
              var a = window.getComputedStyle(t, null).getPropertyValue("line-height");
              if ("normal" == a) {
                var e = window.getComputedStyle(t, null).getPropertyValue("font-size");
                e = parseFloat(e);
                a = 1.2 * e;
              }
              return parseFloat(a);
            }), r = [], c = 0, void 0; c < o.length; c++) {
            var o;
            var s;
            var l;
            var r;
            var c;
            r[c] = parseFloat(l[c]) + parseFloat(.1 * s[c]);
          }
          this.$store.commit("udlineheightval", r);
          localStorage.setItem("ada_light_height", JSON.stringify(r));
          for (A = this.$store.state.fixarealineheight, d = Zo(), g = (parseFloat(localStorage.ada_lineheight_percent) - 100) / 10, u = 0, void 0; u < A.length; u++) {
            var A;
            var d;
            var g;
            var u;
            (function(t) {
              var a = A[t] + .1 * A[t] * g;
              d[t].style.setProperty("line-height", a + "px");
            })(u);
          }
        };
        t.prototype.lineheightSub = function() {
          var t = localStorage.initnavclassname;
          var a = _o(t).find("*");
          var e = localStorage.initfooterclassname;
          var i = _o(e).find("*");
          var n = parseFloat(localStorage.ada_lineheight_percent) - 10;
          localStorage.setItem("ada_lineheight_percent", n);
          this.$store.commit("updatelineheightpercent", parseFloat(localStorage.ada_lineheight_percent));
          for (o = _o("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *)").not(a).not(i), s = JSON.parse(localStorage.initLineHeight), l = Array.from(o, function(t) {
              var a = window.getComputedStyle(t, null).getPropertyValue("line-height");
              if ("normal" == a) {
                var e = window.getComputedStyle(t, null).getPropertyValue("font-size");
                e = parseFloat(e);
                a = 1.2 * e;
              }
              return parseFloat(a);
            }), r = [], c = 0, void 0; c < o.length; c++) {
            var o;
            var s;
            var l;
            var r;
            var c;
            r[c] = parseFloat(l[c]) - parseFloat(.1 * s[c]);
          }
          this.$store.commit("udlineheightval", r);
          localStorage.setItem("ada_light_height", JSON.stringify(r));
          for (A = this.$store.state.fixarealineheight, d = Zo(), g = (parseFloat(localStorage.ada_lineheight_percent) - 100) / 10, u = 0, void 0; u < A.length; u++) {
            var A;
            var d;
            var g;
            var u;
            (function(t) {
              var a = A[t] + .1 * A[t] * g;
              d[t].style.setProperty("line-height", a + "px");
            })(u);
          }
        };
      }
    };
    var ts = e("1157");
    var as = {
      install: function(t, a) {
        t.prototype.stopAudio = function() {
          var t = Ee(document);
          var a = localStorage.getItem("stopAudio");
          var e = this.$store.state.audioState;
          if ("false" == a) {
            for (var i = 0; i < t.length; i++) t[i].pause();
            localStorage.setItem("stopAudio", !0);
          } else {
            for (i = 0; i < t.length; i++) e[i] ? t[i].play() : t[i].pause();
            localStorage.setItem("stopAudio", !1);
          }
        };
        t.prototype.stopVideo = function() {
          var t = localStorage.getItem("stopVideo");
          var a = Oe(document);
          var e = this.$store.state.videoState;
          if ("false" == t) {
            for (var i = 0; i < a.length; i++) a[i].pause();
            localStorage.setItem("stopVideo", !0);
          } else {
            for (i = 0; i < a.length; i++) e[i] ? a[i].play() : a[i].pause();
            localStorage.setItem("stopVideo", !1);
          }
        };
        t.prototype.stopAnimation = function() {
          var t = localStorage.getItem("stopAnimation");
          var a = ke(document);
          var e = this.$store.state.animationState;
          if ("false" == t) {
            for (var i = 0; i < a.length; i++) {
              a[i].classList.remove("tp-ada-play-animation");
              a[i].classList.add("tp-ada-stop-animation");
            }
            localStorage.setItem("stopAnimation", !0);
          } else {
            for (i = 0; i < a.length; i++) e[i] && (a[i].classList.remove("tp-ada-stop-animation"), a[i].classList.add("tp-ada-play-animation"));
            localStorage.setItem("stopAnimation", !1);
          }
        };
        t.prototype.mutedClk = function() {
          var t = ts("audio:not(#ada-plugin,#ada-plugin *)");
          t = [].slice.call(t);
          var a = ts("video:not(#ada-plugin,#ada-plugin *)");
          a = [].slice.call(a);
          for (e = t.concat(a), i = 0, void 0; i < e.length; i++) {
            var e;
            var i;
            (function(t) {
              e[t].muted = !0;
            })(i);
          }
        };
        t.prototype.clsmuted = function() {
          var t = this.$store.state.mutedState;
          var a = ts("audio:not(#ada-plugin,#ada-plugin *)");
          a = [].slice.call(a);
          var e = ts("video:not(#ada-plugin,#ada-plugin *)");
          e = [].slice.call(e);
          for (i = a.concat(e), n = 0, void 0; n < i.length; n++) {
            var i;
            var n;
            (function(a) {
              i[a].muted = t[a];
            })(n);
          }
        };
      }
    };
    var es = {
      install: function(t, a) {
        t.prototype.readguide = function() {
          document.documentElement.classList.add("tp-ada-read-guide-html");
          var t = document.querySelector(".tp-ada-read-guide");
          t.classList.remove("tp-ada-read-guide-hide");
          document.addEventListener("mousemove", function(a) {
            var e = a.pageX;
            var i = a.pageY;
            t.style.left = e - 250 + "px";
            t.style.top = i + 10 + "px";
          });
        };
        t.prototype.clsreadguide = function() {
          document.documentElement.classList.remove("tp-ada-read-guide-html");
          var t = document.querySelector(".tp-ada-read-guide");
          t.classList.add("tp-ada-read-guide-hide");
        };
        t.prototype.readmask = function() {
          var t = document.querySelector(".tp-ada-read-mask-element-top");
          t.classList.add("tp-ada-read-mask-element");
          var a = document.querySelector(".tp-ada-read-mask-element-bottom");
          a.classList.add("tp-ada-read-mask-element");
          document.addEventListener("mousemove", function(e) {
            var i = e.clientY;
            var n = window.innerHeight;
            var o = n - i - 100;
            t.style.setProperty("height", i - 100 + "px");
            a.style.setProperty("height", o + "px");
          });
        };
        t.prototype.clsreadmask = function() {
          var t = document.querySelector(".tp-ada-read-mask-element-top");
          t.classList.remove("tp-ada-read-mask-element");
          var a = document.querySelector(".tp-ada-read-mask-element-bottom");
          a.classList.remove("tp-ada-read-mask-element");
          t = null;
          a = null;
        };
      }
    };
    var is = (e("1157"), {
      install: function(t, a) {
        t.prototype.rst = function() {
          for (t = localStorage.getItem("stopVideo"), a = Oe(document), e = this.$store.state.videoState, i = 0, void 0; i < a.length; i++) {
            var t;
            var a;
            var e;
            var i;
            "true" == t && (e[i] ? a[i].play() : a[i].pause());
          }
          localStorage.setItem("stopVideo", !1);
          a = null;
          e = null;
          var n = localStorage.getItem("stopAudio");
          var o = Ee(document);
          var s = this.$store.state.audioState;
          for (i = 0; i < o.length; i++) "true" == n && (s[i] ? o[i].play() : o[i].pause());
          localStorage.setItem("stopAudio", !1);
          var l = localStorage.getItem("stopAnimation");
          var r = ke(document);
          var c = this.$store.state.animationState;
          if ("true" == l) {
            for (var A = 0; A < r.length; A++) c[A] && (r[A].classList.remove("tp-ada-stop-animation"), r[A].classList.add("tp-ada-play-animation"));
            localStorage.setItem("stopAnimation", !1);
          }
          var d = localStorage.getItem("hideAnimation");
          if ("true" == d) {
            for (i = 0; i < r.length; i++) r[i].classList.remove("tp-ada-hide");
            localStorage.setItem("hideAnimation", !1);
          }
          var g = le(document);
          var u = Ae(document);
          g = g.concat(u);
          var p = "true" === localStorage.hideImgs;
          if (p) {
            for (i = 0; i < g.length; i++) g[i].classList.remove("tp-ada-hide");
            localStorage.setItem("hideImgs", !1);
          }
          a = Oe(document);
          o = Ee(document);
          var h = "true" === localStorage.hideMedia;
          var m = this.$store.state.audioState;
          e = this.$store.state.videoState;
          if (h) {
            for (i = 0; i < a.length; i++)
              for (i = 0; i < a.length; i++) {
                e[i] ? a[i].play() : a[i].pause();
                a[i].classList.remove("tp-ada-hide");
              }
            for (i = 0; i < o.length; i++)
              for (i = 0; i < o.length; i++) {
                m[i] ? o[i].play() : o[i].pause();
                o[i].classList.remove("tp-ada-hide");
              }
            localStorage.setItem("hideMedia", !1);
          }
          var f = "dark" === localStorage.contrast;
          var C = "light" === localStorage.contrast;
          var v = "monochrome" === localStorage.contrast;
          var S = "high" === localStorage.contrast;
          f && localStorage.setItem("contrast", !1);
          C && localStorage.setItem("contrast", !1);
          v && localStorage.setItem("contrast", !1);
          S && localStorage.setItem("contrast", !1);
          var b = localStorage.saturate;
          if ("low" == b) {
            var B = document.documentElement;
            B.classList.remove("tp-ada-lowersaturate");
            localStorage.setItem("saturate", !1);
            B = null;
          } else if ("high" == b) {
            B = document.documentElement;
            B.classList.remove("tp-ada-hightsaturate");
            localStorage.setItem("saturate", !1);
            B = null;
          }
          localStorage.setItem("textColor", !1);
          localStorage.setItem("titleColor", !1);
          localStorage.setItem("bgc", "");
          localStorage.setItem("fontsize", !1);
          localStorage.setItem("ada_font_percent", "");
          localStorage.setItem("ada_light_height", !1);
          localStorage.setItem("ada_lineheight_percent", "");
          localStorage.setItem("ada_letter_spacing", !1);
          localStorage.setItem("ada_letterspacing_percent", "");
          localStorage.setItem("ada_scale", !1);
          localStorage.setItem("ada_scale_percent", "");
          localStorage.setItem("textAlign", !1);
          localStorage.setItem("readableFont", !1);
          document.documentElement.classList.remove("tp-ada-readablefont");
          localStorage.setItem("highLighTitle", !1);
          localStorage.setItem("highLighLink", !1);
          localStorage.setItem("visionImpaired", !1);
          localStorage.setItem("seizureSafe", !1);
          localStorage.setItem("cognitivedisability", !1);
          localStorage.setItem("ADHD", !1);
          localStorage.setItem("bigcursor", !1);
          localStorage.setItem("readguide", !1);
          localStorage.setItem("hlhover", !1);
          localStorage.setItem("muted", !1);
          localStorage.setItem("readmask", !1);
          localStorage.setItem("magnifier", !1);
          localStorage.setItem("readmode", !1);
          this.$store.commit("udreadmodestate", !1);
        };
      }
    });
    var ns = {
      install: function(t, a) {
        t.prototype.closeBtn = function() {
          document.querySelector(".tp-ada-widget").classList.add("tp-ada-close-widget");
          document.querySelector(".tp-ada-trigger").classList.remove("tp-ada-trigger-hide");
        };
      }
    };
    var os = e("1157");
    var ss = {
      install: function(t, a) {
        t.prototype.letterspacingAdd = function() {
          var t = localStorage.initnavclassname;
          var a = os(t).find("*");
          var e = localStorage.initfooterclassname;
          var i = os(e).find("*");
          var n = parseFloat(localStorage.ada_letterspacing_percent) + 10;
          localStorage.setItem("ada_letterspacing_percent", n);
          this.$store.commit("updatespacingpercent", parseFloat(localStorage.ada_letterspacing_percent));
          for (o = os("span:not(#ada-plugin,#ada-plugin *),h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *)").not(a).not(i), s = JSON.parse(localStorage.initLetterSpacing), l = Array.from(o, function(t) {
              var a = window.getComputedStyle(t, null).getPropertyValue("letter-spacing");
              return "normal" == a ? 0 : parseFloat(a);
            }), r = [], c = 0, void 0; c < o.length; c++) {
            var o;
            var s;
            var l;
            var r;
            var c;
            0 == s[c] ? r[c] = parseFloat(l[c]) + .2 : r[c] = parseFloat(l[c]) + Math.abs(parseFloat(.1 * s[c]));
          }
          this.$store.commit("udletterspacingval", r);
          localStorage.setItem("ada_letter_spacing", JSON.stringify(r));
          for (A = this.$store.state.fixarealetterspacing, d = Zo(), g = (parseFloat(localStorage.ada_letterspacing_percent) - 100) / 10, u = (r = [], 0), void 0; u < A.length; u++) {
            var A;
            var d;
            var g;
            var u;
            0 == A[u] ? r[u] = parseFloat(A[u]) + .2 * g : r[u] = parseFloat(A[u]) + Math.abs(parseFloat(.1 * A[u])) * g;
          }
          for (var p = 0; p < d.length; p++)(function(t) {
            d[t].style.setProperty("letter-spacing", r[t] + "px");
          })(p);
        };
        t.prototype.letterspacingSub = function() {
          var t = localStorage.initnavclassname;
          var a = os(t).find("*");
          var e = localStorage.initfooterclassname;
          var i = os(e).find("*");
          var n = parseFloat(localStorage.ada_letterspacing_percent) - 10;
          localStorage.setItem("ada_letterspacing_percent", n);
          this.$store.commit("updatespacingpercent", parseFloat(localStorage.ada_letterspacing_percent));
          for (o = os("span:not(#ada-plugin,#ada-plugin *),h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *),p:not(#ada-plugin,#ada-plugin *),a:not(#ada-plugin,#ada-plugin *)").not(a).not(i), s = JSON.parse(localStorage.initLetterSpacing), l = Array.from(o, function(t) {
              var a = window.getComputedStyle(t, null).getPropertyValue("letter-spacing");
              return "normal" == a ? 0 : parseFloat(a);
            }), r = [], c = 0, void 0; c < o.length; c++) {
            var o;
            var s;
            var l;
            var r;
            var c;
            0 == s[c] ? r[c] = parseFloat(l[c]) - .2 : r[c] = parseFloat(l[c]) - Math.abs(parseFloat(.1 * s[c]));
          }
          this.$store.commit("udletterspacingval", r);
          localStorage.setItem("ada_letter_spacing", JSON.stringify(r));
          for (A = this.$store.state.fixarealetterspacing, d = Zo(), g = (parseFloat(localStorage.ada_letterspacing_percent) - 100) / 10, u = (r = [], 0), void 0; u < A.length; u++) {
            var A;
            var d;
            var g;
            var u;
            0 == A[u] ? r[u] = parseFloat(A[u]) + .2 * g : r[u] = parseFloat(A[u]) + Math.abs(parseFloat(.1 * A[u])) * g;
          }
          for (var p = 0; p < d.length; p++)(function(t) {
            d[t].style.setProperty("letter-spacing", r[t] + "px");
          })(p);
        };
      }
    };
    var ls = {
      install: function(t, a) {
        t.prototype.lowerSaturate = function() {
          var t = document.documentElement;
          var a = localStorage.getItem("saturate");
          "low" == a ? (t.classList.remove("tp-ada-lowersaturate"), localStorage.setItem("saturate", !1)) : (t.classList.remove("tp-ada-hightsaturate"), t.classList.add("tp-ada-lowersaturate"), localStorage.setItem("saturate", "low"));
        };
        t.prototype.hightSaturate = function() {
          var t = document.documentElement;
          var a = localStorage.getItem("saturate");
          "high" == a ? (t.classList.remove("tp-ada-hightsaturate"), localStorage.setItem("saturate", !1)) : (t.classList.remove("tp-ada-lowersaturate"), t.classList.add("tp-ada-hightsaturate"), localStorage.setItem("saturate", "high"));
        };
      }
    };
    var rs = e("1157");

    function cs() {
      var t = localStorage.initnavclassname;
      var a = rs(t).find("*");
      var e = localStorage.initfooterclassname;
      var i = rs(e).find("*");
      var n = rs(".iconfont:not(.tp-ada-panel-slider-title,#ada-plugin,#ada-plugin *)").not(a).not(i);
      return n;
    }
    var As = cs;
    var ds = e("1157");
    var gs = {
      install: function(t, a) {
        t.prototype.darkContrast = function() {
          var t = document.body;
          var a = As();
          var e = ds("body *:not(#ada-plugin,#ada-plugin *)");
          var i = F();
          var n = ds("a:not(#ada-plugin,#ada-plugin *)");
          var o = ds("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *)");
          var s = ds("h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          var l = ds("button:not(#ada-plugin,#ada-plugin *)");
          var r = ds("label:not(#ada-plugin,#ada-plugin *)");
          var c = le(document);
          var A = Ae(document);
          c = c.concat(A);
          t.classList.add("tp-ada-darkcontrast-body");
          for (var d = 0; d < e.length; d++) e[d].classList.add("tp-ada-comcontrast");
          for (d = 0; d < i.length; d++) i[d].classList.add("tp-ada-darkcontrast-text");
          for (d = 0; d < a.length; d++) a[d].classList.add("tp-ada-darkcontrast-text");
          for (d = 0; d < n.length; d++) n[d].classList.add("tp-ada-darkcontrast-link");
          for (d = 0; d < o.length; d++) o[d].classList.add("tp-ada-darkcontrast-bigtitle");
          for (d = 0; d < s.length; d++) s[d].classList.add("tp-ada-darkcontrast-smalltitle");
          for (d = 0; d < l.length; d++) l[d].classList.add("tp-ada-darkcontrast-outline");
          for (d = 0; d < r.length; d++) r[d].classList.add("tp-ada-darkcontrast-outline");
          for (d = 0; d < c.length; d++) c[d].classList.add("tp-ada-darkcontrast-imgs");
        };
        t.prototype.clearDarkContrast = function() {
          var t = document.body;
          var a = ds("body *:not(#ada-plugin,#ada-plugin *)");
          var e = F();
          var i = As();
          var n = ds("a:not(#ada-plugin,#ada-plugin *)");
          var o = ds("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *)");
          var s = ds("h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          var l = ds("button:not(#ada-plugin,#ada-plugin *)");
          var r = ds("label:not(#ada-plugin,#ada-plugin *)");
          var c = le(document);
          var A = Ae(document);
          c = c.concat(A);
          t.classList.remove("tp-ada-darkcontrast-body");
          for (var d = 0; d < a.length; d++) a[d].classList.remove("tp-ada-comcontrast");
          for (d = 0; d < e.length; d++) e[d].classList.remove("tp-ada-darkcontrast-text");
          for (d = 0; d < i.length; d++) i[d].classList.remove("tp-ada-darkcontrast-text");
          for (d = 0; d < n.length; d++) n[d].classList.remove("tp-ada-darkcontrast-link");
          for (d = 0; d < o.length; d++) o[d].classList.remove("tp-ada-darkcontrast-bigtitle");
          for (d = 0; d < s.length; d++) s[d].classList.remove("tp-ada-darkcontrast-smalltitle");
          for (d = 0; d < l.length; d++) l[d].classList.remove("tp-ada-darkcontrast-outline");
          for (d = 0; d < r.length; d++) r[d].classList.remove("tp-ada-darkcontrast-outline");
          for (d = 0; d < c.length; d++) c[d].classList.remove("tp-ada-darkcontrast-imgs");
        };
        t.prototype.lightContrast = function() {
          var t = document.body;
          var a = ds("body *:not(#ada-plugin,#ada-plugin *)");
          var e = ds("a:not(#ada-plugin,#ada-plugin*)");
          var i = ds("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          var n = ds("button:not(#ada-plugin,#ada-plugin *)");
          var o = ds("label:not(#ada-plugin,#ada-plugin *)");
          var s = ds("input:not(#ada-plugin,#ada-plugin *)");
          var l = ds("select:not(#ada-plugin,#ada-plugin *)");
          var r = ds("textarea:not(#ada-plugin,#ada-plugin *)");
          var c = le(document);
          var A = Ae(document);
          c = c.concat(A);
          t.classList.add("tp-ada-lightcontrast-body");
          for (var d = 0; d < a.length; d++) a[d].classList.add("tp-ada-comcontrast");
          for (d = 0; d < e.length; d++) e[d].classList.add("tp-ada-lightcontrast-link");
          for (d = 0; d < i.length; d++) i[d].classList.add("tp-ada-lightcontrast-title");
          for (d = 0; d < n.length; d++) n[d].classList.add("tp-ada-lightcontrast-outline");
          for (d = 0; d < o.length; d++) o[d].classList.add("tp-ada-lightcontrast-outline");
          for (d = 0; d < s.length; d++) s[d].classList.add("tp-ada-lightcontrast-input");
          for (d = 0; d < l.length; d++) l[d].classList.add("tp-ada-lightcontrast-select");
          for (d = 0; d < r.length; d++) r[d].classList.add("tp-ada-lightcontrast-textarea");
          for (d = 0; d < c.length; d++) c[d].classList.add("tp-ada-lightcontrast-imgs");
        };
        t.prototype.clearLightContrast = function() {
          var t = document.body;
          var a = ds("body *:not(#ada-plugin,#ada-plugin *)");
          var e = ds("a:not(#ada-plugin,#ada-plugin *)");
          var i = ds("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          var n = ds("button:not(#ada-plugin,#ada-plugin *)");
          var o = ds("label:not(#ada-plugin,#ada-plugin *)");
          var s = ds("input:not(#ada-plugin,#ada-plugin *)");
          var l = ds("select:not(#ada-plugin,#ada-plugin *)");
          var r = ds("textarea:not(#ada-plugin,#ada-plugin *)");
          var c = le(document);
          var A = Ae(document);
          c = c.concat(A);
          t.classList.remove("tp-ada-lightcontrast-body");
          for (var d = 0; d < a.length; d++) a[d].classList.remove("tp-ada-comcontrast");
          for (d = 0; d < e.length; d++) e[d].classList.remove("tp-ada-lightcontrast-link");
          for (d = 0; d < i.length; d++) i[d].classList.remove("tp-ada-lightcontrast-title");
          for (d = 0; d < n.length; d++) n[d].classList.remove("tp-ada-lightcontrast-outline");
          for (d = 0; d < o.length; d++) o[d].classList.remove("tp-ada-lightcontrast-outline");
          for (d = 0; d < s.length; d++) s[d].classList.remove("tp-ada-lightcontrast-input");
          for (d = 0; d < l.length; d++) l[d].classList.remove("tp-ada-lightcontrast-select");
          for (d = 0; d < r.length; d++) r[d].classList.remove("tp-ada-lightcontrast-textarea");
          for (d = 0; d < c.length; d++) c[d].classList.remove("tp-ada-lightcontrast-imgs");
        };
        t.prototype.monochromemode = function() {
          var t = ds(":root");
          t.addClass("tp-ada-monochrome-contrast");
        };
        t.prototype.clsmonochromemode = function() {
          var t = ds(":root");
          t.removeClass("tp-ada-monochrome-contrast");
        };
        t.prototype.highContrast = function() {
          var t = ds(":root");
          var a = ds(".tp-ada-plugin-box");
          t.addClass("tp-ada-highcontrast");
          a.addClass("tp-ada-highcontrast");
        };
        t.prototype.clearhighContrast = function() {
          var t = ds(":root");
          var a = ds(".tp-ada-plugin-box");
          t.removeClass("tp-ada-highcontrast");
          a.removeClass("tp-ada-highcontrast");
        };
      }
    };
    var us = e("1157");
    var ps = {
      install: function(t, a) {
        t.prototype.clrTitleColor = function() {
          var t = us("h1:not(#ada-plugin,#ada-plugin *),h2:not(#ada-plugin,#ada-plugin *),h3:not(#ada-plugin,#ada-plugin *),h4:not(#ada-plugin,#ada-plugin *),h5:not(#ada-plugin,#ada-plugin *),h6:not(#ada-plugin,#ada-plugin *)");
          t = [].slice.call(t);
          for (var a = 0; a < t.length; a++) {
            t[a].classList.remove("tp-ada-title-color-picker-0");
            t[a].classList.remove("tp-ada-title-color-picker-1");
            t[a].classList.remove("tp-ada-title-color-picker-2");
            t[a].classList.remove("tp-ada-title-color-picker-3");
            t[a].classList.remove("tp-ada-title-color-picker-4");
            t[a].classList.remove("tp-ada-title-color-picker-5");
            t[a].classList.remove("tp-ada-title-color-picker-6");
            t[a].classList.remove("tp-ada-title-color-picker-7");
          }
        };
      }
    };
    var hs = {
      install: function(t, a) {
        t.prototype.clrBgc = function() {
          var t = JSON.parse(localStorage.initbodybgc);
          var a = t[0];
          var e = t[1];
          var i = document.body;
          i.style.removeProperty("background-color");
          e && i.style.setProperty("background-color", a);
        };
      }
    };
    var ms = {
      install: function(t, a) {
        t.prototype.hideImages = function() {
          var t = le(document);
          var a = Ae(document);
          var e = "true" === localStorage.hideImgs;
          if (e) {
            for (var i = 0; i < t.length; i++) t[i].classList.remove("tp-ada-hide");
            for (i = 0; i < a.length; i++) a[i].classList.remove("tp-ada-hide-bgimage");
            this.$store.commit("udhideimgstate", !1);
            localStorage.setItem("hideImgs", !1);
          } else {
            for (i = 0; i < t.length; i++) t[i].classList.add("tp-ada-hide");
            for (i = 0; i < a.length; i++) a[i].classList.add("tp-ada-hide-bgimage");
            this.$store.commit("udhideimgstate", !0);
            localStorage.setItem("hideImgs", !0);
          }
        };
      }
    };
    var fs = (e("1157"), {
      install: function(t, a) {
        t.prototype.readmode = function() {
          var t = document.getElementsByClassName("tp-ada-readmode-box")[0];
          var a = document.getElementsByClassName("tp-ada-readmode-box-content")[0];
          var e = document.body.scrollHeight + 400;
          t.style.setProperty("height", e + "px");
          var i = Da();
          i = [].slice.call(i);
          var n = [];
          Array.from(i, function(t) {
            "script" != t.tagName.toLowerCase() && "style" != t.tagName.toLowerCase() && n.push(t);
          });
          Array.from(n, function(t) {
            var e = t.tagName.toLowerCase();
            var i = document.createElement(e);
            i.innerText = t.innerText;
            i.classList.add("tp-ada-readmode");
            a.appendChild(i);
            "a" == e && (i.href = t.href);
          });
        };
      }
    });
    v["default"].use(Wo);
    v["default"].prototype.i18n = No;
    v["default"].use(C.a);
    v["default"].use(m.a);
    v["default"].use(p.a);
    v["default"].use(g.a);
    v["default"].use(A.a);
    v["default"].use(r.a);
    v["default"].use(s.a);
    v["default"].use(n.a);
    v["default"].config.productionTip = !1;
    v["default"].use(as);
    v["default"].use(es);
    v["default"].use(is);
    v["default"].use(ns);
    v["default"].use(zo);
    v["default"].use($o);
    v["default"].use(ss);
    v["default"].use(ls);
    v["default"].use(gs);
    v["default"].use(ps);
    v["default"].use(hs);
    v["default"].use(fs);
    v["default"].use(ms);
    v["default"].use(as);
    v["default"].prototype.i18n = No;
    var Cs = null;
    window.location.href;
    Cs = function(t) {
      var a = document.createElement("div");
      a.id = "ada-plugin";
      a.classList.add("tp-ada-widget");
      document.body.appendChild(a);
      new v["default"]({
        store: ao,
        i18n: No,
        render: function(a) {
          return a(Ro, t);
        },
        components: {
          App: Ro
        }
      }).$mount("#ada-plugin");
    };
    a["default"] = Cs;
  },
  "570f": function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "toets",
      new: "Nieuw",
      open: "Open",
      save: "Opslaan",
      download: "Downloaden",
      about: "Wat betreft",
      github: "Github",
      stop: "STOP",
      animationarea: "Animatiegebied",
      HideImagesAudioVideoAnimation: "Afbeeldingen/Audio/Video/Animatie verbergen",
      AdjustContrast: "Contrast aanpassen",
      AdjustFontsize: "Lettergrootte aanpassen",
      alignleft: "Links uitlijnen",
      aligncenter: "Tekst in het midden uitlijnen",
      alignRight: "Rechts uitlijnen",
      seizureSafe: "Inbeslagneming veilig",
      seizureSafeDetail: "Elimineert flitsen en vermindert kleur",
      StopMedia: "Media stoppen",
      StopVideo: "Video stoppen",
      stopAudio: "Audio stoppen",
      stopAnimation: "Animatie stoppen",
      SetBackgroundColor: "Achtergrondkleur instellen",
      SetTextColors: "Tekstkleuren instellen",
      HideImages: "Afbeeldingen verbergen",
      HideMedia: "Verberg video/audio",
      HideAnimation: "Animatie verbergen",
      lowSaturate: "Lage verzadiging",
      RESET: "Resetten",
      clear: "Duidelijk"
    }, n(i, "seizureSafe", "Inbeslagneming veilig"), n(i, "cognitivedisability", "Cognitieve handicap"), n(i, "cognitivedisabilityDetail", "Helpt bij lezen en focussen"), n(i, "visionImpaired", "Slechtzienden"), n(i, "visionImpairedDetail", "Verbetert de visuals van de website"), n(i, "highLighLink", "Markeer link"), n(i, "highLighTitle", "Markeer titel"), n(i, "hightSaturateBtn", "Hoogte verzadiging"), n(i, "readableFont", "Leesbaar lettertype"), n(i, "ADHDFriendlySlider", "ADHD vriendelijk"), n(i, "ADHDFriendlySliderDetail", "Meer focus en minder afleiding"), n(i, "AdjustLineHeight", "Lijnhoogte aanpassen"), n(i, "AdjustScale", "Schaal aanpassen"), n(i, "AdjustLetterSpacing", "Letterspatiëring aanpassen"), n(i, "monochrome", "Monochroom"), n(i, "darkContrast", "Donker contrast"), n(i, "lightContrast", "Lichtcontrast"), n(i, "muted", "Gedempt"), n(i, "bigblackcursor", "Grote zwarte cursor"), n(i, "bigwhitecursor", "Grote witte cursor"), n(i, "readguide", "Leesgids"), n(i, "readmask", "Leesmasker"), n(i, "highlighthover", "Markeer zweven"), n(i, "SetTitleColors", "Titelkleuren instellen"), n(i, "textmagnifier", "Tekst vergrootglas"), n(i, "readmode", "Leesmodus"), n(i, "usefullinks", "handige links"), n(i, "selectoption", "kies een optie"), n(i, "highContrast", "Hoog contrast"), n(i, "AccessibilityAdjustments", "Toegankelijkheidsaanpassingen"), n(i, "ProfileOption", "Kies het juiste toegankelijkheidsprofiel voor jou"), n(i, "ColorAdjust", "Kleuraanpassing"), n(i, "orientationadjusttitle", "Oriëntatie aanpassingen"), n(i, "ContentAdjustments", "Inhoudsaanpassingen"), n(i, "WebADA", "Oplossing voor webtoegankelijkheid"), n(i, "pleasechoose", "Gelieve te kiezen"), n(i, "nodatatext", "geen informatie"), i);
  },
  "58ac": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAwFJREFUeF7t3E1uwmAMhOFwsyLlXqj3ilSOVqF2hbKwIEYZ+WFtjL/xxH4JP5fFY7QCl9Gnd/iFAYabgAEYYLgCw49vAjDAcAWGH98EYIDhCgw/vgnAAMMVGH58E4ABhisw/PgmAAMMV2D48U0ABhiuwPDjmwAMMFyB4cc3ARhguALDjz9mAqzr+rUsy63Y7+9t2+7F2OiwaQb4KXbrygBFpVLC/icAAzw1zATYd7AJkHJlV+s0AfaVMgFMgOo1lB1nApgAj7eBIBAEliYZCCzJFBRkBVgBVsCOB7wL8C4gaI6/UaoVYAVYAVaAt4HPHsAAGOCNxRr0VAyAATAABsAAGKC2ttwKrumUE4UBMAAGwAAYAAPUthYGqOmUE4UBMAAGwAAYAAPUthYGqOmUE4UBMAAGwAAYAAPUthYGqOmUE4UBMAAGwAAYAAPUthYGqOmUE4UBPsgA/2Kf0R3lXwefsfiO/y1q+Vr4uq4PoR/Q5XGcAvdt267HpfvLxABHK9qXjwH6tI3IzAARbeorkgH6tI3IzAARbeorkgH6tI3IzAARbeorkgH6tI3IzAARbeorMsoAZ70L6Fbwk0Fb7gT2XQSvZ/Zh0L52DLCvi4+DX7/WzvlME8AE8JWwHQ9YAVbAOUf20VVZAVaAFWAF+FbwswcwAAY4etueMx8GwAAYAANgAAxQ21BuBdd0yonCABgAA2AADIABalsLA9R0yonCABgAA2AADIABalsLA9R0yonCABgAA2AADIABalsLA9R0yonCABgAA2AADIABalsLA9R0yonCABgAA2AADIABalsLA9R0yonCABgAA2AADDCdAW7FpfXd8d/8xdf+aNiYH4d+VNWgF2OAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5WSAoGZ1lMoAHaoG5fwFiMGukJXY5wUAAAAASUVORK5CYII=";
  },
  "594b": function(t, a, e) {},
  "5e3e": function(t, a, e) {
    "use strict";

    e("9720");
  },
  "609d": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAA5dJREFUeF7t1rFtFkEUReHrKoxMHaS0gBNcpEmgBVLqwMJVgJAIEERnnu9o5D3Eb//Z+fZx4Cb+ubTAzaVv7+XjAlx8CVwAF+DiAhe/vgVwAS4ucPHrWwAX4OICF7++BXABLi5w8etbABdgWeBzkndJ7pZ/wQdfQuApybck9ys/tlqAnyuH+UxdAH9P/ECSxyQf61fxgBWBT0keyIMrC/AjyS05xNltAs9J3pDTVhbgteV/xYAYt2f//R7oPmj4z01cgPYnZb/vAjCv/6ZX/hIMj3zRx12AIacLAAH9JwCClcctwBDYAkBACwDByuMWYAhsASCgBYBg5XELMAS2ABDQAkCw8rgFGAJbAAhoASBYedwCDIEtAAS0ABCsPG4BhsAWAAJaAAhWHrcAQ2ALAAEtAAQrj1uAIbAFgIAWAIKVxy3AENgCQEALAMHK4xZgCGwBIKAFgGDlcQswBLYAENACQLDyuAUYAlsACGgBIFh53AIMgS0ABLQAEKw8bgGGwBYAAloACFYetwBDYAsAAS0ABCuPW4AhsAWAgBYAgpXHLcAQ2AJAQAsAwcrjFmAIbAEgoAWAYOVxCzAEtgAQ0AJAsPK4BRgCWwAIaAEgWHncAgyBLQAEtAAQrDxuAYbAFgACWgAIVh63AENgCwABLQAEK49bgCGwBYCAFgCClcctwBDYAkBACwDByuMWYAhsASCgBYBg5XELMAS2ABDQAkCw8rgFGAJbAAhoASBYedwCDIEtAAS0ABCsPG4BhsAWAAJaAAhWHrcAQ2ALAAEtAAQrj1uAIbAFgIAWAIKVxy3AENgCQEALAMHK4xZgCGwBIKAFgGDlcQswBLYAENACQLDyuAUYAlsACGgBIFh53AIMgS0ABLQAEKw8bgGGwBYAAloACFYetwBDYAsAAS0ABCuPW4AhsAWAgBYAgpXHLcAQ2AJAQAsAwcrjFmAIbAEgoAWAYOVxCzAEtgAQ0AJAsPK4BRgCWwAIaAEgWHncAgyBLQAEtAAQrDxuAYbAFgACfk9yB59xfI/AU5K35KiV7f+c5AM5xNltAl+S3JPTVhbg9++/tv8HELOTZ/H3xA/8dfvHJO+T3J4scoF3e07yNcnDyl0nC7Byns8cJuACHPZBdr+OC7Bb/LDzXIDDPsju13EBdosfdp4LcNgH2f06LsBu8cPOcwEO+yC7X8cF2C1+2HkuwGEfZPfruAC7xQ87zwU47IPsfp1fqgLQgfmXn1QAAAAASUVORK5CYII=";
  },
  "60c5": function(t, a, e) {},
  "6f9a": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAvJJREFUeF7tnbFtVAEUBPfaoANKcEoZELgQJEuO6AOJHkjoArkFMgJXYDlwYpHc/a9lpB3H9+/tzhu9u4t8iX/TBC7T7S0fBRiXQAEUYJzAeH0vgAKMExiv7wVQgHEC4/W9AAowTmC8vhdAAcYJjNf3AijAOIHx+l4ABRgnMF7fC6AA4wTG63sBFGCcwHh9L4ACjBMYr+8FUIBxAuP1vQAKME5gvL4XQAHGCYzX9wIowDiB8fpeAAUYJzBe3wugAOMExut7ARRgnMB4fS+AAowTGK/vBVCAcQLj9b0ACjBOYLy+F0ABxgmM1/cCKMA4gfH6XgAFGCcwXt8LoADjBMbrewEUYJzAeH0vgAKMExiv7wVQgHEC4/W9AAowTmC8vhdAAU4j8DXJlyQfT3tH3+hfBP4m+ZnkW5LfRxGddQF+JPl8NIzPX0XgOcldkqernnr34jME+JTk15EQPnszge9J7m9+Ojnln0c/Jnk4EsJnbybwJ8mHm59WgCPoEM8iBPAj4P+5gPgIeK3vl8C+BJgvgW/V/RnYkQD5M7BT3SmnEzjjZ+DpoXzDHgEF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oRSgxxo5SQGQa+mFUoAea+QkBUCupRdKAXqskZMUALmWXigF6LFGTlIA5Fp6oV4AIfUWgVAfWRsAAAAASUVORK5CYII=";
  },
  "75e6": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAACTBJREFUeF7tnWmodlUVx3+aQxKJGqZlmalYVmJlE4ljZpJmg5aQqNmgaEWW9cG+VF/0g0NGmjRY+cH01ahMiyzUBgpzqrBMo5ytFKIQIqdK/rofvO/zPuec/bw+e6313LMWXLhwzz1r+p+99rD2WhuQNGoLbDBq7VN5EgAjB0ECIAEwcguMXP0cARIAI7fAyNXPESABMDoL7Atc06H1fsBPx2SRMY4ACYAVCE8ArP255wgwguEvR4AcAXIOMMFAhoAMASMY9NdWMUNAhoAMARkCZg98uQoYQUDIEJAhIENAhoAMAU9YIJeBuQw0i/rvBi4149bNSHOAPopwGGRmK6sRQApdArwT+F4AEEQWYWKr91h8MBYAmCgkoz8KvAu4IrIHHGVbaSuJ0RwErQEwrZCU+k8ZCa50NHRE1rNs1RwELQHQpZCUerCMBFdF9ISDTH22agqCVgAYUkhK/QM4DPiZg8EjsayxVTMQtAKABH5Hmfht3GPtvwOHA7908Mi2wHaF732AZLEmV+dL2ZYA0PsPKSDYrMey9xYQ/LqB9XcoMrykOPv5gH7k+A2n+P0PEBD+Wn70+21lwnpnA9ncnW8BAPF4SwHB5j1GvAOQQW5cgKG1ztfPocCrFvA+veI3wPdLwugi9glCON8KAOLzJmAN8Jweh/ypLHt+tx5OOwg4Atgf2H49/n+ef7kbuLro86N5/rE8G8b5lgAQr32AiwHF3i66pYDgD5WGfSXwMeB9lc8v+rFvAl8AfjvHi2sA0Hz9P5G39Rxg2i57FhC8oMNgnwM+W2FMgUiOPwl4ZsXzLR95CDi7AKF2ItkHAjPnW48AEye8HrgIePGUV2qdL6fL+ZrgRSJNFDUaCAw1NAsEps73AoD47gF8C9ilWKrG+c8Dvga8tca6js/8EPgg8LcKGVaCwNz5ngAQ790LCHRCODTsCzAXAlrOLQNp+Xhk5apGIBC5nJRazwGmnfdyYGjCp72E7wIbLYPnV8j4WDnzCH3w5Q2AIZ8eB3x56KHgfz8e+EpUGSMD4DMVoSGqXaflqpnjuOgSFQCa6P3AxSLtmB4MaIIYiiIC4NWVk6dQhqwURpPZmyqfNXksGgC0N/BHYFMT7e2ZPAzsCujsIwRFAsCWwGXAXiEs006IXwBvB/7ZjkX9myMBQMmiMswYSEBXvoQ7RQHACcCX3K1hK8CJwHm2LNflFgEAOsy5DtjN2xjG/G8GXgfoMMmNIgDg48BZHRb4v0HWkpvxgU8An/cUwBsAWwDXAzt7GsGR95+B1wL/8pLBGwCnAKd6KR+E76eB07xk8QSAkjr09Xclh3jZxJqvkmI1CtQmkyxUPk8AKKmjNnlioUoHfJmSXJRMYk6eAPgx8GZzjWMy/AlwoIdoXgDYEfiLh8KBee4E3G4tnxcAPgmcbq1scH6fAs6wltELAD8fwZ7/vL7UGcHe8/7T033eAwBK7tT1q6R1LaBrazXJpAuznQcAPgycszANVteLPgKca6mSBwC+CEjRpHUtoA/jo5aG8QDAd0q2rKWey8JL2c8qoWNGHgC4FtDtoKR1LaAr8m+wNEwNAIbKqnXJ23WNWrdrX2ip5BLxuqfndvOi/fCEWWoAoCPZeamv6PJ/ZxRnmPf9q/V5Fal4RodyfTWO++zR62NrAOgAyHSZs4RI0TJ51sHQqgCA0qJvWEKnWIr8mo60+ASApRccea1qAGQIGEbWqg4BUj8ngd0gCDkJXPTyI5eB3QAIuQwcHrTmeyI3grrtFXIjaD73Dj+dW8HdNhrFVnAeBnUDYBSHQWO8BjY8Lj75hPl1sZqdwFrha597LnB/7cMje24b4AFLnT0AIP1UYlU1hJOesoAaaKjkrSl5AUB19L5qqml8Zh8qdRBNJfUCgI6DtR+Q9JQFVORa+wCm5AUAKany628z1TYus8tLeXtzCT0BoLxALQmTnswDdEmU9QSAZrza+XrRyBFwV0mRc1kZeQJAfj/Z4zZMMMDpltSZXjJ5A2CTMgqo8cMYSY0mlCD7iJfy3gCQ3u8HzvcygDPfDwBf95QhAgCkv3rwKJF0THRN6XHkqnMUAKiptE4Jx0S6AKLTP1eKAgAZQcsg3RscA+n+X4jrcZEAMJZQEGLon3xl0QCgsnG3AtojWI2ktf5LPcvCTRs1GgAknypmqXLoaiRVBlVltDAUEQAyzntLk6gwhlqAIGoipU5poSgqAGSkbBljAJXIAJD6q6F1TMhWMVEmga8Afj8AdLWQ+dUSdhFRd5A3RmsRE2kSqNbuagZ5SUV3MLWSuWCJKoup4tcxla1hRtk4UjN9TYgmVcJr2qqppcw3lqCriLqBHFvZEmaUrWM1LMr503kANSDQCKa0cv1EazChBhDqAFLbBWSUzaNVCFGdw1UPbxbVgkBdRgQC5dF79xpQzX+1u5Hja7t/jLJ9/P7AxcDWPZM+9RFWF+1bKldA2jmcAMG67LzKvE8cP0/Dhz7nT9Q26yRutQzUHQA5Xw7ronmdv/I9qjtwBKAlV+sK5Krsra6ma9azxr9OATXx7aoFZAoCCwDIKTLWsxo5f/q1qkQuIx+6wFWDZvXKYtaR9SIqeisbWiBQKOuj5iNBawCoN56cr9SvFl/+UKRQtQ2BQQcw25W5h+Yf+n3DqX9WcYb7Sh1j1TLW7zqYktNbFLbSLSCB4NmeIGgJgMOLgn08ns6wP+T8ob8rbAgIIjnbo2XLAeUD2coLBC0BoK/+2z2XPzydPwQOy7+rAovmR0NH4E3CQUsAyIibl7QnrQBWUjp/bXvsWUAwayXz77IyatJ6vjUApKaug2t3bFIDN50/e3xRerj2SLTtPSElkOhoXEmzTcgCABJcFx81i95oznV+E6UDv1SFNLVLuktZbRxVDsKaiWwFACkgpQSA2k2eZkoHf/Hu5ZDsaIuTREsARLH7UNm7rirnlvK/zOpDGSsAlJk7i/qqnFsCwIxXAmBtUycAzKDnx6iv6nYCwM8vZpwTACtMnSEgQ4DZlxeFUY4AOQKQq4ACggwBGQKijMxmcmQIyBCQIWCCgQwBGQLMht4ojDIEZAjIEDDmEBBlJAohxxjnACEMH0WIBEAUTzjJkQBwMnwUtgmAKJ5wkiMB4GT4KGwTAFE84SRHAsDJ8FHYPg6ITZKQLz93sQAAAABJRU5ErkJggg==";
  },
  7756: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  8859: function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "Prüfung",
      new: "Neu",
      open: "Offen",
      save: "Speichern",
      download: "Herunterladen",
      about: "Über",
      github: "Github",
      stop: "HALT",
      animationarea: "Animationsbereich",
      HideImagesAudioVideoAnimation: "Bilder/Audio/Video/Animation ausblenden",
      AdjustContrast: "Kontrast anpassen",
      AdjustFontsize: "Schriftgröße anpassen",
      alignleft: "Linksbündig",
      aligncenter: "Im Zentrum anordnen",
      alignRight: "Rechts ausrichten",
      seizureSafe: "Anfallssafe",
      seizureSafeDetail: "Beseitigt Blitze und reduziert Farbe",
      StopMedia: "Medien stoppen",
      StopVideo: "Video stoppen",
      stopAudio: "Audio stoppen",
      stopAnimation: "Animation stoppen",
      SetBackgroundColor: "Hintergrundfarbe einstellen",
      SetTextColors: "Textfarben einstellen",
      HideImages: "Bilder ausblenden",
      HideMedia: "Video/Audio ausblenden",
      HideAnimation: "Animation ausblenden",
      lowSaturate: "Niedrige Sättigung",
      RESET: "ZURÜCKSETZEN",
      clear: "Klar"
    }, n(i, "seizureSafe", "Anfallssafe"), n(i, "cognitivedisability", "Kognitive Behinderung"), n(i, "cognitivedisabilityDetail", "Hilft beim Lesen und Fokussieren"), n(i, "visionImpaired", "Sehbehinderte"), n(i, "visionImpairedDetail", "Verbessert die visuelle Darstellung der Website"), n(i, "highLighLink", "Highlight-Link"), n(i, "highLighTitle", "Highlight-Titel"), n(i, "hightSaturateBtn", "Hohe Sättigung"), n(i, "readableFont", "Lesbare Schriftart"), n(i, "ADHDFriendlySlider", "ADHS-freundlich"), n(i, "ADHDFriendlySliderDetail", "Mehr Fokus und weniger Ablenkungen"), n(i, "AdjustLineHeight", "Linienhöhe anpassen"), n(i, "AdjustScale", "Maßstab anpassen"), n(i, "AdjustLetterSpacing", "Buchstabenabstand anpassen"), n(i, "monochrome", "Einfarbig"), n(i, "darkContrast", "Dunkler Kontrast"), n(i, "lightContrast", "Lichtkontrast"), n(i, "muted", "Stummgeschaltet"), n(i, "bigblackcursor", "Großer schwarzer Cursor"), n(i, "bigwhitecursor", "Großer weißer Cursor"), n(i, "readguide", "Leseanleitung"), n(i, "readmask", "Lesemaske"), n(i, "highlighthover", "Highlight-Hover"), n(i, "SetTitleColors", "Titelfarben festlegen"), n(i, "textmagnifier", "Textlupe"), n(i, "readmode", "Lesemodus"), n(i, "usefullinks", "Nützliche Links"), n(i, "selectoption", "Wähle eine Option"), n(i, "highContrast", "Hoher Kontrast"), n(i, "AccessibilityAdjustments", "Anpassungen der Barrierefreiheit"), n(i, "ProfileOption", "Wählen Sie das richtige Zugänglichkeitsprofil für Sie"), n(i, "ColorAdjust", "Farbanpassung"), n(i, "orientationadjusttitle", "Ausrichtungsanpassungen"), n(i, "ContentAdjustments", "Inhaltsanpassungen"), n(i, "WebADA", "Web-Accessibility-Lösung"), n(i, "pleasechoose", "bitte auswählen"), n(i, "nodatatext", "无数据"), i);
  },
  "8a37": function(t, a, e) {
    "use strict";

    e("2ada");
  },
  "8eb8": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAA4BJREFUeF7tmzFyXTEMA+37Hzpp3CZjcEwvOFrXfAIErFj5f37493QCn0/f3st/CMDjEAiAADyewOPXdwMIwOMJPH59N4AAPJ7A49d3AwjA4wk8fn03gAA8nsDj13cDCMDjCTx+fTeAAMQJ/Im/8IPfTCB61NHw1y0E4DfrzLWiTqNhAcjbAL6IOo2GBQCoM5eMOo2GBSBvA/gi6jQaFgCgzlwy6jQaFoC8DeCLqNNoWACAOnPJqNNoWADyNoAvok6jYQEA6swlo06jYQHI2wC+iDqNhgUAqDOXjDqNhnMvftGegAC0N7TsTwCWA24/XgDaG1r2JwDLAbcfLwDtDS37E4DlgNuPF4D2hpb9CcBywO3HC0B7Q8v+BGA54PbjBaC9oWV/ArAccPvxAtDe0LI/AVgOuP14AWhvaNnfBAB/Gvb/UiaZLtf87+MnZgVAADBgLwhPHhV2r4lZN4AbAAP2gvDkUWH3mph1A7gBMGAvCE8eFXaviVk3gBsAA/aC8ORRYfeamHUDuAEwYC8ITx4Vdq+JWTfA4xsAo1Xhn09gsgF+3oUnYgkIABZ9h7AAdPSAuRAALPoOYQHo6AFzIQBY9B3CAtDRA+ZCALDoO4QFoKMHzIUAYNF3CAtARw+YCwHAou8QFoCOHjAXAoBF3yEsAB09YC4mAPgPIVhd3xKOOo2Gv+QF4Fs9YENRp9GwAGClJsJRp9GwACQ9YLNRp9GwAGClJsJRp9GwACQ9YLNRp9GwAGClJsJRp9GwACQ9YLNRp9GwAGClJsJRp9GwACQ9YLNRp9GwAGClJsJRp9GwACQ9YLNRp9EwdiWF1xIQgLVobxwsADd6WnMpAGvR3jhYAG70tOZSANaivXGwANzoac2lAKxFe+NgAbjR05pLAViL9sbBAnCjpzWXArAW7Y2DBeBGT2suBWAt2hsHC8CNntZcCsBatDcOngDgT8P+3+0kU4yWiVkBEAAM2AvCk0eF3Wti1g3gBsCAvSA8eVTYvSZm3QBuAAzYC8KTR4Xda2LWDeAGwIC9IDx5VNi9JmbdAG4ADNgLwpNHhd1rYtYN8PgGwGhV+OcTmGyAn3fhiVgCAoBF3yEsAB09YC4EAIu+Q1gAOnrAXAgAFn2HsAB09IC5EAAs+g5hAejoAXMhAFj0HcIC0NED5kIAsOg7hAWgowfMhQBg0XcIC0BHD5iLvyWbMIGBHAVQAAAAAElFTkSuQmCC";
  },
  "92f9": function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAA1hJREFUeF7tm0FOJDEQBIf/Pxq00lxBxEqmol2x52w7KzNc7AE+Xv1bncDH6ukb/hUAyyEIgABYnsDy8dsAAbA8geXjtwECYHkCy8dvAwTA8gSWj98GCIDlCSwfvw0QAMsTWD5+GyAAcAKf+Is++MsE0KNG4vcUAfCXdfK7UKdIHAC8jYEvUKdIHAADdfIrUadIHAC8jYEvUKdIHAADdfIrUadIHAC8jYEvUKdIHAADdfIrUadIHAC8jYEvUKdIHAADdfIrUadIHAC8jYEvUKdIHAADdfIrUadIzL30hT2BALA3dNhfABwO2H58ANgbOuwvAA4HbD8+AOwNHfYXAIcDth8fAPaGDvsLgMMB248PAHtDh/0FwOGA7ccHgL2hw/4C4HDA9uMDwN7QYX8BcDhg+/EBYG/osL8nAtCfpv0MBeoUiQ/D+NvjAyAAfsvKSh161EgsibMN0AaQoOi0gR41EkvmbQO0ASQoOm2gR43EknnbAG0ACYpOG+hRI7Fk3jZAG0CCotMGetRILJm3DbB8A0g4vMPGEzfAHclLpggASRFTNgJgKnnJvQEgKWLKRgBMJS+5NwAkRUzZCICp5CX3BoCkiCkbATCVvOTeAJAUMWUjAKaSl9wbAJIipmwEwFTyknsDQFLElI0AmEpecu//ANAvZEjK+8YG6hSJ3xcGQAC4E1juDj1qJG4DPAIt1CkSB0AA/Eug/wO4OUCPGonbAO7m3+5Qp0gcAAHQjwA/A+hRI3EbwN/+6/VCnSJxAARAPwL8DKBHjcT+2XNIEwgAmthl+gC4rFA6TgDQxC7TB8BlhdJxAoAmdpk+AC4rlI4TADSxy/QBcFmhdJwAoIldpg+Aywql4wQATewyfQBcVigdJwBoYpfpA+CyQuk4AUATu0z/RAD6tfSfIUSdIrEE/gAIAAmKThvoUSOxZN42QBtAgqLTBnrUSCyZtw3QBpCg6LSBHjUSS+ZtA7QBJCg6baBHjcSSedsAbQAJik4b6FEjsWTeNsDyDSDh8A4bT9wAdyQvmSIAJEVM2QiAqeQl9waApIgpGwEwlbzk3gCQFDFlIwCmkpfcGwCSIqZsBMBU8pJ7A0BSxJSNAJhKXnJvAEiKmLIRAFPJS+4NAEkRUzYCYCp5yb1fJOcwgbWrMkoAAAAASUVORK5CYII=";
  },
  9720: function(t, a, e) {},
  "98f9": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "9c25": function(t, a, e) {
    e("a434");
    (function() {
      "use strict";

      Element.prototype._addEventListener = Element.prototype.addEventListener;
      Element.prototype._removeEventListener = Element.prototype.removeEventListener;
      Element.prototype.addEventListener = function(t, a) {
        var e = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        this._addEventListener(t, a, e);
        this.eventListenerList || (this.eventListenerList = {});
        this.eventListenerList[t] || (this.eventListenerList[t] = []);
        this.eventListenerList[t].push({
          type: t,
          listener: a,
          useCapture: e
        });
      };
      Element.prototype.removeEventListener = function(t, a) {
        var e = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
        this._removeEventListener(t, a, e);
        this.eventListenerList || (this.eventListenerList = {});
        this.eventListenerList[t] || (this.eventListenerList[t] = []);
        for (var i = 0; i < this.eventListenerList[t].length; i++)
          if (this.eventListenerList[t][i].listener === a && this.eventListenerList[t][i].useCapture === e) {
            this.eventListenerList[t].splice(i, 1);
            break;
          }
        0 == this.eventListenerList[t].length && delete this.eventListenerList[t];
      };
      Element.prototype.getEventListeners = function(t) {
        this.eventListenerList || (this.eventListenerList = {});
        const _tmp_iq2i0n = void 0 === t ? this.eventListenerList : this.eventListenerList[t];
        return _tmp_iq2i0n;
      };
    })();
  },
  "9c9e": function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  "9e7b": function(t, a, e) {
    "use strict";

    e("60c5");
  },
  a0d7: function(t, a, e) {
    "use strict";

    e("a9d5");
  },
  a9d5: function(t, a, e) {},
  abac: function(t, a) {
    t.exports = {
      test: "测试",
      new: "新建",
      open: "打开",
      save: "保存",
      download: "下载",
      about: "关于",
      github: "Github",
      stop: "停止",
      animationarea: "动画区",
      HideImagesAudioVideoAnimation: "隐藏图片/音频/视频/动画",
      AdjustContrast: "调整对比度",
      AdjustFontsize: "调整字体大小",
      alignleft: "左对齐",
      aligncenter: "居中对齐",
      alignRight: "右对齐",
      StopMedia: "停止音频/视频",
      StopVideo: "停止视频",
      stopAudio: "停止音频",
      stopAnimation: "停止动画",
      SetBackgroundColor: "背景颜色",
      SetTextColors: "文本颜色",
      HideImages: "隐藏图片",
      HideMedia: "隐藏视频/音频",
      HideAnimation: "隐藏动画",
      lowSaturate: "低饱和度",
      RESET: "重置",
      clear: "清除",
      seizureSafe: "癫痫",
      seizureSafeDetail: "消除闪光并减少颜色",
      cognitivedisability: "认知障碍",
      cognitivedisabilityDetail: "帮助阅读和集中注意力",
      visionImpaired: "视力障碍",
      visionImpairedDetail: "增强网站的视觉效果",
      highLighLink: "突出链接",
      highLighTitle: "突出标题",
      hightSaturateBtn: "高饱和度",
      readableFont: "易读字体",
      ADHDFriendlySlider: "多动症友好",
      ADHDFriendlySliderDetail: "集中注意力和减少干扰",
      AdjustLineHeight: "调整行高",
      AdjustScale: "调整缩放倍数",
      AdjustLetterSpacing: "调整字间距",
      monochrome: "单色模式",
      darkContrast: "暗黑对比",
      lightContrast: "光对比",
      muted: "静音",
      bigblackcursor: "黑色大光标",
      bigwhitecursor: "白色大光标",
      readguide: "阅读标尺",
      readmask: "阅读遮罩",
      highlighthover: "凸显鼠标经过",
      SetTitleColors: "标题颜色",
      textmagnifier: "字体放大",
      readmode: "阅读模式",
      usefullinks: "可用链接",
      selectoption: "请选择",
      highContrast: "高对比度",
      AccessibilityAdjustments: "辅助功能调整",
      ProfileOption: "为您选择正确的辅助功能配置文件",
      ColorAdjust: "色彩调整",
      orientationadjusttitle: "方向调整",
      ContentAdjustments: "内容调整",
      WebADA: "网络无障碍解决方案",
      pleasechoose: "请选择",
      nodatatext: "无数据"
    };
  },
  afdc: function(t, a, e) {
    "use strict";

    e("e959");
  },
  b008: function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAA6pJREFUeF7tnMFy2kAQRLW/hLjH/jLbXxZyR/zSpkigygfYVcIw9KofV6iZ6e5Xg7TCLhMvaweKtXrETwBgDgEAAIC5A+by2QAAYO6AuXw2AACYO2Aunw0AAOYOmMtnAwCAuQPm8tkAAGDugLl8NgAAmDtgLp8NAADmDpjLZwMAgLkD5vLZAABg7oC5fDYAAJg7YC6fDQAA5g6Yy2cDAIC5A+by2QAAYO6AuXw2AACYO2Aunw0AAOYOmMtnAwCAuQPm8tkAAGDugLl8NgAAmDtgLp8NAADmDpjLZwMAgLkD5vLZAADQdmCe55/mHg0tf1mW95aA7gaY57kO7YD58MuyNDMGgI0DAgAbD7gnDwB6Dm38fQDYeMA9eQDQc2jj7wPAxgPuyXs6ALXWr94QzfvQUn5M0/R27zP/Ur+U8tHqtbZWVJ3zLJ1ah1rrrwf9a2p+OgCllPfj8Xj4XxGXg6YmAKfT6bNXf7/fv9Vam4dWPTOuPXpnH2s173a7zx4AvYOalu4IzQ+fA6w1454QAGif1AFArV9sgNsYsAG++RJhBl8BN0CL+j7kK+CmAweuAf4+beQisHeVe+P9iK338ovAs4ie9jV3GRFmXOeImom7gF6yge9HAhA1FgBEObmijigAH6WU1hkG1wArsl31EVEAOAhalV7AhwDgtom908+XXwQGZP+nxAWA3rl48/dxUbNc61yuAc7POu6+7G8Do013qhex9TazAZyC/367+ugDMAAYmBw2wMDhRYwOABEuDlwDAAYOL2J0CQDW/swqQvCTagz9l0+dk8bp6ecATwqFskEOAECQkaOWAYBRkwuaGwCCjBy1DACMmlzQ3AAQZOSoZQBg1OSC5o4AgH8RExTGK8r0Hjd3Hwa9Ymh65jkAAHleS3YCAMlY8oYCgDyvJTsBgGQseUMBQJ7Xkp0AQDKWvKEAIM9ryU4AIBlL3lAAkOe1ZCcAkIwlbygAyPNashMASMaSNxQA5Hkt2QkAJGPJGwoA8ryW7AQAkrHkDQUAeV5LdgIAyVjyhgKAPK8lOwGAZCx5QwFAnteSnQBAMpa8oQAgz2vJTgAgGUveUACQ57VkJwCQjCVvKADI81qyEwBIxpI3FADkeS3ZCQAkY8kbCgDyvJbsBACSseQNBQB5Xkt2AgDJWPKGAoA8ryU7AYBkLHlDAUCe15KdAEAylryhACDPa8lOACAZS95QAJDntWQnAJCMJW8oAMjzWrITAEjGkjcUAOR5LdnpNxyUH5/Xr/lkAAAAAElFTkSuQmCC";
  },
  b3df: function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "kiểm tra",
      new: "Mới",
      open: "Mở ra",
      save: "Cứu",
      download: "Tải xuống",
      about: "Về",
      github: "Github",
      stop: "NGỪNG LẠI",
      animationarea: "Khu vực hoạt hình",
      HideImagesAudioVideoAnimation: "Ẩn Hình ảnh / Âm thanh / Video / Hoạt ảnh",
      AdjustContrast: "Điều chỉnh độ tương phản",
      AdjustFontsize: "Điều chỉnh kích thước phông chữ",
      alignleft: "Căn trái",
      aligncenter: "Căn giữa",
      alignRight: "Sắp xếp đúng",
      seizureSafe: "thu giữ An toàn",
      seizureSafeDetail: "Loại bỏ nhấp nháy và giảm màu sắc",
      StopMedia: "Dừng phương tiện",
      StopVideo: "Dừng video",
      stopAudio: "Ngừng âm thanh",
      stopAnimation: "Ngừng hoạt ảnh",
      SetBackgroundColor: "Đặt màu nền",
      SetTextColors: "Đặt màu văn bản",
      HideImages: "Ẩn hình ảnh",
      HideMedia: "Ẩn Video / Âm thanh",
      HideAnimation: "Ẩn hoạt ảnh",
      lowSaturate: "Bão hòa thấp",
      RESET: "CÀI LẠI",
      clear: "Sạch"
    }, n(i, "seizureSafe", "Két an toàn"), n(i, "cognitivedisability", "Khuyết tật nhận thức"), n(i, "cognitivedisabilityDetail", "Hỗ trợ đọc và tập trung"), n(i, "visionImpaired", "Suy giảm thị lực"), n(i, "visionImpairedDetail", "Cải thiện hình ảnh của trang web"), n(i, "highLighLink", "Liên kết HighLight"), n(i, "highLighTitle", "Tiêu đề HighLight"), n(i, "hightSaturateBtn", "Cao bão hòa"), n(i, "readableFont", "Phông chữ có thể đọc được"), n(i, "ADHDFriendlySlider", "ADHD thân thiện"), n(i, "ADHDFriendlySliderDetail", "Tập trung hơn và ít bị phân tâm hơn"), n(i, "AdjustLineHeight", "Điều chỉnh LineHeight"), n(i, "AdjustScale", "Điều chỉnh quy mô"), n(i, "AdjustLetterSpacing", "Điều chỉnh LetterSpacing"), n(i, "monochrome", "Đơn sắc"), n(i, "darkContrast", "Tương phản tối"), n(i, "lightContrast", "Độ tương phản ánh sáng"), n(i, "muted", "Đã tắt tiếng"), n(i, "bigblackcursor", "Con trỏ đen lớn"), n(i, "bigwhitecursor", "Con trỏ màu trắng lớn"), n(i, "readguide", "Hướng dẫn đọc"), n(i, "readmask", "Mặt nạ đọc"), n(i, "highlighthover", "Đánh dấu Di chuột"), n(i, "SetTitleColors", "Đặt màu tiêu đề"), n(i, "textmagnifier", "Kính lúp văn bản"), n(i, "readmode", "Chế độ đọc"), n(i, "usefullinks", "Liên kết hữu ích"), n(i, "selectoption", "chọn một tùy chọn"), n(i, "highContrast", "Độ tương phản cao"), n(i, "AccessibilityAdjustments", "Điều chỉnh trợ năng"), n(i, "ProfileOption", "Chọn cấu hình trợ năng phù hợp với bạn"), n(i, "ColorAdjust", "Điều chỉnh màu sắc"), n(i, "orientationadjusttitle", "Điều chỉnh định hướng"), n(i, "ContentAdjustments", "Điều chỉnh nội dung"), n(i, "WebADA", "Giải pháp hỗ trợ truy cập web"), n(i, "pleasechoose", "xin vui lòng chọn"), n(i, "nodatatext", "không có dữ liệu"), i);
  },
  b5c4: function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "test",
      new: "nuovo",
      open: "aprire",
      save: "Salva",
      download: "Scarica",
      about: "di",
      github: "Github",
      stop: "fermare",
      animationarea: "Area Animazione",
      HideImagesAudioVideoAnimation: "Nascondi immagini/audio/video/animazione",
      AdjustContrast: "Regola contrasto",
      AdjustFontsize: "Regola la dimensione del carattere",
      alignleft: "Allineare a sinistra",
      aligncenter: "Allinea al centro",
      alignRight: "Allinea a destra",
      seizureSafe: "Sequestro sicuro",
      seizureSafeDetail: "Elimina i flash e riduce il colore",
      StopMedia: "Interrompi media",
      StopVideo: "Interrompi video",
      stopAudio: "Interrompi audio",
      stopAnimation: "Interrompi animazione",
      SetBackgroundColor: "Imposta colore di sfondo",
      SetTextColors: "Imposta i colori del testo",
      HideImages: "Nascondi immagini",
      HideMedia: "Nascondi video/audio",
      HideAnimation: "Nascondi animazione",
      lowSaturate: "Bassa saturazione",
      RESET: "RIPRISTINA",
      clear: "Chiaro"
    }, n(i, "seizureSafe", "Sequestro sicuro"), n(i, "cognitivedisability", "Disabilità cognitiva"), n(i, "cognitivedisabilityDetail", "Aiuta nella lettura e nella messa a fuoco"), n(i, "visionImpaired", "Ipovedenti"), n(i, "visionImpairedDetail", "Migliora la grafica del sito web"), n(i, "highLighLink", "Collegamento in evidenza"), n(i, "highLighTitle", "Evidenzia titolo"), n(i, "hightSaturateBtn", "Saturazione alta"), n(i, "readableFont", "Carattere leggibile"), n(i, "ADHDFriendlySlider", "ADHD amichevole"), n(i, "ADHDFriendlySliderDetail", "Più concentrazione e meno distrazioni"), n(i, "AdjustLineHeight", "Regola l'altezza della linea"), n(i, "AdjustScale", "Regola scala"), n(i, "AdjustLetterSpacing", "Regola la spaziatura delle lettere"), n(i, "monochrome", "Monocromo"), n(i, "darkContrast", "Contrasto scuro"), n(i, "lightContrast", "Contrasto chiaro"), n(i, "muted", "Disattivato"), n(i, "bigblackcursor", "Grande cursore nero"), n(i, "bigwhitecursor", "Grande cursore bianco"), n(i, "readguide", "Guida alla lettura"), n(i, "readmask", "Maschera da lettura"), n(i, "highlighthover", "Evidenzia al passaggio del mouse"), n(i, "SetTitleColors", "Imposta i colori del titolo"), n(i, "textmagnifier", "Lente d'ingrandimento del testo"), n(i, "readmode", "Modalità di lettura"), n(i, "usefullinks", "link utili"), n(i, "selectoption", "seleziona un'opzione"), n(i, "highContrast", "Alto contrasto"), n(i, "AccessibilityAdjustments", "Regolazioni dell'accessibilità"), n(i, "ProfileOption", "Scegli il profilo di accessibilità giusto per te"), n(i, "ColorAdjust", "Regolazione del colore"), n(i, "orientationadjusttitle", "Regolazioni dell'orientamento"), n(i, "ContentAdjustments", "Regolazioni del contenuto"), n(i, "WebADA", "Soluzione per l'accessibilità web"), n(i, "pleasechoose", "si prega di scegliere"), n(i, "nodatatext", "nessun dato"), i);
  },
  b824: function(t, a, e) {},
  bb72: function(t, a, e) {},
  bd05: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  c2ed: function(t, a, e) {
    "use strict";

    e("0f47");
  },
  c6f0: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  c9d1: function(t, a, e) {},
  cce0: function(t, a, e) {},
  ce59: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  d77c: function(t, a, e) {
    "use strict";

    e("3c37");
  },
  d959: function(t, a, e) {},
  d9e8: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  dbb5: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  ddfc: function(t, a, e) {},
  e6fa: function(t, a) {
    t.exports = "data:image/png;base64,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";
  },
  e959: function(t, a, e) {},
  e95a7: function(t, a) {
    t.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAA0tJREFUeF7tlNFtBUEMAjedJZUnpaUFngRCyHPf1tk7jPh6fKcJfJ1+PY9/CHBcAgRAgOMEjj+fBkCA4wSOP58GQIDjBI4/nwZAgOMEjj+fBkCA4wSOP58GQIDjBI4/nwZAgOMEjj+fBkCA4wSOP58GQIDjBI4/nwZAgOMEjj+fBkCA4wSOP58GQIDjBI4/nwZAgOMEjj+fBkCA4wSOP58GQIAZAt/vvV/x2p/33p84q46196t3fjS31ADtANr7PwpWHUYAldR7CKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCziky2A2jvj0ClAXSsCKCzYnKFwFIDrDCduhMBpuLyH4sAfqZTf0SAqbj8xyKAn+nUHxFgKi7/sQjgZzr1RwSYist/LAL4mU79EQGm4vIfiwB+plN/RICpuPzHIoCf6dQfEWAqLv+xCOBnOvVHBJiKy38sAviZTv0RAabi8h+LAH6mU39EgKm4/McigJ/p1B8RYCou/7EI4Gc69UcEmIrLfywC+JlO/REBpuLyH4sAfqZTf0SAqbj8xyKAn+nUHxFgKi7/sQjgZzr1RwSYist/LAL4mU79EQGm4vIf+w8KQfSBsXZh+QAAAABJRU5ErkJggg==";
  },
  f135: function(t, a, e) {},
  f1b6: function(t, a, e) {
    "use strict";

    e("594b");
  },
  f60e: function(t, a, e) {
    "use strict";

    e("f135");
  },
  f9df: function(t, a, e) {
    var i;
    var n = e("9523").default;
    t.exports = (i = {
      test: "test",
      new: "New",
      open: "Open",
      save: "Save",
      download: "Download",
      about: "About",
      github: "Github",
      stop: "STOP",
      animationarea: "Anination Area",
      HideImagesAudioVideoAnimation: "Hide Images/Audio/Video/Animation",
      AdjustContrast: "Adjust Contrast",
      AdjustFontsize: "Adjust Fontsize",
      alignleft: "Align Left",
      aligncenter: "Align Center",
      alignRight: "Align Right",
      seizureSafe: "Seizure Safe",
      seizureSafeDetail: "Eliminates flashes and reduces color",
      StopMedia: "Stop Media",
      StopVideo: "Stop Video",
      stopAudio: "Stop Audio",
      stopAnimation: "Stop Animation",
      SetBackgroundColor: "Set BackgroundColor",
      SetTextColors: "Set Text Colors",
      HideImages: "Hide Images",
      HideMedia: "Hide Video/Audio",
      HideAnimation: "Hide Animation",
      lowSaturate: "Low Saturate",
      RESET: "RESET",
      clear: "Clear"
    }, n(i, "seizureSafe", "Seizure Safe"), n(i, "cognitivedisability", "Cognitive Disability"), n(i, "cognitivedisabilityDetail", "Assists with reading and focusing"), n(i, "visionImpaired", "Vision Impaired"), n(i, "visionImpairedDetail", "Enhances the website's visuals"), n(i, "highLighLink", "Highlight Link"), n(i, "highLighTitle", "Highlight Title"), n(i, "hightSaturateBtn", "High Saturate"), n(i, "readableFont", "Readable Font"), n(i, "ADHDFriendlySlider", "ADHD Friendly"), n(i, "ADHDFriendlySliderDetail", "More focus and fewer distractions"), n(i, "AdjustLineHeight", "Adjust LineHeight"), n(i, "AdjustScale", "Adjust Scale"), n(i, "AdjustLetterSpacing", "Adjust LetterSpacing"), n(i, "monochrome", "Monochrome"), n(i, "darkContrast", "Dark Contrast"), n(i, "lightContrast", "Light Contrast"), n(i, "muted", "Muted"), n(i, "bigblackcursor", "Big Black Cursor"), n(i, "bigwhitecursor", "Big White Cursor"), n(i, "readguide", "Reading Guide"), n(i, "readmask", "Reading Mask"), n(i, "highlighthover", "Highlight Hover"), n(i, "SetTitleColors", "Set Title Colors"), n(i, "textmagnifier", "Text Magnifier"), n(i, "readmode", "Read Mode"), n(i, "usefullinks", "Useful Links"), n(i, "selectoption", "select an option"), n(i, "highContrast", "High Contrast"), n(i, "AccessibilityAdjustments", "Accessibility Adjustments"), n(i, "ProfileOption", "Choose the right accessibility profile for you"), n(i, "ColorAdjust", "Color Adjustment"), n(i, "orientationadjusttitle", "Orientation Adjustments"), n(i, "ContentAdjustments", "Content Adjustments"), n(i, "WebADA", "Web Accessibility Solution"), n(i, "pleasechoose", "please choose"), n(i, "nodatatext", "no data"), i);
  },
  fae2: function(t, a, e) {
    "use strict";

    e("075a");
  }
});