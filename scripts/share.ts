export function generateShareLink(blobHash: string, key: string): string {
  const base = window.location.origin + '/pages/download.html';
  return `${base}#${encodeURIComponent(blobHash)}:${encodeURIComponent(key)}`;
}
