// Dev-only route (/dev/crash) that throws on purpose so the crash screen can be checked.
export default function CrashTestPage() {
  throw new Error('Intentional crash for testing the error boundary')
}
