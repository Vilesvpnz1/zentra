(function () {
  var THUMB_QUEUE_MAX = 24;
  var THUMB_LOAD_MS = 16000;
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

  function lazyRootMargin() {
    if (document.body && document.body.classList.contains("ent-standalone-movies")) {
      return "1200px 0px";
    }
    return "1600px 0px";
  }

  function isNearViewport(el, margin) {
    if (!el || !el.getBoundingClientRect) return false;
    var rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return false;
    var pad = margin == null ? 1200 : margin;
    return rect.bottom >= -pad && rect.top <= window.innerHeight + pad;
  }

  function getLazyThumbObserver() {
    if (lazyThumbObserver) return lazyThumbObserver;
    lazyThumbObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var thumb = entry.target;
          var start = thumb.__thumbStart;
          if (!start) return;
          thumb.__thumbStart = null;
          lazyThumbObserver.unobserve(thumb);
          start(0);
        });
      },
      { rootMargin: lazyRootMargin(), threshold: 0.01 }
    );
    return lazyThumbObserver;
  }

  function bindCover(thumb, index, primary, fallback, opts) {
    opts = opts || {};
    var href = primary || "";
    var fb = fallback || "";
    var lowData = document.body && document.body.classList.contains("fx-low-data");
    if (!href) return;
    var imgW = opts.width || 320;
    var imgH = opts.height || 320;
    var startLoad = function (priority) {
      if (thumb.__thumbLoaded) return;
      thumb.__thumbLoaded = true;
      var loadPriority = priority != null ? priority : opts.eager ? 0 : index + 400;
      scheduleThumbLoad(loadPriority, function (done) {
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
        img.width = lowData ? Math.min(imgW, 240) : imgW;
        img.height = lowData ? Math.min(imgH, 240) : imgH;
        img.sizes = opts.sizes || "(min-width: 1200px) 280px, (min-width: 900px) 220px, 40vw";
        img.decoding = index < 32 && !lowData ? "sync" : "async";
        img.loading = opts.eager || index < (lowData ? 20 : 72) ? "eager" : "lazy";
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
    if (opts.eager) {
      startLoad(0);
      return;
    }
    thumb.__thumbStart = startLoad;
    getLazyThumbObserver().observe(thumb);
    requestAnimationFrame(function () {
      if (!thumb.__thumbStart) return;
      if (!isNearViewport(thumb)) return;
      var start = thumb.__thumbStart;
      thumb.__thumbStart = null;
      lazyThumbObserver.unobserve(thumb);
      start(0);
    });
  }

  function kickVisible(thumbs) {
    if (!Array.isArray(thumbs) || !thumbs.length) return;
    thumbs.forEach(function (thumb) {
      if (!thumb || !thumb.__thumbStart) return;
      if (!isNearViewport(thumb)) return;
      var start = thumb.__thumbStart;
      thumb.__thumbStart = null;
      if (lazyThumbObserver) lazyThumbObserver.unobserve(thumb);
      start(0);
    });
  }

  window.KobranEntThumb = {
    bindCover: bindCover,
    kickVisible: kickVisible,
  };
})();
