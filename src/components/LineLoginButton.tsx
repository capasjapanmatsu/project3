import React from 'react';
import Button from './Button';
import { MessageCircle } from 'lucide-react';

interface Props {
  full?: boolean;
}

/**
 * Reusable LINE login button that sends users to the LIFF login entrypoint.
 * The LIFF page embeds a fixed LIFF_ID and sets the dpjp_session cookie on success.
 */
export const LineLoginButton: React.FC<Props> = ({ full = false }) => {
  const handleClick = () => {
    // Send to LIFF login in the same window so the session cookie is set for this browser
    window.location.assign('/liff/login');
  };

  return (
    <Button onClick={handleClick} className={`${full ? 'w-full' : ''} bg-green-600 hover:bg-green-700`}>
      <MessageCircle className="w-4 h-4 mr-2" />
      LINEでログイン
    </Button>
  );
};

export default LineLoginButton;


