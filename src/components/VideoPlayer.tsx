import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import Hls from "hls.js";
import * as dashjs from "dashjs";
// @ts-ignore - Importing shaka-player, which may have type issues
import shaka from "shaka-player";

type VideoFormat = "hls" | "dash" | "webrtc" | "mp4";

interface VideoPlayerProps {
  url: string;
  format: VideoFormat;
  onStatusChange: (status: "success" | "error" | "loading") => void;
}

const VideoPlayer = (props: VideoPlayerProps) => {
  let videoRef: HTMLVideoElement | undefined;
  let hlsInstance: Hls | null = null;
  let dashInstance: dashjs.MediaPlayerClass | null = null;
  let shakaInstance: shaka.Player | null = null;

  const [status, setStatus] = createSignal<"success" | "error" | "loading">(
    "loading"
  );
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [isBuffering, setIsBuffering] = createSignal(false);

  const initializePlayer = () => {
    if (!videoRef) return;

    // Clean up any existing instances
    destroyPlayers();

    // Reset video element
    videoRef.src = "";
    setStatus("loading");
    props.onStatusChange("loading");

    try {
      switch (props.format) {
        case "hls":
          initHLS();
          break;
        case "dash":
          initDASH();
          break;
        case "webrtc":
          // WebRTC requires a signaling server and peer connection setup
          // This is a placeholder for WebRTC implementation
          videoRef.src = props.url;
          break;
        case "mp4":
          // Direct playback for MP4 and other natively supported formats
          videoRef.src = props.url;
          break;
        default:
          throw new Error(`Unsupported format: ${props.format}`);
      }
    } catch (error) {
      console.error("Error initializing player:", error);
      setStatus("error");
      props.onStatusChange("error");
    }
  };

  const initHLS = () => {
    if (!videoRef) return;

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsInstance.attachMedia(videoRef);
      hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
        hlsInstance?.loadSource(props.url);
      });

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef
          ?.play()
          .then(() => {
            setStatus("success");
            props.onStatusChange("success");
          })
          .catch((error) => {
            console.error("Error playing HLS:", error);
            setStatus("error");
            props.onStatusChange("error");
          });
      });

      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("Fatal HLS error:", data);
          setStatus("error");
          props.onStatusChange("error");
        }
      });
    } else if (videoRef.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari which has native HLS support
      videoRef.src = props.url;
      videoRef.addEventListener("loadedmetadata", () => {
        videoRef
          ?.play()
          .then(() => {
            setStatus("success");
            props.onStatusChange("success");
          })
          .catch((error) => {
            console.error("Error playing HLS in Safari:", error);
            setStatus("error");
            props.onStatusChange("error");
          });
      });
    } else {
      console.error("HLS is not supported on this browser");
      setStatus("error");
      props.onStatusChange("error");
    }
  };

  const initDASH = () => {
    if (!videoRef) return;

    try {
      dashInstance = dashjs.MediaPlayer().create();
      dashInstance.initialize(videoRef, props.url, true);
      dashInstance.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, () => {
        setStatus("success");
        props.onStatusChange("success");
      });
      dashInstance.on(dashjs.MediaPlayer.events.ERROR, () => {
        console.error("DASH playback error");
        setStatus("error");
        props.onStatusChange("error");
      });
    } catch (error) {
      console.error("Error initializing DASH player:", error);
      setStatus("error");
      props.onStatusChange("error");
    }
  };

  const destroyPlayers = () => {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (dashInstance) {
      dashInstance.reset();
      dashInstance = null;
    }

    if (shakaInstance) {
      shakaInstance.destroy();
      shakaInstance = null;
    }
  };

  // Update video time tracking
  const handleTimeUpdate = () => {
    if (videoRef) {
      setCurrentTime(videoRef.currentTime);
      setDuration(videoRef.duration || 0);
    }
  };

  // Track buffering state
  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => setIsBuffering(false);

  createEffect(() => {
    // Re-initialize when URL or format changes
    if (props.url && props.format) {
      initializePlayer();
    }
  });

  onMount(() => {
    // Initialize shaka player once
    shaka.polyfill.installAll();
  });

  onCleanup(() => {
    destroyPlayers();
  });

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (status()) {
      case "success":
        return "bg-emerald-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-yellow-500 animate-pulse";
    }
  };

  const getStatusText = () => {
    switch (status()) {
      case "success":
        return "Stream is playing";
      case "error":
        return "Error loading stream";
      default:
        return "Loading stream...";
    }
  };

  return (
    <div class="w-full rounded-xl overflow-hidden bg-gray-900 shadow-lg">
      {/* Video container with aspect ratio */}
      <div class="relative aspect-video bg-black">
        <video
          ref={videoRef}
          class="w-full h-full object-contain"
          controls
          autoplay
          muted
          playsinline
          onTimeUpdate={handleTimeUpdate}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onError={() => {
            setStatus("error");
            props.onStatusChange("error");
          }}
        />

        {/* Buffering indicator */}
        {isBuffering() && (
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Stream status indicator */}
        <div class="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-60 px-3 py-1.5 rounded-full">
          <div class={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <span class="text-xs text-white font-medium">{getStatusText()}</span>
        </div>
      </div>

      {/* Video info bar */}
      <div class="bg-gray-800 text-gray-300 px-4 py-2 flex justify-between items-center text-xs">
        <div>
          <span class="font-medium">Format:</span> {props.format.toUpperCase()}
        </div>
        <div>
          <span class="font-medium">Time:</span> {formatTime(currentTime())}/
          {formatTime(duration())}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
