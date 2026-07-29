(function () {
  var THUMB_QUEUE_MAX = 40;
  var THUMB_LOAD_MS = 12000;
  var thumbQueue = [];
  var thumbQueueActive = 0;
  var lazyThumbObserver = null;

  function drainThumbQueue() {
    if (thumbQueueActive >= THUMB_QUEUE_MAX || !thumbQueue.length) return;
    thumbQueue.sort(function (a, b) {
      return a.priority - b.priority;
    });
    while (thumbQueueActive < THUMB_QUEUE_MAX && thumbQueue.length) {
      var job = thumbQueue.shift();
      thumbQueueActive++;
      job.run(function () {
        thumbQueueActive--;
        drainThumbQueue();
      });
    }
  }

  function scheduleThumbLoad(priority, run) {
    if (priority < 200) {
      run(function () {});
      return;
    }
    thumbQueue.push({ priority: priority, run: run });
    drainThumbQueue();
  }

  function getLazyThumbObserver() {
    if (lazyThumbObserver) return lazyThumbObserver;
    lazyThumbObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var start = entry.target.__thumbStart;
          if (start) start();
          lazyThumbObserver.unobserve(entry.target);
          entry.target.__thumbStart = null;
        });
      },
      { rootMargin: "1600px 0px", threshold: 0.01 }
    );
    return lazyThumbObserver;
  }

  function bindCover(thumb, index, primary, fallback) {
    var href = primary || "";
    var fb = fallback || "";
    var lowData = document.body && document.body.classList.contains("fx-low-data");
    if (!href) return;
    var startLoad = function () {
      if (thumb.__thumbLoaded) return;
      thumb.__thumbLoaded = true;
      scheduleThumbLoad(index, function (done) {
        var settled = false;
        var loadTimer = null;
        function finish() {
          if (settled) return;
          settled = true;
          if (loadTimer) clearTimeout(loadTimer);
          done();
        }
        function armTimer(img) {
          if (loadTimer) clearTimeout(loadTimer);
          loadTimer = setTimeout(function () {
            if (settled) return;
            if (img.parentNode) img.remove();
            thumb.classList.remove("site__card-thumb--has-img");
            finish();
          }, THUMB_LOAD_MS);
        }
        var img = document.createElement("img");
        img.className = "site__card-img";
        img.alt = "";
        img.width = lowData ? 180 : 320;
        img.height = lowData ? 180 : 320;
        img.decoding = index < 32 && !lowData ? "sync" : "async";
        img.loading = index < (lowData ? 20 : 72) ? "eager" : "lazy";
        if (!lowData && index < 32) img.fetchPriority = "high";
        else if (!lowData && index < 80) img.fetchPriority = "auto";
        img.addEventListener(
          "load",
          function () {
            thumb.classList.add("site__card-thumb--has-img");
            var initial = thumb.querySelector(".movies-card__initial");
            if (initial) initial.remove();
            finish();
          },
          { once: true }
        );
        img.addEventListener(
          "error",
          function () {
            if (fb && img.src !== fb && fb !== href) {
              armTimer(img);
              img.src = fb;
              return;
            }
            if (img.parentNode) img.remove();
            thumb.classList.remove("site__card-thumb--has-img");
            finish();
          },
          { once: false }
        );
        thumb.insertBefore(img, thumb.firstChild);
        armTimer(img);
        img.src = href;
      });
    };
    if (index < (lowData ? 40 : 120)) {
      startLoad();
      return;
    }
    thumb.__thumbStart = startLoad;
    getLazyThumbObserver().observe(thumb);
  }

  window.KobranEntThumb = {
    bindCover: bindCover,
  };
})();
