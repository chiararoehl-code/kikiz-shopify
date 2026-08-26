/**
 * Hero video accessibility: respects prefers-reduced-motion by pausing the
 * autoplaying hero video(s) on its/their first frame instead of looping.
 * Does not touch cart, fulfillment, or any commerce logic — display-only.
 */
(function () {
  var videos = document.querySelectorAll('[data-hero-video] .hero-video__el');
  if (!videos.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduceMotion || !reduceMotion.matches) return;

  videos.forEach(function (video) {
    video.removeAttribute('autoplay');
    video.pause();
    video.currentTime = 0;
  });
})();
