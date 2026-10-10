import { Component, Suspense, type ReactNode } from 'react';

type Props = { children: ReactNode; onHome: () => void };

/** Keep family state in App while page code loads or a navigation request fails. */
export default class PageLoadBoundary extends Component<Props, { failed: boolean; retrying: boolean }> {
  state = { failed: false, retrying: false };
  private disposed = false;
  private retryController?: AbortController;
  static getDerivedStateFromError() { return { failed: true }; }
  componentWillUnmount() { this.disposed = true; this.retryController?.abort(); }
  private retry = async () => {
    if (this.state.retrying) return;
    this.setState({ retrying: true });
    const controller = new AbortController();
    this.retryController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      // WebKit can retain a failed module response across an ordinary reload.
      // Refresh only same-origin script assets already requested by this page.
      const scripts = [...new Set(performance.getEntriesByType('resource').map(entry => entry.name))]
        .filter(path => { const url = new URL(path); return url.origin === window.location.origin
          && url.pathname.includes('/assets/') && url.pathname.endsWith('.js'); });
      await Promise.allSettled(scripts.map(path => fetch(path, { cache: 'reload', signal: controller.signal })));
    } finally {
      window.clearTimeout(timeout);
      if (!this.disposed) window.location.reload();
    }
  };
  render() {
    if (this.state.failed) return <section className="v4-panel" role="alert" aria-label="內容載入失敗" aria-busy={this.state.retrying}>
      <h2>內容暫時無法開啟</h2>
      <p>請確認網路連線後重新載入，或先回到首頁。</p>
      <button type="button" className="secondary-button" disabled={this.state.retrying} onClick={() => void this.retry()}>{this.state.retrying ? '重新連線中…' : '重新載入網站'}</button>
      <button type="button" className="secondary-button" onClick={this.props.onHome}>回到首頁</button>
    </section>;
    return <Suspense fallback={<section className="v4-panel" role="status" aria-live="polite">
      <h2>正在開啟內容…</h2>
      <button type="button" className="secondary-button" onClick={this.props.onHome}>回到首頁</button>
    </section>}>{this.props.children}</Suspense>;
  }
}
