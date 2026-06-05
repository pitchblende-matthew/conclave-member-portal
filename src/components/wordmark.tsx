// The Conclave wordmark: lowercase serif "conclave" with a small olive sprig,
// recreated to match the marketing site's mark.
export default function Wordmark({ size = 1.5 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: `${size}rem` }}>
      <svg className="wordmark-sprig" viewBox="0 0 24 26" aria-hidden="true" focusable="false">
        <path d="M12 25 C 11.2 18 11.2 11 12 3" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <ellipse cx="12" cy="3" rx="1.5" ry="2.4" fill="currentColor" />
        <ellipse cx="8.2" cy="7.6" rx="3.4" ry="1.5" transform="rotate(-38 8.2 7.6)" fill="currentColor" />
        <ellipse cx="15.8" cy="7.6" rx="3.4" ry="1.5" transform="rotate(38 15.8 7.6)" fill="currentColor" />
        <ellipse cx="8.8" cy="13.6" rx="3.1" ry="1.4" transform="rotate(-34 8.8 13.6)" fill="currentColor" />
        <ellipse cx="15.2" cy="13.6" rx="3.1" ry="1.4" transform="rotate(34 15.2 13.6)" fill="currentColor" />
      </svg>
      <span className="wordmark-text">conclave</span>
    </span>
  );
}
