import { createSignal, Show, For, batch } from "solid-js";
import VideoPlayer from "./VideoPlayer";

type VideoFormat =
  | "hls"
  | "dash"
  | "webrtc"
  | "mp4"
  | "rtmp"
  | "rtsp"
  | "srt"
  | "flv"
  | "smooth";

interface StreamResult {
  format: VideoFormat;
  url: string;
  status: "success" | "error" | "loading" | "not-tested";
  timestamp: number;
}

const SAMPLE_STREAMS = {
  hls: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  hlsBackup: [
    "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    "https://playertest.longtailvideo.com/adaptive/bipbop/gear4/prog_index.m3u8",
    "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  ],
  dash: "https://dash.akamaized.net/akamai/test/caption_test/ElephantsDream/elephants_dream_480p_heaac5_1.mpd",
  dashBackup: [
    "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.mpd",
    "https://livesim.dashif.org/livesim/chunkdur_1/ato_7/testpic4_8s/Manifest.mpd",
    "https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd",
  ],
  webrtc: "wss://demo.cloudwebrtc.com:8443/ws",
  webrtcBackup: [
    "wss://webrtc.live-video.net/janus",
    "wss://webrtc-signaling.millicast.com/ws",
    "wss://webrtc.echotest.io/ws",
  ],
  mp4: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  mp4Backup: [
    "https://media.w3.org/2010/05/sintel/trailer.mp4",
    "https://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel.mp4",
  ],
  rtmp: "rtmp://live.twitch.tv/app/",
  rtmpBackup: [
    "rtmp://fms.105.net/live/rmc1",
    "rtmp://streaming.cityofboston.gov/live/cable",
  ],
  rtsp: "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
  rtspBackup: [
    "rtsp://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel.mp4",
    "rtsp://streaming.cityofboston.gov/live/cable",
  ],
  srt: "srt://18.138.248.25:30000",
  srtBackup: [
    "srt://srt-demo.streamroot.io:7001",
    "srt://srt.streamroot.io:1234",
  ],
  flv: "https://samples.mux.dev/big_buck_bunny_720p_1mb.flv",
  flvBackup: [
    "https://dc.demuxed.com/video.flv",
    "https://cdn.jsdelivr.net/gh/mayeaux/videojs-flashls-source-handler/video/test.flv",
    "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-960x540.flv",
  ],
  smooth:
    "https://test.playready.microsoft.com/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/manifest",
  smoothBackup: [
    "https://playready.directtaps.net/smoothstreaming/SSWSS720H264PR/SuperSpeedway_720.ism/Manifest",
    "http://amssamples.streaming.mediaservices.windows.net/49b57c87-f5f3-48b3-ba22-c55cfdffa9cb/Sintel.ism/manifest",
  ],
};

const formatIcons = {
  hls: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  dash: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ),
  webrtc: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  ),
  mp4: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
      />
    </svg>
  ),
  rtmp: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  rtsp: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
    </svg>
  ),
  srt: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  flv: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  smooth: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  ),
};

