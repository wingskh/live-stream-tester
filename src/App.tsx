import { onMount } from "solid-js";
import StreamTester from "./components/StreamTester";
import { updateDeviceInfo } from "./utils/browserDetect";
import "./index.css";

function App() {
  onMount(() => {
    // Detect browser capabilities on mount
    updateDeviceInfo();

    // Update device info when window is resized
    let resizeTimer: NodeJS.Timeout | undefined;
    window.addEventListener("resize", () => {
      // Debounce resize events
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateDeviceInfo();
        // Update responsive UI elements if needed
        document.documentElement.dataset.width = window.innerWidth.toString();
      }, 250);
    });

    // Set initial responsive data attribute
    document.documentElement.dataset.width = window.innerWidth.toString();

    // Listen for color scheme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleColorSchemeChange = () => {
      document.documentElement.classList.toggle("dark", mediaQuery.matches);
    };

    mediaQuery.addEventListener("change", handleColorSchemeChange);
    handleColorSchemeChange(); // Set initial value
  });

  return (
    <div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 sm:py-6 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Live Stream Format Tester
              </h1>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Test compatibility with HLS, DASH, WebRTC, and MP4 formats
              </p>
            </div>
            <div class="flex items-center space-x-4">
              <a
                href="https://github.com/yourusername/live-stream-tester"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="GitHub repository"
                tabindex="0"
              >
                <svg
                  class="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clip-rule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <StreamTester />
      </main>

      <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 sm:py-6 mt-8 sm:mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} Live Stream Tester. All rights
              reserved.
            </p>
            <div class="mt-4 md:mt-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Built with SolidJS, Vite, and Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
