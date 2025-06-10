export const parseCurrency = (input) => {
  const cleaned = input.replace(/[^\d.-]/g, '');
  const match = cleaned.match(/-?(\d+\.?\d*|\d*\.?\d+)/);
  return match ? parseFloat(match[0]) : NaN;
};

export const validateRange = (value, min, max) => !isNaN(value) && value >= min && value <= max;
