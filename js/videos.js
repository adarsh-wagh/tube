// SasaTube loads its library from the AWS-generated manifest.
// The manifest is rebuilt by Lambda whenever an MP4 is uploaded or deleted in S3.
(() => {
  const MANIFEST_URL = "https://dlu5wffgv2ene.cloudfront.net/videos-manifest.json";
  const FALLBACK_THUMBNAIL = "thumbnails/coming-soon.svg";

  window.BUNNY_VIDEOS = [];

  window.BUNNY_VIDEOS_READY = fetch(MANIFEST_URL, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Video manifest request failed: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const entries = Array.isArray(data) ? data : (Array.isArray(data.videos) ? data.videos : []);

      window.BUNNY_VIDEOS = entries
        .filter(item => item && (item.url || item.src))
        .map((item, index) => {
          const source = item.url || item.src;
          const filename = item.filename || source.split("/").pop() || `video-${index + 1}.mp4`;
          const title = item.title || filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");

          return {
            id: item.id || item.key || `video-${index + 1}`,
            title,
            description: item.description || "",
            src: source,
            thumbnail: item.thumbnail || item.thumbnailUrl || FALLBACK_THUMBNAIL,
            duration: item.duration || "Video",
            category: item.category || "Your videos",
            added: item.lastModified ? Date.parse(item.lastModified) || 0 : (item.added || 0),
            subtitles: Array.isArray(item.subtitles) ? item.subtitles : []
          };
        });
    })
    .catch(error => {
      console.error("Could not load the SasaTube video library:", error);
      window.BUNNY_VIDEOS = [];
    });
})();
