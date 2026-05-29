/**
 * LiveVideoPanel — embeds a Jitsi Meet room inside the CogniBoost app
 * via the official Jitsi IFrame API. Reference implementation from the
 * Live Classes Spec (page 4) provided by Coral.
 *
 * Source URL pattern:
 *   https://<JITSI_HOST>/<roomId>#config.prejoinPageEnabled=false&...
 *
 * Using the IFrame API (instead of a plain iframe) lets us listen for
 * meeting lifecycle events:
 *   - readyToClose        → fires when meeting ends or user hangs up
 *   - videoConferenceLeft → fires when this participant leaves the room
 * We use these to call onMeetingEnd so the parent can navigate away
 * (e.g., back to /dashboard/labs with a "Class ended" toast) instead of
 * leaving the student staring at the default Jitsi welcome page.
 */

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface LiveVideoPanelProps {
  /** Either a full https://… URL or a bare room slug. */
  meetingUrlOrRoom: string;
  /** Displayed in the call participant list. */
  userName: string;
  /** Optional pixel height. Defaults to 600px on desktop. */
  height?: number | string;
  /** Fires when the meeting ends or user hangs up — parent decides where to go. */
  onMeetingEnd?: () => void;
}

const JITSI_HOST = "meet.cognimight.com";

// Cached script load promise — avoids loading external_api.js multiple times
let scriptLoadPromise: Promise<void> | null = null;

function loadJitsiScript(host: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${host}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null; // allow retry next mount
      reject(new Error(`Failed to load Jitsi external_api.js from ${host}`));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/** Parse a room name out of a string that might be a full URL or bare slug. */
function extractRoomName(s: string): { host: string; room: string } {
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      const path = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      return { host: url.host, room: path || "unknown-room" };
    } catch {
      // fall through
    }
  }
  return { host: JITSI_HOST, room: s };
}

export default function LiveVideoPanel({
  meetingUrlOrRoom,
  userName,
  height = 600,
  onMeetingEnd,
}: LiveVideoPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    const { host, room } = extractRoomName(meetingUrlOrRoom);

    loadJitsiScript(host)
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        // Construct the Jitsi external API instance. This injects an
        // iframe into containerRef.current and gives us an event API.
        const api = new window.JitsiMeetExternalAPI(host, {
          roomName: room,
          parentNode: containerRef.current,
          width: "100%",
          height: typeof height === "number" ? height : "100%",
          userInfo: { displayName: userName },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
          },
        });
        apiRef.current = api;

        // Meeting lifecycle events — call the parent callback so it can
        // navigate away instead of leaving the student on the welcome page.
        const handleEnd = () => {
          if (onMeetingEnd) onMeetingEnd();
        };
        api.addListener("readyToClose", handleEnd);
        api.addListener("videoConferenceLeft", handleEnd);
      })
      .catch((err) => {
        console.error("[LiveVideoPanel] Failed to init Jitsi:", err);
      });

    return () => {
      disposed = true;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (e) {
          // best-effort
        }
        apiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingUrlOrRoom, userName]);

  return (
    <div
      ref={containerRef}
      data-testid="iframe-jitsi"
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
      }}
    />
  );
}
