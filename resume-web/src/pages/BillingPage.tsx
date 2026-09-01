import { Navigate } from 'react-router-dom';

/** 충전·잔액은 설정으로 통합. 결제 콜백 경로는 유지. */
export default function BillingPage() {
  return <Navigate to="/settings?tab=billing" replace />;
}
