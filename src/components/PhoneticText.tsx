export default function PhoneticText({ text, className = '' }: { text: string; className?: string }) {
  return <span className={className}>{text}</span>;
}