const StreamTester = () => {
  const [selectedFormat, setSelectedFormat] = createSignal<VideoFormat>("hls");
  const [inputUrl, setInputUrl] = createSignal(SAMPLE_STREAMS.hls);
  const [isTestActive, setIsTestActive] = createSignal(false);
  const [status, setStatus] = createSignal<"success" | "error" | "loading">(
    "loading"
  );
  const [results, setResults] = createSignal<StreamResult[]>([]);
  const [expandedSection, setExpandedSection] = createSignal<
    "form" | "results" | "device-info"
  >("form");
  const [backupUrlIndex, setBackupUrlIndex] = createSignal<number>(-1); // -1 means primary URL

  const formatOptions: {
    value: VideoFormat;
    label: string;
    description: string;
  }[] = [
    {
      value: "hls",
      label: "HLS",
      description:
        "HTTP Live Streaming - Developed by Apple, widely supported by most devices and browsers.",
    },
    {
      value: "dash",
      label: "DASH",
      description:
        "Dynamic Adaptive Streaming over HTTP - Open standard, supports advanced features like multi-language tracks.",
    },
    {
      value: "webrtc",
      label: "WebRTC",
      description:
        "Web Real-Time Communication - Enables peer-to-peer streaming with ultra-low latency.",
    },
    {
      value: "mp4",
      label: "MP4",
      description:
        "Direct MP4 playback - Basic format, widely compatible but not ideal for live streaming.",
    },
    {
      value: "rtmp",
      label: "RTMP",
      description:
        "Real-Time Messaging Protocol - Flash-based protocol used in legacy systems, requires server support.",
    },
    {
      value: "rtsp",
      label: "RTSP",
      description:
        "Real-Time Streaming Protocol - Used for establishing and controlling media sessions, common in security cameras.",
    },
    {
      value: "srt",
      label: "SRT",
      description:
        "Secure Reliable Transport - Open-source protocol optimized for low-latency streaming over unreliable networks.",
    },
    {
      value: "flv",
      label: "FLV",
      description:
        "Flash Video - Legacy format previously used with Adobe Flash Player, still used in some regions.",
    },
    {
      value: "smooth",
      label: "Smooth Streaming",
      description:
        "Microsoft's adaptive streaming format, used in conjunction with IIS Media Services.",
    },
  ];

  // Function to get the current URL based on format and backup index
  const getCurrentUrl = (
    format: VideoFormat,
    backupIndex: number = -1
  ): string => {
    if (backupIndex === -1) {
      return SAMPLE_STREAMS[format] || "";
    }

    const backupKey = `${format}Backup` as keyof typeof SAMPLE_STREAMS;
    const backups = SAMPLE_STREAMS[backupKey] as string[] | undefined;

    if (!backups || backupIndex >= backups.length) {
      return SAMPLE_STREAMS[format] || "";
    }

    return backups[backupIndex];
  };

  // Function to get the number of available backup URLs for a format
  const getBackupCount = (format: VideoFormat): number => {
    const backupKey = `${format}Backup` as keyof typeof SAMPLE_STREAMS;
    const backups = SAMPLE_STREAMS[backupKey] as string[] | undefined;
    return backups?.length || 0;
  };

  // Function to reset all player status variables with a forced cleanup
  const resetPlayStatus = () => {
    // Force video cleanup by setting isTestActive to false first
    setIsTestActive(false);

    // Use setTimeout to ensure the player has time to cleanup
    setTimeout(() => {
      setStatus("loading");

      // Clear the current test result if any
      if (results().length > 0) {
        const updatedResults = [...results()];
        if (updatedResults[0]?.status === "loading") {
          updatedResults.shift();
          setResults(updatedResults);
        }
      }
    }, 50); // Small delay to ensure proper cleanup
  };

  // Function to reset the backup index when changing formats
  const resetBackupIndex = () => {
    setBackupUrlIndex(-1);
  };

  // Add a debounce mechanism for format changes
  let formatChangeTimer: number | null = null;

  const debouncedFormatChange = (format: VideoFormat) => {
    // Clear any pending format change timer
    if (formatChangeTimer) {
      window.clearTimeout(formatChangeTimer);
    }

    // Stop any active test immediately
    setIsTestActive(false);

    // Set the new format and URL with a small delay
    formatChangeTimer = window.setTimeout(() => {
      batch(() => {
        setSelectedFormat(format);
        resetBackupIndex();
        setInputUrl(SAMPLE_STREAMS[format] || "");
      });
    }, 100);
  };

  // Debounced URL change handler
  let urlChangeTimer: number | null = null;

  const debouncedUrlChange = (url: string, resetBackup: boolean = true) => {
    // Clear any pending URL change timer
    if (urlChangeTimer) {
      window.clearTimeout(urlChangeTimer);
    }

    // Stop any active test immediately
    setIsTestActive(false);

    // Set the new URL with a small delay
    urlChangeTimer = window.setTimeout(() => {
      batch(() => {
        setInputUrl(url);
        if (resetBackup) {
          resetBackupIndex();
        }
      });
    }, 100);
  };

  const handleUrlChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    debouncedUrlChange(target.value);
  };

  const handleStartTest = () => {
    if (!inputUrl()) {
      alert("Please enter a valid URL for testing");
      return;
    }

    batch(() => {
      setIsTestActive(true);
      setStatus("loading");

      // Add this test to results
      const newResult: StreamResult = {
        format: selectedFormat(),
        url: inputUrl(),
        status: "loading",
        timestamp: Date.now(),
      };

      setResults((prev) => [newResult, ...prev].slice(0, 10)); // Keep last 10 results
    });
  };

  const handleStatusChange = (newStatus: "success" | "error" | "loading") => {
    setStatus(newStatus);

    // Update the current test result with the new status
    setResults((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = { ...updated[0], status: newStatus };
      }
      return updated;
    });

    // If error and not already using a backup, try a backup URL automatically
    if (newStatus === "error" && !isTestActive()) {
      const format = selectedFormat();
      const backupCount = getBackupCount(format);

      if (backupCount > 0 && backupUrlIndex() === -1) {
        // Try the first backup URL
        setBackupUrlIndex(0);
        setInputUrl(getCurrentUrl(format, 0));
        handleStartTest();
      }
    }
  };

  const handleStopTest = () => {
    setIsTestActive(false);
  };

  const handleTestAll = async () => {
    // Reset status before starting tests
    resetPlayStatus();

    batch(async () => {
      // Test each format one by one
      for (const format of formatOptions.map((opt) => opt.value)) {
        const url = getCurrentUrl(format);
        batch(() => {
          setSelectedFormat(format);
          resetBackupIndex();
          setInputUrl(url);
        });

        if (!url) {
          continue; // Skip if no URL available
        }

        batch(() => {
          setIsTestActive(true);
          setStatus("loading");

          const newResult: StreamResult = {
            format,
            url,
            status: "loading",
            timestamp: Date.now(),
          };

          setResults((prev) => [newResult, ...prev].slice(0, 10));
        });

        // Wait for 10 seconds or until status changes from loading
        await new Promise<void>((resolve) => {
          let timeout: ReturnType<typeof setTimeout>;

          const checkStatus = () => {
            if (status() !== "loading") {
              clearTimeout(timeout);
              resolve();
            }
          };

          // Check status every 500ms
          const interval = setInterval(checkStatus, 500);

          // Force resolve after 10 seconds
          timeout = setTimeout(() => {
            clearInterval(interval);
            handleStatusChange("error"); // Assume error if timeout
            resolve();
          }, 10000);
        });

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setIsTestActive(false);
    });
  };

  const getStatusBadge = (
    status: "success" | "error" | "loading" | "not-tested"
  ) => {
    switch (status) {
      case "success":
        return (
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <svg
              class="mr-1 h-3 w-3 text-emerald-500"
              fill="currentColor"
              viewBox="0 0 8 8"
            >
              <circle cx="4" cy="4" r="3" />
            </svg>
            Compatible
          </span>
        );
      case "error":
        return (
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg
              class="mr-1 h-3 w-3 text-red-500"
              fill="currentColor"
              viewBox="0 0 8 8"
            >
              <circle cx="4" cy="4" r="3" />
            </svg>
            Not Compatible
          </span>
        );
      case "loading":
        return (
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg
              class="mr-1.5 h-2 w-2 text-yellow-500 animate-pulse"
              fill="currentColor"
              viewBox="0 0 8 8"
            >
              <circle cx="4" cy="4" r="3" />
            </svg>
            Testing...
          </span>
        );
      default:
        return (
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <svg
              class="mr-1.5 h-2 w-2 text-gray-400"
              fill="currentColor"
              viewBox="0 0 8 8"
            >
              <circle cx="4" cy="4" r="3" />
            </svg>
            Not Tested
          </span>
        );
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div class="space-y-6">
      {/* Format tester card */}
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Stream Format Tester
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Test compatibility with various streaming formats
            </p>
          </div>
          <button
            onClick={() =>
              setExpandedSection(
                expandedSection() === "form" ? "results" : "form"
              )
            }
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {expandedSection() === "form" ? (
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              ) : (
                <path
                  fill-rule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clip-rule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>

        <Show when={expandedSection() === "form"}>
          <div class="card-body space-y-4 sm:space-y-6">
            {/* Format selection */}
            <div>
              <div class="mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                  Select Stream Format
                </h3>
                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Choose the streaming protocol you want to test
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <For each={formatOptions}>
                  {(format) => (
                    <div
                      class={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedFormat() === format.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                      onClick={() => {
                        if (!isTestActive()) {
                          debouncedFormatChange(format.value);
                        }
                      }}
                    >
                      <div class="flex items-center mb-2">
                        <div
                          class={`mr-2 ${
                            selectedFormat() === format.value
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatIcons[format.value]}
                        </div>
                        <h4
                          class={`font-medium ${
                            selectedFormat() === format.value
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {format.label}
                        </h4>
                      </div>
                      <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {format.description}
                      </p>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* URL input with backup selection */}
            <div>
              <label for="url-input" class="form-label">
                Stream URL
              </label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  id="url-input"
                  type="text"
                  class="form-input"
                  value={inputUrl()}
                  onInput={handleUrlChange}
                  disabled={isTestActive()}
                  placeholder="Enter stream URL..."
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetBackupIndex();
                      debouncedUrlChange(
                        SAMPLE_STREAMS[selectedFormat()] || "",
                        false
                      );
                    }}
                    class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors sm:w-auto w-full"
                    disabled={!SAMPLE_STREAMS[selectedFormat()]}
                  >
                    Primary URL
                  </button>

                  <div class="relative">
                    <button
                      type="button"
                      onClick={() => {
                        const currentFormat = selectedFormat();
                        const backupCount = getBackupCount(currentFormat);

                        if (backupCount > 0) {
                          const nextIndex =
                            (backupUrlIndex() + 1) % backupCount;
                          setBackupUrlIndex(nextIndex);
                          debouncedUrlChange(
                            getCurrentUrl(currentFormat, nextIndex),
                            false
                          );
                        }
                      }}
                      class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors sm:w-auto w-full"
                      disabled={getBackupCount(selectedFormat()) === 0}
                    >
                      Backup URL{" "}
                      {backupUrlIndex() >= 0 ? backupUrlIndex() + 1 : ""}
                    </button>
                    {getBackupCount(selectedFormat()) > 0 && (
                      <span class="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {getBackupCount(selectedFormat())}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div class="flex items-center mt-2">
                <div class="h-1 flex-grow bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500"
                    style={{
                      width: `${
                        backupUrlIndex() === -1
                          ? 100
                          : ((backupUrlIndex() + 1) * 100) /
                            (getBackupCount(selectedFormat()) || 1)
                      }%`,
                    }}
                  ></div>
                </div>
                <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {backupUrlIndex() === -1
                    ? "Primary"
                    : `Backup ${backupUrlIndex() + 1}/${getBackupCount(
                        selectedFormat()
                      )}`}
                </span>
              </div>

              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the URL of the stream you want to test or use provided
                samples
              </p>
            </div>

            {/* Action buttons */}
            <div class="flex flex-wrap gap-2 sm:gap-3">
              <button
                class="btn btn-primary"
                onClick={handleStartTest}
                disabled={isTestActive()}
              >
                <svg
                  class="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
                </svg>
                Start Test
              </button>

              <button
                class="btn btn-success"
                onClick={handleTestAll}
                disabled={isTestActive()}
              >
                <svg
                  class="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6L9 16.2Z"
                    fill="currentColor"
                  />
                </svg>
                Test All Formats
              </button>

              <Show when={isTestActive()}>
                <button class="btn btn-danger" onClick={handleStopTest}>
                  <svg
                    class="w-4 h-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      fill="currentColor"
                    />
                  </svg>
                  Stop Test
                </button>
              </Show>
            </div>

            {/* Active test */}
            <Show when={isTestActive()}>
              <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Testing{" "}
                  {
                    formatOptions.find((opt) => opt.value === selectedFormat())
                      ?.label
                  }{" "}
                  Stream
                </h3>
                <VideoPlayer
                  format={selectedFormat()}
                  url={inputUrl()}
                  onStatusChange={handleStatusChange}
                />

                <Show
                  when={
                    status() === "error" && getBackupCount(selectedFormat()) > 0
                  }
                >
                  <div class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p class="text-sm text-red-700 dark:text-red-400 mb-3">
                      Stream failed to load. Try another source:
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        class="px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-md bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          batch(() => {
                            resetBackupIndex();
                            debouncedUrlChange(
                              SAMPLE_STREAMS[selectedFormat()] || "",
                              false
                            );
                            handleStartTest();
                          });
                        }}
                      >
                        Try Primary Source
                      </button>

                      <button
                        class="px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-md bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          const format = selectedFormat();
                          const backupCount = getBackupCount(format);

                          if (backupCount > 0) {
                            const nextIndex =
                              (backupUrlIndex() + 1) % backupCount;
                            batch(() => {
                              setBackupUrlIndex(nextIndex);
                              debouncedUrlChange(
                                getCurrentUrl(format, nextIndex),
                                false
                              );
                              // Small delay before starting test to allow URL change to propagate
                              setTimeout(() => handleStartTest(), 150);
                            });
                          }
                        }}
                      >
                        Try Next Backup Source (
                        {((backupUrlIndex() + 1) %
                          getBackupCount(selectedFormat())) +
                          1}
                        /{getBackupCount(selectedFormat())})
                      </button>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Results card */}
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Test Results
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Historical results from your tests
            </p>
          </div>
          <button
            onClick={() =>
              setExpandedSection(
                expandedSection() === "results" ? "form" : "results"
              )
            }
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {expandedSection() === "results" ? (
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              ) : (
                <path
                  fill-rule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clip-rule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>

        <Show when={expandedSection() === "results"}>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Format
                  </th>
                  <th class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                    URL
                  </th>
                  <th class="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {results().length > 0 ? (
                  results().map((result) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td class="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(result.timestamp)}
                      </td>
                      <td class="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="mr-2 text-gray-500 dark:text-gray-400">
                            {formatIcons[result.format]}
                          </div>
                          <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {
                              formatOptions.find(
                                (opt) => opt.value === result.format
                              )?.label
                            }
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-3 sm:px-6 sm:py-4 hidden sm:table-cell">
                        <div
                          class="max-w-xs truncate text-xs sm:text-sm text-gray-500 dark:text-gray-400"
                          title={result.url}
                        >
                          {result.url}
                        </div>
                      </td>
                      <td class="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                        {getStatusBadge(result.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colspan="4"
                      class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      <div class="flex flex-col items-center">
                        <svg
                          class="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p>No tests run yet</p>
                        <p class="mt-1 text-xs">
                          Run a test to see results here
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      {/* Device information card */}
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Device Information
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Technical details about your current device
            </p>
          </div>
          <button
            onClick={() =>
              setExpandedSection(
                expandedSection() === "device-info" ? "form" : "device-info"
              )
            }
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {expandedSection() === "device-info" ? (
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              ) : (
                <path
                  fill-rule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clip-rule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>

        <Show when={expandedSection() === "device-info"}>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Browser Details
                  </h3>
                  <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        User Agent
                      </p>
                    </div>
                    <div class="p-4 bg-white dark:bg-gray-900">
                      <p
                        class="text-sm text-gray-600 dark:text-gray-400 break-words font-mono"
                        id="user-agent"
                      >
                        Loading...
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Window Size
                      </p>
                    </div>
                    <div class="p-4 bg-white dark:bg-gray-900">
                      <p
                        class="text-sm text-gray-600 dark:text-gray-400 font-mono"
                        id="window-size"
                      >
                        Loading...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Media Capabilities
                </h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center">
                      <svg
                        class="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 10L19.553 7.724C19.7474 7.62281 19.9695 7.58341 20.1876 7.61123C20.4058 7.63904 20.6099 7.73283 20.7751 7.88253C20.9403 8.03223 21.0582 8.23047 21.1119 8.44967C21.1655 8.66887 21.1524 8.90018 21.074 9.111L19 15M18 16H21M3 8H6C6.53043 8 7.03914 8.21071 7.41421 8.58579C7.78929 8.96086 8 9.46957 8 10V18C8 18.5304 7.78929 19.0391 7.41421 19.4142C7.03914 19.7893 6.53043 20 6 20H3C2.46957 20 1.96086 19.7893 1.58579 19.4142C1.21071 19.0391 1 18.5304 1 18V10C1 9.46957 1.21071 8.96086 1.58579 8.58579C1.96086 8.21071 2.46957 8 3 8ZM13 8H10C9.46957 8 8.96086 8.21071 8.58579 8.58579C8.21071 8.96086 8 9.46957 8 10V18C8 18.5304 8.21071 19.0391 8.58579 19.4142C8.96086 19.7893 9.46957 20 10 20H13C13.5304 20 14.0391 19.7893 14.4142 19.4142C14.7893 19.0391 15 18.5304 15 18V10C15 9.46957 14.7893 8.96086 14.4142 8.58579C14.0391 8.21071 13.5304 8 13 8Z"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        HLS Native Support
                      </span>
                    </div>
                    <span class="text-sm font-mono" id="hls-support">
                      Loading...
                    </span>
                  </div>

                  <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center">
                      <svg
                        class="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 10H4V20H8M8 10V20M8 10L14 4M18 8H14V18H18M18 8V18M18 8L22 12"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        WebRTC Support
                      </span>
                    </div>
                    <span class="text-sm font-mono" id="webrtc-support">
                      Loading...
                    </span>
                  </div>

                  <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center">
                      <svg
                        class="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19.5 12C19.5 13.972 18.8152 15.3734 17.6683 16.5183C16.5197 17.665 14.875 18.5 13 18.5H11C9.125 18.5 7.48025 17.665 6.33175 16.5183C5.18484 15.3734 4.5 13.972 4.5 12C4.5 10.028 5.18484 8.62658 6.33175 7.48175C7.48025 6.335 9.125 5.5 11 5.5H13C14.875 5.5 16.5197 6.335 17.6683 7.48175C18.8152 8.62658 19.5 10.028 19.5 12Z"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M10 9.5L14 9.5"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M10 14.5L14 14.5"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        Media Source Extensions
                      </span>
                    </div>
                    <span class="text-sm font-mono" id="mse-support">
                      Loading...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default StreamTester;
