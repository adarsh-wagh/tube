# SasaTube 🐰

A cute, responsive video library built with HTML, CSS and vanilla JavaScript. The website is hosted on GitHub Pages; video files live in a private Amazon S3 bucket and are delivered through CloudFront.

## How the video library works

SasaTube fetches its video list from the AWS-generated manifest:

`https://dlu5wffgv2ene.cloudfront.net/videos-manifest.json`

The Lambda function `sasatube-video-manifest` scans the S3 `videos/` prefix and writes the manifest at the bucket root. S3 event notifications invoke Lambda when `.mp4` files are created or deleted.

## Add a video

1. Open the S3 bucket `netflix-dbt-project-96`.
2. Open the `videos/` folder.
3. Upload an `.mp4` file.
4. Wait for the S3 event to invoke Lambda and update `videos-manifest.json`.
5. Refresh SasaTube. The video should appear automatically.

The filename becomes the title. For example, `summer_walk.mp4` displays as **summer walk**. A generic placeholder thumbnail is used until custom thumbnail support is added.

To remove a video, delete its MP4 from `videos/`. Lambda regenerates the manifest and removes it from the library.

## AWS configuration

- S3 bucket: `netflix-dbt-project-96` (region `ap-south-1`)
- Video prefix: `videos/`
- Manifest key: `videos-manifest.json`
- CloudFront domain: `dlu5wffgv2ene.cloudfront.net`
- Manifest URL: `https://dlu5wffgv2ene.cloudfront.net/videos-manifest.json`
- Lambda: `sasatube-video-manifest`

Keep the S3 bucket private. CloudFront should access it using Origin Access Control (OAC). The manifest behavior should use the `CachingDisabled` cache policy. S3 CORS must allow the GitHub Pages website origin (or `*` for this personal setup).

## Deploy to GitHub Pages

1. Extract this project.
2. Push the contents of the `bunnytube/` folder to the root of your GitHub repository.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Push to the `main` branch. The included workflow deploys the static website.

The GitHub Actions workflow does not need AWS credentials and does not upload videos. AWS handles the video library independently.

## Features

- Native HTML5 video playback with custom controls
- Play/pause, seek, volume, mute, playback speed, fullscreen and 10-second skip
- Keyboard shortcuts and shortcut guide
- Dynamic video library, search, favorites, history and sorting
- Playlist, autoplay, shuffle, repeat, next and previous
- Local playback-position memory
- Optional WebVTT subtitle support in the player
- Theater mode and mini-player
- Responsive layout and reduced-motion support

Favorites, history and resume positions are stored in each browser's local storage; they do not sync between viewers.

## Important notes

- Anyone who can access the CloudFront video URLs can watch the videos. OAC protects direct S3 access; it does not restrict CloudFront viewers.
- S3 and CloudFront usage may incur AWS charges. Monitor your AWS billing dashboard.
- The current Lambda manifest includes `.mp4` files. Other formats need to be added to the Lambda filter before they will appear.
- The current Lambda manifest does not generate thumbnails or video durations. SasaTube uses a placeholder thumbnail and displays a generic duration label.


## Player overlay fix

The player explicitly hides its empty-state welcome overlay when a video source is selected or playback metadata loads. CSS also enforces the HTML `hidden` attribute so the overlay cannot cover a playing video.


## Player display and auto-hide

The video frame and letterboxing use a black background. While a video is playing, the control bar hides after 3 seconds without mouse or touch activity. Moving the mouse or touching the player reveals the controls; controls remain visible while playback is paused.


## Color theme

The interface uses a soft lavender and light-pink pastel palette, while the video viewport remains pure black for comfortable viewing.
