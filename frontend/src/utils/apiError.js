export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors.join(' ');
  }
  if (err.error) return err.error;
  if (err.message) return err.message;
  return fallback;
}
