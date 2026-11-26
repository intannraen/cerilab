import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let readableMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          readableMessage = `Akses data (${parsed.operationType || 'operasi'}): ${parsed.error}`;
        }
      } catch {
        // Use raw message if not JSON
      }

      return (
        <div className="min-h-screen bg-[#FAF6F2] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#EADFD9] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#B91C1C]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold text-[#2A1A1F] mb-2">
              Terjadi Gangguan Sistem
            </h1>
            <p className="text-sm text-[#6E585F] leading-relaxed mb-6 break-words">
              {readableMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
