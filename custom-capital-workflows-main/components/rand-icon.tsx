import { LucideProps } from 'lucide-react'

export function RandIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M7 21V4h7a4 4 0 0 1 0 8H7" />
      <path d="M7 12l8 9" />
      <path d="M7 8h8" />
    </svg>
  )
}
