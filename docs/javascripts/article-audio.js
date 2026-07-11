(function () {
    function findArticleVideo(root) {
        var videoId = root && root.dataset ? root.dataset.videoId : "";
        if (!videoId) {
            return null;
        }
        return document.getElementById(videoId);
    }

    function pauseMedia(media) {
        if (media && typeof media.pause === "function") {
            media.pause();
        }
    }

    function safePlay(media) {
        var promise;
        if (!media || typeof media.play !== "function") {
            return;
        }
        promise = media.play();
        if (promise && typeof promise.catch === "function") {
            promise.catch(function () {});
        }
    }

    function pauseOtherMedia(active, companion) {
        Array.prototype.forEach.call(document.querySelectorAll("audio, video"), function (media) {
            if (media !== active && media !== companion) {
                pauseMedia(media);
            }
        });
    }

    function bindArticleAudio(root) {
        var video;

        if (!root || root.dataset.articleAudioBound === "true") {
            return;
        }

        video = findArticleVideo(root);
        if (!video) {
            return;
        }

        root.dataset.articleAudioBound = "true";

        Array.prototype.forEach.call(root.querySelectorAll("audio"), function (audio) {
            audio.addEventListener("play", function () {
                pauseOtherMedia(audio, null);
            });
        });

        video.addEventListener("play", function () {
            pauseOtherMedia(video, null);
        });
    }

    function initArticleAudio(root) {
        var scope = root || document;
        Array.prototype.forEach.call(scope.querySelectorAll(".s5-article-audio[data-video-id]"), bindArticleAudio);
    }

    if (typeof document$ !== "undefined" && document$.subscribe) {
        document$.subscribe(function () {
            initArticleAudio(document);
        });
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initArticleAudio(document);
        });
    } else {
        initArticleAudio(document);
    }

    if (typeof window !== "undefined") {
        window.__s5ArticleAudioInit = initArticleAudio;
        window.__s5ArticleAudioPauseOtherMedia = pauseOtherMedia;
        window.__s5ArticleAudioFindVideo = findArticleVideo;
        window.__s5ArticleAudioPlay = safePlay;
        window.__s5ArticleAudioPause = pauseMedia;
        window.__s5ArticleAudioBind = bindArticleAudio;
    }
})();
