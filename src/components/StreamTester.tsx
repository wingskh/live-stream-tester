import { createSignal, Show } from "solid-js";
import VideoPlayer from "./VideoPlayer";

type VideoFormat = "hls" | "dash" | "webrtc" | "mp4";

interface StreamResult {
  format: VideoFormat;
  url: string;
  status: "success" | "error" | "loading" | "not-tested";
}

const SAMPLE_STREAMS = {
  hls: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  dash: "https://dash.akamaized.net/akamai/test/caption_test/ElephantsDream/elephants_dream_480p_heaac5_1.mpd",
  webrtc: "",
  mp4: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
};

const StreamTester = () => {
  const [selectedFormat, setSelectedFormat] = createSignal<VideoFormat>("hls");
  const [inputUrl, setInputUrl] = createSignal(SAMPLE_STREAMS.hls);
  const [isTestActive, setIsTestActive] = createSignal(false);
  const [status, setStatus] = createSignal<"success" | "error" | "loading">(
    "loading"
  );
  const [results, setResults] = createSignal<StreamResult[]>([]);

  const formatOptions: { value: VideoFormat; label: string }[] = [
    { value: "hls", label: "HLS (HTTP Live Streaming)" },
    { value: "dash", label: "DASH (Dynamic Adaptive Streaming over HTTP)" },
    { value: "webrtc", label: "WebRTC" },
    { value: "mp4", label: "MP4 (Direct)" },
  ];

  const handleFormatChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const format = target.value as VideoFormat;
    setSelectedFormat(format);
    // Set a default URL for the selected format
    setInputUrl(SAMPLE_STREAMS[format] || "");
  };

  const handleUrlChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setInputUrl(target.value);
  };

  const handleStartTest = () => {
    if (!inputUrl()) {
      alert("Please enter a valid URL for testing");
      return;
    }

    setIsTestActive(true);
    setStatus("loading");

    // Add this test to results
    const newResult: StreamResult = {
      format: selectedFormat(),
      url: inputUrl(),
      status: "loading",
    };

    setResults((prev) => [newResult, ...prev].slice(0, 10)); // Keep last 10 results
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
  };

  const handleStopTest = () => {
    setIsTestActive(false);
  };

  const handleTestAll = async () => {
    // Test each format one by one
    for (const format of formatOptions.map((opt) => opt.value)) {
      setSelectedFormat(format);
      setInputUrl(SAMPLE_STREAMS[format] || "");

      if (!SAMPLE_STREAMS[format]) {
        continue; // Skip if no sample URL available
      }

      setIsTestActive(true);
      setStatus("loading");

      const newResult: StreamResult = {
        format,
        url: SAMPLE_STREAMS[format],
        status: "loading",
      };

      setResults((prev) => [newResult, ...prev].slice(0, 10));

      // Wait for 10 seconds or until status changes from loading
      await new Promise<void>((resolve) => {
        let timeout: number;

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
  };

  const getStatusBadge = (
    status: "success" | "error" | "loading" | "not-tested"
  ) => {
    switch (status) {
      case "success":
        return (
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            Compatible
          </span>
        );
      case "error":
        return (
          <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            Not Compatible
          </span>
        );
      case "loading":
        return (
          <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            Testing...
          </span>
        );
      default:
        return (
          <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
            Not Tested
          </span>
        );
    }
  };

  return (
    <div class="w-full max-w-4xl mx-auto p-4">
      <div class="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4">Stream Format Tester</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="format-select" class="block text-sm font-medium mb-1">
              Select Stream Format
            </label>
            <select
              id="format-select"
              class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              value={selectedFormat()}
              onChange={handleFormatChange}
              disabled={isTestActive()}
            >
              {formatOptions.map((option) => (
                <option value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label for="url-input" class="block text-sm font-medium mb-1">
              Stream URL
            </label>
            <input
              id="url-input"
              type="text"
              class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              value={inputUrl()}
              onInput={handleUrlChange}
              disabled={isTestActive()}
              placeholder="Enter stream URL..."
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
          <button
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            onClick={handleStartTest}
            disabled={isTestActive()}
          >
            Start Test
          </button>

          <button
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            onClick={handleTestAll}
            disabled={isTestActive()}
          >
            Test All Formats
          </button>

          <Show when={isTestActive()}>
            <button
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
              onClick={handleStopTest}
            >
              Stop Test
            </button>
          </Show>
        </div>

        <Show when={isTestActive()}>
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-2">
              Testing{" "}
              {
                formatOptions.find((opt) => opt.value === selectedFormat())
                  ?.label
              }
            </h3>
            <VideoPlayer
              format={selectedFormat()}
              url={inputUrl()}
              onStatusChange={handleStatusChange}
            />
          </div>
        </Show>

        <div>
          <h3 class="text-lg font-semibold mb-2">Test Results</h3>
          <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Format
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    URL
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {results().length > 0 ? (
                  results().map((result) => (
                    <tr>
                      <td class="px-4 py-3 whitespace-nowrap">
                        {
                          formatOptions.find(
                            (opt) => opt.value === result.format
                          )?.label
                        }
                      </td>
                      <td
                        class="px-4 py-3 text-xs truncate max-w-[200px]"
                        title={result.url}
                      >
                        {result.url}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(result.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colspan="3"
                      class="px-4 py-3 text-center text-gray-500 dark:text-gray-400"
                    >
                      No tests run yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4">Device Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 class="text-lg font-semibold mb-2">Browser</h3>
            <p class="mb-1">
              <span class="font-medium">User Agent:</span>{" "}
              <span class="text-sm" id="user-agent"></span>
            </p>
            <p class="mb-1">
              <span class="font-medium">Window Size:</span>{" "}
              <span class="text-sm" id="window-size"></span>
            </p>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-2">Video Support</h3>
            <p class="mb-1">
              <span class="font-medium">HLS Native Support:</span>{" "}
              <span class="text-sm" id="hls-support"></span>
            </p>
            <p class="mb-1">
              <span class="font-medium">WebRTC Support:</span>{" "}
              <span class="text-sm" id="webrtc-support"></span>
            </p>
            <p class="mb-1">
              <span class="font-medium">Media Source Extensions:</span>{" "}
              <span class="text-sm" id="mse-support"></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamTester;
