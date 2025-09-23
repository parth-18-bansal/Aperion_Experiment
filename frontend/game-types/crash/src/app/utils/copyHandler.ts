export function copyToClipboard(text: string, onSuccess?: () => void, onError?: (err: any) => void) {
  if (!navigator.clipboard) {
    // fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // avoid scrolling to bottom
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful && onSuccess) onSuccess();
    } catch (err) {
      document.body.removeChild(textarea);
      if (onError) onError(err);
    }
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    if (onSuccess) onSuccess();
  }).catch((err) => {
    if (onError) onError(err);
  });
}