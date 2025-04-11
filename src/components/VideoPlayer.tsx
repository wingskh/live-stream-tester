import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import Hls from "hls.js";
import * as dashjs from "dashjs";
// @ts-ignore - Importing shaka-player, which may have type issues
import shaka from "shaka-player";
// @ts-ignore - Importing flv.js for FLV support
import flvjs from "flv.js";
import { Show } from "solid-js/web";

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
  let peerConnection: RTCPeerConnection | null = null;
  let webSocketConnection: WebSocket | null = null;
  let flvPlayer: any | null = null;

  const [status, setStatus] = createSignal<"success" | "error" | "loading">(
    "loading"
  );
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [isBuffering, setIsBuffering] = createSignal(false);
  const [webrtcStats, setWebrtcStats] = createSignal<string>("");

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
          // Standard initialization for other browsers
          initHLS();
          break;
        case "dash":
          initDASH();
          break;
        case "webrtc":
          initWebRTC();
          break;
        case "mp4":
          // Direct playback for MP4 and other natively supported formats
          videoRef.src = props.url;
          break;
        case "rtmp":
          // RTMP requires special handling
          try {
            // Modern browsers can't play RTMP directly since Flash is deprecated
            // Try to use flv.js as a fallback for RTMP streams
            if (typeof flvjs !== "undefined" && flvjs.isSupported()) {
              // Convert RTMP URL to HTTP-FLV equivalent if possible
              // This works if the server supports HTTP-FLV fallback
              let httpFlvUrl = props.url;

              // Try to convert standard RTMP URLs to HTTP-FLV format
              if (props.url.startsWith("rtmp://")) {
                // Convert rtmp:// to http:// or https://
                httpFlvUrl = props.url.replace("rtmp://", "https://");

                // Check if URL has /live/ or similar patterns and add .flv extension
                if (!httpFlvUrl.endsWith(".flv")) {
                  httpFlvUrl = httpFlvUrl + ".flv";
                }

                // Also try to find potential HLS alternative
                tryHlsAlternative(props.url);
              }

              console.log(
                "Attempting HTTP-FLV fallback for RTMP stream:",
                httpFlvUrl
              );

              // Create FLV player instance with the converted URL
              flvPlayer = flvjs.createPlayer({
                type: "flv",
                url: httpFlvUrl,
                isLive: true, // RTMP streams are typically live
              });

              // Attach to video element
              flvPlayer.attachMediaElement(videoRef);
              flvPlayer.load();

              // Listen for events
              flvPlayer.on(
                flvjs.Events.ERROR,
                (errorType: string, errorDetail: any) => {
                  console.error(
                    "FLV player error for RTMP stream:",
                    errorType,
                    errorDetail
                  );
                  showRtmpFallbackOptions();
                }
              );

              // Start playing
              flvPlayer
                .play()
                .then(() => {
                  setStatus("success");
                  props.onStatusChange("success");
                })
                .catch((error: any) => {
                  console.error("Error playing RTMP as HTTP-FLV:", error);
                  showRtmpFallbackOptions();
                });
            } else {
              showRtmpFallbackOptions();
            }
          } catch (error) {
            console.error("Error initializing RTMP fallback:", error);
            showRtmpFallbackOptions();
          }
          break;
        case "rtsp":
          // RTSP is not directly supported in browsers
          setStatus("error");
          props.onStatusChange("error");
          videoRef.parentElement?.insertAdjacentHTML(
            "beforeend",
            `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
              <div class="text-center p-4">
                <p class="text-white mb-2">RTSP is not supported in browsers</p>
                <p class="text-sm text-gray-400">This protocol requires a native application or proxy server</p>
              </div>
            </div>`
          );
          break;
        case "srt":
          // SRT is not directly supported in browsers
          setStatus("error");
          props.onStatusChange("error");
          videoRef.parentElement?.insertAdjacentHTML(
            "beforeend",
            `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
              <div class="text-center p-4">
                <p class="text-white mb-2">SRT is not supported in browsers</p>
                <p class="text-sm text-gray-400">This protocol requires a native application or transcoding to HLS/DASH</p>
              </div>
            </div>`
          );
          break;
        case "flv":
          // Try to use flv.js if available
          if (typeof flvjs !== "undefined" && flvjs.isSupported()) {
            initFLV();
          } else {
            // Show error if flv.js is not available or not supported
            setStatus("error");
            props.onStatusChange("error");
            videoRef.parentElement?.insertAdjacentHTML(
              "beforeend",
              `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
                <div class="text-center p-4">
                  <p class="text-white mb-2">FLV playback is not supported</p>
                  <p class="text-sm text-gray-400">Your browser does not support FLV playback</p>
                </div>
              </div>`
            );
          }
          break;
        case "smooth":
          // Try to use Shaka Player for Smooth Streaming
          try {
            if (shaka.Player.isBrowserSupported()) {
              shakaInstance = new shaka.Player(videoRef);
              shakaInstance.addEventListener("error", (event: ErrorEvent) => {
                console.error("Smooth Streaming error:", event);
                setStatus("error");
                props.onStatusChange("error");
              });

              shakaInstance
                .load(props.url)
                .then(() => {
                  videoRef
                    ?.play()
                    .then(() => {
                      setStatus("success");
                      props.onStatusChange("success");
                    })
                    .catch((error: Error) => {
                      console.error("Error playing Smooth Streaming:", error);
                      setStatus("error");
                      props.onStatusChange("error");
                    });
                })
                .catch((error: Error) => {
                  console.error("Error loading Smooth Streaming:", error);
                  setStatus("error");
                  props.onStatusChange("error");
                });
            } else {
              throw new Error("Shaka Player not supported in this browser");
            }
          } catch (error) {
            console.error("Error initializing Smooth Streaming:", error);
            setStatus("error");
            props.onStatusChange("error");
          }
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

  const initWebRTC = () => {
    if (!videoRef) return;

    try {
      // Check if WebRTC is supported
      if (!window.RTCPeerConnection) {
        throw new Error("WebRTC is not supported by this browser");
      }

      // Create a video element to attach the stream to
      videoRef.muted = true;

      // Add status overlay
      const statusOverlay = document.createElement("div");
      statusOverlay.className =
        "absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white";
      statusOverlay.innerHTML = `
        <div class="text-center p-4 max-w-md">
          <p class="mb-2">Connecting to WebRTC stream...</p>
          <div class="w-full bg-gray-700 rounded-full h-2.5 mb-4">
            <div class="bg-blue-600 h-2.5 rounded-full w-1/4 animate-pulse"></div>
          </div>
          <p id="webrtc-status" class="text-xs text-gray-400">Initializing connection...</p>
        </div>
      `;

      videoRef.parentElement?.appendChild(statusOverlay);
      const statusEl = statusOverlay.querySelector("#webrtc-status");

      // Configure peer connection
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      // Detect server type based on URL
      const url = props.url.toLowerCase();

      // For Janus WebRTC server
      if (url.includes("janus")) {
        if (statusEl) statusEl.textContent = "Detected Janus WebRTC server";
        connectToJanusServer(statusOverlay, statusEl);
        return;
      }

      // For WebRTC Echo Test server
      if (url.includes("echotest")) {
        if (statusEl) statusEl.textContent = "Detected Echo Test server";
        connectToEchoTestServer(statusOverlay, statusEl);
        return;
      }

      // Default WebRTC connection logic
      peerConnection = new RTCPeerConnection(configuration);

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          if (statusEl)
            statusEl.textContent = `ICE candidate found: ${event.candidate.candidate.substring(
              0,
              20
            )}...`;

          // Send the candidate to the signaling server
          if (
            webSocketConnection &&
            webSocketConnection.readyState === WebSocket.OPEN
          ) {
            webSocketConnection.send(
              JSON.stringify({
                type: "ice",
                candidate: event.candidate,
              })
            );
          }
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        if (statusEl)
          statusEl.textContent = `ICE connection state: ${peerConnection?.iceConnectionState}`;

        if (
          peerConnection?.iceConnectionState === "failed" ||
          peerConnection?.iceConnectionState === "disconnected"
        ) {
          setStatus("error");
          props.onStatusChange("error");
          if (statusEl)
            statusEl.textContent =
              "Connection failed. Check server or try a different URL.";
        } else if (peerConnection?.iceConnectionState === "connected") {
          setStatus("success");
          props.onStatusChange("success");
          // Remove the status overlay after connection is established
          setTimeout(() => {
            statusOverlay.remove();
          }, 1000);
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (videoRef && event.streams && event.streams[0]) {
          videoRef.srcObject = event.streams[0];

          videoRef.onloadedmetadata = () => {
            videoRef
              .play()
              .then(() => {
                setStatus("success");
                props.onStatusChange("success");
                // Update stats periodically
                const statsInterval = setInterval(() => {
                  if (peerConnection) {
                    peerConnection.getStats().then((stats) => {
                      let statsInfo = "";
                      let videoWidth = 0,
                        videoHeight = 0,
                        fps = 0;
                      let bytesReceived = 0,
                        packetsReceived = 0,
                        packetsLost = 0;

                      stats.forEach((report) => {
                        if (
                          report.type === "inbound-rtp" &&
                          report.kind === "video"
                        ) {
                          videoWidth = report.frameWidth || 0;
                          videoHeight = report.frameHeight || 0;
                          fps = Math.round(report.framesPerSecond || 0);
                          bytesReceived = report.bytesReceived || 0;
                          packetsReceived = report.packetsReceived || 0;
                          packetsLost = report.packetsLost || 0;
                        }
                      });

                      if (videoWidth > 0) {
                        const mbReceived = (
                          bytesReceived /
                          (1024 * 1024)
                        ).toFixed(2);
                        const packetLossRate =
                          packetsReceived > 0
                            ? (
                                (packetsLost /
                                  (packetsReceived + packetsLost)) *
                                100
                              ).toFixed(1)
                            : "0.0";

                        statsInfo = `Resolution: ${videoWidth}x${videoHeight} | FPS: ${fps} | Data: ${mbReceived}MB | Packets: ${packetsReceived} | Loss: ${packetLossRate}%`;
                        setWebrtcStats(statsInfo);
                      }
                    });
                  }
                }, 2000);

                // Clear the interval when component is cleaned up
                onCleanup(() => clearInterval(statsInterval));
              })
              .catch((error) => {
                console.error("Error playing WebRTC stream:", error);
                setStatus("error");
                props.onStatusChange("error");
              });
          };
        }
      };

      // Connect to signaling server
      try {
        if (!props.url) {
          throw new Error("WebRTC URL is required");
        }

        if (statusEl)
          statusEl.textContent = `Connecting to signaling server: ${props.url}`;

        webSocketConnection = new WebSocket(props.url);

        webSocketConnection.onopen = async () => {
          if (statusEl)
            statusEl.textContent =
              "Connected to signaling server, creating offer...";

          try {
            // Add local media stream (for two-way communication if needed)
            // For receive-only, we still need to add transceivers
            peerConnection?.addTransceiver("video", { direction: "recvonly" });
            peerConnection?.addTransceiver("audio", { direction: "recvonly" });

            // Create and send an offer
            const offer = await peerConnection?.createOffer();
            await peerConnection?.setLocalDescription(offer);

            if (webSocketConnection && offer) {
              webSocketConnection.send(
                JSON.stringify({
                  type: "offer",
                  sdp: offer,
                })
              );

              if (statusEl)
                statusEl.textContent = "Offer sent, waiting for answer...";
            }
          } catch (err) {
            console.error("Error creating offer:", err);
            setStatus("error");
            props.onStatusChange("error");
            if (statusEl)
              statusEl.textContent = `Error creating offer: ${
                err instanceof Error ? err.message : "Unknown error"
              }`;
          }
        };

        webSocketConnection.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === "answer" && message.sdp && peerConnection) {
              if (statusEl)
                statusEl.textContent =
                  "Received answer, setting remote description...";

              const remoteDesc = new RTCSessionDescription({
                type: "answer",
                sdp: message.sdp,
              });

              await peerConnection.setRemoteDescription(remoteDesc);
              if (statusEl)
                statusEl.textContent =
                  "Remote description set, establishing connection...";
            } else if (
              message.type === "ice" &&
              message.candidate &&
              peerConnection
            ) {
              if (statusEl) statusEl.textContent = "Received ICE candidate...";

              const candidate = new RTCIceCandidate(message.candidate);
              await peerConnection.addIceCandidate(candidate);
            } else if (message.type === "error") {
              throw new Error(message.error || "Unknown server error");
            }
          } catch (err) {
            console.error("Error handling WebSocket message:", err);
            setStatus("error");
            props.onStatusChange("error");
            if (statusEl)
              statusEl.textContent = `Error handling message: ${
                err instanceof Error ? err.message : "Unknown error"
              }`;
          }
        };

        webSocketConnection.onerror = (error) => {
          console.error("WebSocket error:", error);
          setStatus("error");
          props.onStatusChange("error");
          if (statusEl) statusEl.textContent = "WebSocket connection error";
        };

        webSocketConnection.onclose = () => {
          if (status() !== "success") {
            setStatus("error");
            props.onStatusChange("error");
            if (statusEl)
              statusEl.textContent = "Connection to signaling server closed";
          }
        };
      } catch (err) {
        console.error("Error connecting to signaling server:", err);
        setStatus("error");
        props.onStatusChange("error");
        if (statusEl)
          statusEl.textContent = `Error connecting to server: ${
            err instanceof Error ? err.message : "Unknown error"
          }`;
      }
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      setStatus("error");
      props.onStatusChange("error");

      // Show error message
      videoRef.parentElement?.insertAdjacentHTML(
        "beforeend",
        `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
          <div class="text-center p-4">
            <p class="text-white mb-2">WebRTC initialization failed</p>
            <p class="text-sm text-gray-400">${
              error instanceof Error ? error.message : "Unknown error occurred"
            }</p>
          </div>
        </div>`
      );
    }
  };

  // Connect to Janus WebRTC server
  const connectToJanusServer = (
    statusOverlay: HTMLDivElement,
    statusEl: Element | null
  ) => {
    if (!videoRef) return;

    try {
      if (statusEl)
        statusEl.textContent = "Connecting to Janus WebRTC server...";

      // Set up WebSocket connection to Janus
      webSocketConnection = new WebSocket(props.url);

      // Store the session and handle IDs
      let sessionId: string | null = null;
      let handleId: string | null = null;

      webSocketConnection.onopen = () => {
        if (statusEl)
          statusEl.textContent = "Connected to Janus, creating session...";

        // Create a Janus session
        const createSession = {
          janus: "create",
          transaction: generateTransactionId(),
        };

        webSocketConnection?.send(JSON.stringify(createSession));
      };

      webSocketConnection.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);

          if (statusEl) statusEl.textContent = `Janus: ${response.janus}`;

          // Handle different Janus message types
          if (response.janus === "success" && response.data?.id) {
            // Session created, attach to EchoTest plugin
            sessionId = response.data.id;

            const attachPlugin = {
              janus: "attach",
              session_id: sessionId,
              plugin: "janus.plugin.echotest",
              transaction: generateTransactionId(),
            };

            webSocketConnection?.send(JSON.stringify(attachPlugin));
          } else if (
            response.janus === "success" &&
            response.data?.id &&
            !response.plugindata
          ) {
            // Plugin attached, send offer
            handleId = response.data.id;

            // Create RTCPeerConnection
            peerConnection = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            // Add video transceiver (receive only)
            peerConnection.addTransceiver("video", { direction: "recvonly" });
            peerConnection.addTransceiver("audio", { direction: "recvonly" });

            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send the offer to Janus
            const sendOffer = {
              janus: "message",
              body: { audio: true, video: true },
              jsep: offer,
              transaction: generateTransactionId(),
              session_id: sessionId,
              handle_id: handleId,
            };

            webSocketConnection?.send(JSON.stringify(sendOffer));

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
              if (event.candidate && sessionId && handleId) {
                const trickleCandidate = {
                  janus: "trickle",
                  candidate: event.candidate,
                  transaction: generateTransactionId(),
                  session_id: sessionId,
                  handle_id: handleId,
                };

                webSocketConnection?.send(JSON.stringify(trickleCandidate));
              }
            };

            // Handle remote stream
            peerConnection.ontrack = (event) => {
              if (videoRef && event.streams && event.streams[0]) {
                videoRef.srcObject = event.streams[0];

                videoRef.onloadedmetadata = () => {
                  videoRef
                    .play()
                    .then(() => {
                      setStatus("success");
                      props.onStatusChange("success");
                      statusOverlay.remove();

                      // Add stats tracking
                      const statsInterval = setInterval(() => {
                        if (peerConnection) {
                          peerConnection.getStats().then((stats) => {
                            let statsInfo = "";
                            let videoWidth = 0,
                              videoHeight = 0,
                              fps = 0;
                            let bytesReceived = 0,
                              packetsReceived = 0,
                              packetsLost = 0;

                            stats.forEach((report) => {
                              if (
                                report.type === "inbound-rtp" &&
                                report.kind === "video"
                              ) {
                                videoWidth = report.frameWidth || 0;
                                videoHeight = report.frameHeight || 0;
                                fps = Math.round(report.framesPerSecond || 0);
                                bytesReceived = report.bytesReceived || 0;
                                packetsReceived = report.packetsReceived || 0;
                                packetsLost = report.packetsLost || 0;
                              }
                            });

                            if (videoWidth > 0) {
                              const mbReceived = (
                                bytesReceived /
                                (1024 * 1024)
                              ).toFixed(2);
                              const packetLossRate =
                                packetsReceived > 0
                                  ? (
                                      (packetsLost /
                                        (packetsReceived + packetsLost)) *
                                      100
                                    ).toFixed(1)
                                  : "0.0";

                              statsInfo = `Resolution: ${videoWidth}x${videoHeight} | FPS: ${fps} | Data: ${mbReceived}MB | Packets: ${packetsReceived} | Loss: ${packetLossRate}%`;
                              setWebrtcStats(statsInfo);
                            }
                          });
                        }
                      }, 2000);

                      // Clear interval on cleanup
                      onCleanup(() => clearInterval(statsInterval));
                    })
                    .catch((error) => {
                      console.error("Error playing video:", error);
                      setStatus("error");
                      props.onStatusChange("error");
                    });
                };
              }
            };
          } else if (response.janus === "event" && response.jsep) {
            // Handle answer/SDP from Janus
            const jsep = response.jsep;

            if (jsep.type === "answer" && peerConnection) {
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(jsep)
              );
              if (statusEl)
                statusEl.textContent = "Received and set remote description";
            }
          }
        } catch (error) {
          console.error("Error handling Janus message:", error);
          setStatus("error");
          props.onStatusChange("error");
        }
      };

      webSocketConnection.onerror = (error) => {
        console.error("Janus WebSocket error:", error);
        setStatus("error");
        props.onStatusChange("error");
      };

      webSocketConnection.onclose = () => {
        if (status() !== "success") {
          setStatus("error");
          props.onStatusChange("error");
          if (statusEl) statusEl.textContent = "Janus connection closed";
        }
      };
    } catch (error) {
      console.error("Error connecting to Janus:", error);
      setStatus("error");
      props.onStatusChange("error");
    }
  };

  // Connect to Echo Test server
  const connectToEchoTestServer = (
    statusOverlay: HTMLDivElement,
    statusEl: Element | null
  ) => {
    if (!videoRef) return;

    try {
      if (statusEl) statusEl.textContent = "Connecting to Echo Test server...";

      // Set up WebSocket connection
      webSocketConnection = new WebSocket(props.url);

      webSocketConnection.onopen = async () => {
        if (statusEl)
          statusEl.textContent =
            "Connected to Echo Test server, creating offer...";

        // Create peer connection
        peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Add video & audio transceivers
        peerConnection.addTransceiver("video", { direction: "recvonly" });
        peerConnection.addTransceiver("audio", { direction: "recvonly" });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate && webSocketConnection) {
            webSocketConnection.send(
              JSON.stringify({
                type: "candidate",
                candidate: event.candidate,
              })
            );
          }
        };

        // Handle connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          if (statusEl)
            statusEl.textContent = `Connection state: ${peerConnection?.iceConnectionState}`;

          if (peerConnection?.iceConnectionState === "connected") {
            setStatus("success");
            props.onStatusChange("success");
            setTimeout(() => statusOverlay.remove(), 1000);
          } else if (peerConnection?.iceConnectionState === "failed") {
            setStatus("error");
            props.onStatusChange("error");
          }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          if (videoRef && event.streams && event.streams[0]) {
            videoRef.srcObject = event.streams[0];

            videoRef.onloadedmetadata = () => {
              videoRef
                .play()
                .then(() => {
                  setStatus("success");
                  props.onStatusChange("success");

                  // Add stats tracking
                  const statsInterval = setInterval(() => {
                    if (peerConnection) {
                      peerConnection.getStats().then((stats) => {
                        let statsInfo = "";
                        let videoWidth = 0,
                          videoHeight = 0,
                          fps = 0;
                        let bytesReceived = 0,
                          packetsReceived = 0,
                          packetsLost = 0;

                        stats.forEach((report) => {
                          if (
                            report.type === "inbound-rtp" &&
                            report.kind === "video"
                          ) {
                            videoWidth = report.frameWidth || 0;
                            videoHeight = report.frameHeight || 0;
                            fps = Math.round(report.framesPerSecond || 0);
                            bytesReceived = report.bytesReceived || 0;
                            packetsReceived = report.packetsReceived || 0;
                            packetsLost = report.packetsLost || 0;
                          }
                        });

                        if (videoWidth > 0) {
                          const mbReceived = (
                            bytesReceived /
                            (1024 * 1024)
                          ).toFixed(2);
                          const packetLossRate =
                            packetsReceived > 0
                              ? (
                                  (packetsLost /
                                    (packetsReceived + packetsLost)) *
                                  100
                                ).toFixed(1)
                              : "0.0";

                          statsInfo = `Resolution: ${videoWidth}x${videoHeight} | FPS: ${fps} | Data: ${mbReceived}MB | Packets: ${packetsReceived} | Loss: ${packetLossRate}%`;
                          setWebrtcStats(statsInfo);
                        }
                      });
                    }
                  }, 2000);

                  // Clear interval on cleanup
                  onCleanup(() => clearInterval(statsInterval));
                })
                .catch((error) => {
                  console.error("Error playing video:", error);
                  setStatus("error");
                  props.onStatusChange("error");
                });
            };
          }
        };

        // Create and send offer
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          if (webSocketConnection) {
            webSocketConnection.send(
              JSON.stringify({
                type: "offer",
                sdp: offer.sdp,
              })
            );

            if (statusEl)
              statusEl.textContent = "Offer sent, waiting for answer...";
          }
        } catch (error) {
          console.error("Error creating offer:", error);
          setStatus("error");
          props.onStatusChange("error");
        }
      };

      // Handle incoming messages
      webSocketConnection.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "answer" && peerConnection) {
            const answer = new RTCSessionDescription({
              type: "answer",
              sdp: message.sdp,
            });

            await peerConnection.setRemoteDescription(answer);
            if (statusEl)
              statusEl.textContent = "Received answer, connection established";
          } else if (message.type === "candidate" && peerConnection) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(message.candidate)
            );
          }
        } catch (error) {
          console.error("Error handling message:", error);
          setStatus("error");
          props.onStatusChange("error");
        }
      };

      webSocketConnection.onerror = () => {
        setStatus("error");
        props.onStatusChange("error");
      };

      webSocketConnection.onclose = () => {
        if (status() !== "success") {
          setStatus("error");
          props.onStatusChange("error");
        }
      };
    } catch (error) {
      console.error("Error connecting to Echo Test server:", error);
      setStatus("error");
      props.onStatusChange("error");
    }
  };

  // Helper function to generate random transaction ID
  const generateTransactionId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const initHLS = () => {
    if (!videoRef) return;

    // Check for UC Browser first and handle it specially
    if (navigator.userAgent.indexOf("UCBrowser") > -1) {
      console.log("UC Browser detected - trying native HLS playback");
      // For UC Browser, try direct playback first as it may support some HLS streams natively
      videoRef.src = props.url;

      videoRef.addEventListener("error", () => {
        console.error("HLS playback error in UC Browser:", videoRef.error);
        // Show helpful error message
        videoRef.parentElement?.insertAdjacentHTML(
          "beforeend",
          `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
            <div class="text-center p-4 max-w-md">
              <p class="text-white text-lg mb-2">Playback Error in UC Browser</p>
              <p class="text-gray-300 mb-4">UC Browser has limited support for HLS streams.</p>
              <div class="text-left text-sm bg-gray-800 p-3 rounded mb-2">
                <p class="text-white font-medium mb-2">Try these options:</p>
                <ul class="text-gray-300 list-disc pl-5 space-y-1">
                  <li>Open this page in Chrome or Safari browser</li>
                  <li>Try a different stream format (like MP4)</li>
                </ul>
              </div>
            </div>
          </div>`
        );
        setStatus("error");
        props.onStatusChange("error");
      });

      videoRef.addEventListener("loadedmetadata", () => {
        videoRef
          ?.play()
          .then(() => {
            setStatus("success");
            props.onStatusChange("success");
          })
          .catch((error) => {
            console.error("Error playing HLS in UC Browser:", error);
            setStatus("error");
            props.onStatusChange("error");
          });
      });

      return;
    }
    alert(
      `HLV: ${Hls.isSupported()} ${videoRef.canPlayType(
        "application/vnd.apple.mpegurl"
      )}`
    );

    // For other browsers, continue with normal HLS.js detection
    if (Hls.isSupported()) {
      // Create a more robust HLS configuration similar to streaming platforms
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,

        // Advanced buffer management
        maxBufferLength: 30,
        maxMaxBufferLength: 60,

        // Live stream optimizations
        liveSyncDurationCount: 3,
        liveBackBufferLength: 30,

        // Error recovery and resilience
        fragLoadingRetryDelay: 1000,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,

        // Performance optimizations
        startLevel: -1, // Auto
        capLevelToPlayerSize: true,
        maxLoadingDelay: 4,

        // Debug mode (disable in production)
        debug: false,
      });

      // Add more robust event handling
      hlsInstance.attachMedia(videoRef);

      // Handle media attachment
      hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("HLS: Media attached");
        hlsInstance?.loadSource(props.url);
      });

      // Handle successful manifest parsing
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log(
          `HLS: Manifest parsed, ${data.levels.length} quality levels available`
        );

        videoRef
          ?.play()
          .then(() => {
            setStatus("success");
            props.onStatusChange("success");
          })
          .catch((error) => {
            console.error("Error playing HLS:", error);

            // Handle autoplay restrictions
            if (error.name === "NotAllowedError") {
              console.log(
                "HLS: Autoplay prevented by browser, adding click-to-play overlay"
              );
              addClickToPlayOverlay();
            } else {
              setStatus("error");
              props.onStatusChange("error");
            }
          });
      });

      // Handle level switching
      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const currentLevel = hlsInstance?.levels[data.level];
        console.log(`HLS: Quality switched to ${currentLevel?.height}p`);
      });

      // More granular error handling
      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS: Fatal network error", data);

              // Try to recover network error
              console.log("HLS: Attempting to recover from network error");
              hlsInstance?.startLoad();
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS: Fatal media error", data);

              // Try to recover media error
              console.log("HLS: Attempting to recover from media error");
              hlsInstance?.recoverMediaError();
              break;

            default:
              // Cannot recover from other fatal errors
              console.error("HLS: Fatal error, cannot recover", data);
              hlsInstance?.destroy();
              setStatus("error");
              props.onStatusChange("error");
              break;
          }
        } else {
          // Non-fatal errors don't need immediate handling
          console.warn("HLS: Non-fatal error", data);
        }
      });

      // Add buffer monitoring
      const bufferCheckInterval = setInterval(() => {
        if (videoRef && hlsInstance) {
          const buffered = videoRef.buffered;
          if (buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1);
            const duration = videoRef.duration;
            const bufferedPercent = (bufferedEnd / duration) * 100;

            if (bufferedPercent < 10 && !isBuffering()) {
              console.warn(
                "HLS: Buffer critically low",
                bufferedPercent.toFixed(2) + "%"
              );
              setIsBuffering(true);
            } else if (bufferedPercent > 15 && isBuffering()) {
              setIsBuffering(false);
            }
          }
        }
      }, 2000);

      // Clean up buffer check on cleanup
      onCleanup(() => clearInterval(bufferCheckInterval));
    } else if (videoRef.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari which has native HLS support
      videoRef.src = props.url;

      // Enhanced error handling for Safari
      videoRef.addEventListener("error", () => {
        console.error("HLS: Error in Safari native playback", videoRef.error);
        setStatus("error");
        props.onStatusChange("error");
      });

      videoRef.addEventListener("loadedmetadata", () => {
        videoRef
          ?.play()
          .then(() => {
            setStatus("success");
            props.onStatusChange("success");
          })
          .catch((error) => {
            console.error("Error playing HLS in Safari:", error);

            // Handle autoplay restrictions
            if (error.name === "NotAllowedError") {
              addClickToPlayOverlay();
            } else {
              setStatus("error");
              props.onStatusChange("error");
            }
          });
      });
    } else {
      console.error("HLS is not supported on this browser");
      setStatus("error");
      props.onStatusChange("error");

      // Show helpful error for browsers without HLS support
      videoRef.parentElement?.insertAdjacentHTML(
        "beforeend",
        `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
          <div class="text-center p-4 max-w-md">
            <p class="text-white text-lg mb-2">HLS Playback Not Supported</p>
            <p class="text-gray-300 mb-4">Your browser doesn't support HLS streaming.</p>
            <p class="text-gray-400 text-sm">Try using Chrome, Firefox, Safari, or Edge.</p>
          </div>
        </div>`
      );
    }
  };

  // Helper to add click-to-play overlay for browsers with autoplay restrictions
  const addClickToPlayOverlay = () => {
    if (!videoRef || !videoRef.parentElement) return;

    const overlayId = "click-to-play-overlay";

    // Remove existing overlay if present
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) existingOverlay.remove();

    // Create and add new overlay
    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className =
      "absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer z-10";
    overlay.innerHTML = `
      <div class="text-center p-4">
        <div class="w-20 h-20 rounded-full bg-blue-500/80 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-white text-lg font-medium">Click to Play</p>
        <p class="text-gray-300 text-sm">Your browser requires interaction to start playback</p>
      </div>
    `;

    // Add click handler
    overlay.addEventListener("click", () => {
      videoRef
        ?.play()
        .then(() => {
          overlay.remove();
          setStatus("success");
          props.onStatusChange("success");
        })
        .catch((err) => {
          console.error("Still cannot play after click:", err);
          setStatus("error");
          props.onStatusChange("error");
        });
    });

    videoRef.parentElement.appendChild(overlay);
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

  const initFLV = () => {
    if (!videoRef) return;

    try {
      // Create FLV player instance
      flvPlayer = flvjs.createPlayer({
        type: "flv",
        url: props.url,
        isLive: props.url.toLowerCase().includes("live"),
      });

      // Attach to video element
      flvPlayer.attachMediaElement(videoRef);
      flvPlayer.load();

      // Listen for events
      flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
        console.log("FLV loading complete");
      });

      flvPlayer.on(
        flvjs.Events.ERROR,
        (errorType: string, errorDetail: any) => {
          console.error("FLV player error:", errorType, errorDetail);
          setStatus("error");
          props.onStatusChange("error");
        }
      );

      // Start playing
      try {
        videoRef
          .play()
          .then(() => {
            setStatus("success");
            props.onStatusChange("success");
          })
          .catch((error: any) => {
            console.error("Error playing FLV:", error);
            setStatus("error");
            props.onStatusChange("error");
          });
      } catch (error) {
        // Handle case where play() doesn't return a promise
        try {
          videoRef.play();
          setStatus("success");
          props.onStatusChange("success");
        } catch (e) {
          console.error("Error playing FLV (fallback):", e);
          setStatus("error");
          props.onStatusChange("error");
        }
      }
    } catch (error) {
      console.error("Error initializing FLV player:", error);
      setStatus("error");
      props.onStatusChange("error");
    }
  };

  const destroyPlayers = () => {
    // Destroy HLS instance
    if (hlsInstance) {
      try {
        hlsInstance.destroy();
      } catch (e) {
        console.error("Error destroying HLS instance:", e);
      }
      hlsInstance = null;
    }

    // Reset DASH instance
    if (dashInstance) {
      try {
        dashInstance.reset();
      } catch (e) {
        console.error("Error resetting DASH instance:", e);
      }
      dashInstance = null;
    }

    // Destroy Shaka instance
    if (shakaInstance) {
      try {
        shakaInstance.destroy();
      } catch (e) {
        console.error("Error destroying Shaka instance:", e);
      }
      shakaInstance = null;
    }

    // Clean up WebRTC connections
    if (peerConnection) {
      try {
        peerConnection.close();
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
      peerConnection = null;
    }

    if (webSocketConnection) {
      try {
        if (
          webSocketConnection.readyState === WebSocket.OPEN ||
          webSocketConnection.readyState === WebSocket.CONNECTING
        ) {
          webSocketConnection.close();
        }
      } catch (e) {
        console.error("Error closing WebSocket connection:", e);
      }
      webSocketConnection = null;
    }

    // Reset video srcObject
    if (videoRef) {
      try {
        if (videoRef.srcObject) {
          // Stop all tracks in the stream
          const stream = videoRef.srcObject as MediaStream;
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => track.stop());
          }
          videoRef.srcObject = null;
        }

        // Reset video element
        videoRef.pause();
        videoRef.src = "";
        videoRef.load();
      } catch (e) {
        console.error("Error resetting video element:", e);
      }
    }

    // Clear any DOM overlays that might have been added
    if (videoRef && videoRef.parentElement) {
      try {
        // Remove any status overlays that might have been added
        const overlays = videoRef.parentElement.querySelectorAll(".absolute");
        overlays.forEach((overlay) => {
          if (overlay !== videoRef) {
            overlay.remove();
          }
        });
      } catch (e) {
        console.error("Error removing overlays:", e);
      }
    }

    // Destroy FLV player
    if (flvPlayer) {
      try {
        flvPlayer.pause();
        flvPlayer.unload();
        flvPlayer.detachMediaElement();
        flvPlayer.destroy();
      } catch (e) {
        console.error("Error destroying FLV player:", e);
      }
      flvPlayer = null;
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
      // Clean up previous player first
      destroyPlayers();
      // Small delay before initializing to ensure cleanup is complete
      setTimeout(() => {
        initializePlayer();
      }, 50);
    }
  });

  onMount(() => {
    // Initialize shaka player once
    shaka.polyfill.installAll();
  });

  onCleanup(() => {
    // Make sure to clean up all resources when component unmounts
    destroyPlayers();

    // Clear any intervals or timeouts
    if (videoRef) {
      videoRef.onloadedmetadata = null;
      videoRef.onwaiting = null;
      videoRef.onplaying = null;
      videoRef.ontimeupdate = null;

      // Force pause and empty source
      try {
        videoRef.pause();
        videoRef.removeAttribute("src");
        videoRef.load();
      } catch (e) {
        console.error("Error cleaning up video element:", e);
      }
    }
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
      case "loading":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
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

  // Helper function to show RTMP fallback options when direct playback fails
  const showRtmpFallbackOptions = () => {
    setStatus("error");
    props.onStatusChange("error");

    // Create a more helpful error message with alternatives
    videoRef?.parentElement?.insertAdjacentHTML(
      "beforeend",
      `<div class="absolute inset-0 flex items-center justify-center bg-black/70">
        <div class="text-center p-4 max-w-md">
          <p class="text-white text-lg mb-2">RTMP Playback Not Supported</p>
          <p class="text-gray-300 mb-4">Modern browsers can't play RTMP streams directly since Flash is deprecated.</p>
          
          <div class="text-left text-sm bg-gray-800 p-3 rounded mb-4">
            <p class="text-white font-medium mb-2">Alternatives:</p>
            <ul class="text-gray-300 list-disc pl-5 space-y-1">
              <li>Ask the stream provider for an HLS or DASH version</li>
              <li>Try using a native application like VLC Media Player</li>
              <li>Consider using a server that transcodes RTMP to HLS/DASH</li>
            </ul>
          </div>
          
          <div class="text-left text-xs bg-blue-900/50 p-3 rounded">
            <p class="text-blue-200 font-medium mb-1">Technical Note:</p>
            <p class="text-blue-100">We attempted to use HTTP-FLV as a fallback, but it requires the streaming server to support this format on the same endpoint.</p>
          </div>
        </div>
      </div>`
    );
  };

  // Helper function to try finding an HLS alternative for an RTMP stream
  const tryHlsAlternative = (rtmpUrl: string) => {
    // Some streaming services offer HLS alternatives for RTMP streams
    // Common patterns:
    // rtmp://server.com/live/stream -> https://server.com/live/stream/playlist.m3u8

    if (!rtmpUrl.startsWith("rtmp://")) return;

    try {
      // Extract domain and path from RTMP URL
      const urlWithoutProtocol = rtmpUrl.replace("rtmp://", "");
      const parts = urlWithoutProtocol.split("/");
      const domain = parts[0];
      const path = parts.slice(1).join("/");

      // Try various common HLS URL patterns
      const hlsVariants = [
        `https://${domain}/${path}/playlist.m3u8`,
        `https://${domain}/${path}/index.m3u8`,
        `https://${domain}/hls/${path}.m3u8`,
        `https://${domain}/hls/${path}/index.m3u8`,
      ];

      console.log(
        "Attempting to find HLS alternatives for RTMP stream:",
        hlsVariants
      );

      // Try to load the first variant using HLS.js
      if (Hls.isSupported() && hlsVariants.length > 0) {
        // We'll create a temporary HLS instance to test
        const tempHls = new Hls();
        tempHls.loadSource(hlsVariants[0]);
        tempHls.on(Hls.Events.MANIFEST_PARSED, () => {
          // If we reach here, the HLS URL works!
          console.log(
            "Found working HLS alternative for RTMP stream:",
            hlsVariants[0]
          );

          // Destroy the temporary instance
          tempHls.destroy();

          // Now set up the actual HLS player
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          if (videoRef) {
            hlsInstance.attachMedia(videoRef);
            hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
              hlsInstance?.loadSource(hlsVariants[0]);
            });

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef
                ?.play()
                .then(() => {
                  setStatus("success");
                  props.onStatusChange("success");
                })
                .catch((error) => {
                  console.error(
                    "Error playing HLS alternative for RTMP:",
                    error
                  );
                  // Still try to continue with the HTTP-FLV approach
                });
            });
          }
        });

        tempHls.on(Hls.Events.ERROR, () => {
          // This variant didn't work, try the next one (in a real implementation)
          tempHls.destroy();
          // For now, we'll just let the HTTP-FLV approach continue
        });
      }
    } catch (error) {
      console.error("Error trying HLS alternative:", error);
      // Continue with HTTP-FLV approach
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

      {/* WebRTC Stats - Only show when available and stream is successful */}
      <Show
        when={
          props.format === "webrtc" &&
          webrtcStats() !== "" &&
          status() === "success"
        }
      >
        <div class="bg-gradient-to-r from-blue-900 to-gray-900 text-gray-200 px-4 py-3 text-xs">
          <div class="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="flex-1">
              <p class="font-medium text-blue-300 mb-1">
                WebRTC Stream Statistics
              </p>
              <p class="font-mono tracking-tight">{webrtcStats()}</p>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default VideoPlayer;
