export async function openInApp(url: string): Promise<void> {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover', windowName: '_self' });
  } catch {
    window.location.href = url;
  }
}

export default openInApp;


