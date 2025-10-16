import React from 'react';

interface Props {
  full?: boolean;
}

/**
 * Reusable LINE login button that sends users to the LIFF login entrypoint.
 * The LIFF page embeds a fixed LIFF_ID and sets the dpjp_session cookie on success.
 */
export const LineLoginButton: React.FC<Props> = () => {
  // 外部SNSログインは一時停止中
  return null;
};

export default LineLoginButton;


