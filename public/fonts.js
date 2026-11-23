// Turn on the Google Fonts stylesheet once it has loaded, so it never blocks the first paint.
(function () {
  var l = document.getElementById("gfonts");
  if (!l) return;
  var on = function () { l.media = "all"; };
  if (l.sheet) on();
  else l.addEventListener("load", on);
})();
