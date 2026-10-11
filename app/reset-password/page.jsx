import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Set a new password | Sportferry',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
