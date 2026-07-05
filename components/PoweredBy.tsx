// حقوق بناء النظام
export default function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-black/45 dark:text-white/45 ${className}`}>
      تم بناء هذا النظام بواسطة{" "}
      <a
        href="https://raslans.net"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand hover:underline"
      >
        رسلان للتسويق — raslans.net
      </a>
    </p>
  );
}
