export const detectBrowserCapabilities = () => {
  const capabilities = {
    userAgent: navigator.userAgent,
    windowSize: `${window.innerWidth}x${window.innerHeight}`,
    hlsNativeSupport: false,
    webRtcSupport: false,
    mediaSourceExtensions: false
  };

  // Check HLS native support
  const videoElement = document.createElement('video');
  capabilities.hlsNativeSupport = Boolean(
    videoElement.canPlayType('application/vnd.apple.mpegurl') ||
    videoElement.canPlayType('application/x-mpegURL')
  );

  // Check WebRTC support
  capabilities.webRtcSupport = Boolean(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.RTCPeerConnection === 'function'
  );

  // Check Media Source Extensions support
  capabilities.mediaSourceExtensions = 'MediaSource' in window;

  return capabilities;
};

export const updateDeviceInfo = () => {
  const capabilities = detectBrowserCapabilities();
  
  // Update DOM elements with the detected capabilities
  const elements = {
    userAgent: document.getElementById('user-agent'),
    windowSize: document.getElementById('window-size'),
    hlsSupport: document.getElementById('hls-support'),
    webrtcSupport: document.getElementById('webrtc-support'),
    mseSupport: document.getElementById('mse-support')
  };
  
  if (elements.userAgent) elements.userAgent.textContent = capabilities.userAgent;
  if (elements.windowSize) elements.windowSize.textContent = capabilities.windowSize;
  
  if (elements.hlsSupport) {
    elements.hlsSupport.textContent = capabilities.hlsNativeSupport ? 'Yes' : 'No';
    elements.hlsSupport.className = capabilities.hlsNativeSupport ? 'text-green-600' : 'text-red-600';
  }
  
  if (elements.webrtcSupport) {
    elements.webrtcSupport.textContent = capabilities.webRtcSupport ? 'Yes' : 'No';
    elements.webrtcSupport.className = capabilities.webRtcSupport ? 'text-green-600' : 'text-red-600';
  }
  
  if (elements.mseSupport) {
    elements.mseSupport.textContent = capabilities.mediaSourceExtensions ? 'Yes' : 'No';
    elements.mseSupport.className = capabilities.mediaSourceExtensions ? 'text-green-600' : 'text-red-600';
  }
  
  // Return the capabilities for use elsewhere
  return capabilities;
}; 