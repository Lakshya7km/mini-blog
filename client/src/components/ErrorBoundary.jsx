import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', margin: '16px 0' }}>
          <h4>Camera/QR Component Error</h4>
          <p style={{ fontSize: '13px', color: '#666' }}>
            The QR scanner encountered an error. If you are on mobile, ensure you are using HTTPS or localhost, as browsers block cameras on insecure HTTP connections.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
