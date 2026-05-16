/**
 * LiveVideoPanel — embeds a Jitsi Meet room inside the CogniBoost app
 * via iframe. Reference implementation from the Live Classes Spec
 * (page 4) provided by Coral.
 *
 * Source URL pattern:
 *   https://<JITSI_HOST>/<roomId>#config.prejoinPageEnabled=false&...
 *
 * The host today is the public `meet.jit.si` (free, no signup, branded
 * with Jitsi). When Coral provisions a DigitalOcean droplet at
 * meet.cogniboost.com per spec Section 3, the host becomes hers and
 * we get full CogniBoost branding inside the video panel — but the
 * student-facing code stays identical.
 *
 * If the lab_session.meetingUrl is already a full URL (e.g. an old
 * Google Meet link from legacy sessions), the iframe loads that
 * directly. Otherwise we derive the room from the session ID.
 */

interface LiveVideoPanelProps {
  /** Either a full https://… URL or a bare room slug. */
  meetingUrlOrRoom: string;
  /** Displayed in the call participant list. */
  userName: string;
  /** Optional pixel height. Defaults to 600px on desktop. */
  height?: number | string;
}

const JITSI_HOST = "meet.jit.si"; // TODO: swap to meet.cogniboost.com once DigitalOcean droplet is provisioned

export default function LiveVideoPanel({ meetingUrlOrRoom, userName, height = 600 }: LiveVideoPanelProps) {
  // Build the iframe src.
  let src: string;
  if (/^https?:\/\//i.test(meetingUrlOrRoom)) {
    // Caller provided a full URL — use it as the base, append our params via #
    const base = meetingUrlOrRoom.split("#")[0];
    const params = buildParams(userName);
    src = `${base}#${params}`;
  } else {
    // Caller provided a room slug
    const params = buildParams(userName);
    src = `https://${JITSI_HOST}/${encodeURIComponent(meetingUrlOrRoom)}#${params}`;
  }

  return (
    <iframe
      src={src}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        border: 0,
        borderRadius: 12,
        background: "#000",
      }}
      title="CogniBoost Live Class"
      data-testid="iframe-jitsi"
    />
  );
}

function buildParams(userName: string): string {
  return [
    "config.prejoinPageEnabled=false",
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "config.disableDeepLinking=true",
    "interfaceConfig.MOBILE_APP_PROMO=false",
    "interfaceConfig.SHOW_JITSI_WATERMARK=false",
    "interfaceConfig.SHOW_BRAND_WATERMARK=false",
    "interfaceConfig.SHOW_POWERED_BY=false",
    `userInfo.displayName="${encodeURIComponent(userName)}"`,
  ].join("&");
}
