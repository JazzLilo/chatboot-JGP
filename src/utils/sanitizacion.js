export const sanitizeFilename = (name) => {
  return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
};

export const sanitizeMessage = (text) => {
  return text.replace(/\n/g, ' ').substring(0, 1000);
};

