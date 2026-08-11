// Global Event Dispatcher to open the single instance Merch Modal
export function openMerchModal() {
  window.dispatchEvent(new CustomEvent('bloxvote:open-merch-modal'));
}
