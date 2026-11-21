import { Toaster } from '@/components/ui/sonner'

// Toasts are sonner's (useUI.toast calls it); this only places them above the tab bar.
export default function Toast() {
  return <Toaster position="bottom-center" offset={{ bottom: 'calc(var(--tab) + var(--bot) + 12px)' }} mobileOffset={{ bottom: 'calc(var(--tab) + var(--bot) + 12px)' }} />
}
