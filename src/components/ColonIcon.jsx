export default function ColonIcon({ size = 18, className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold leading-none ${className}`}
      style={{ width: size, height: size, fontSize: size }}
    >
      ₡
    </span>
  );
}