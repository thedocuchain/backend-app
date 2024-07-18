export function sizeFormatter(num: number): string | number {
  return Math.abs(num) > 999999
    ? Math.sign(num) * parseFloat((Math.abs(num) / 1000000).toFixed(1)) + 'Mb'
    : Math.abs(num) > 999
      ? Math.sign(num) * parseFloat((Math.abs(num) / 1000).toFixed(1)) + 'kb'
      : Math.sign(num) * Math.abs(num);
}

export function formatDateString(dateString: Date): string {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  const minutesFormatted = minutes < 10 ? '0' + minutes : minutes.toString();

  const timezoneOffset = -date.getTimezoneOffset() / 60;
  const timezoneString =
    timezoneOffset >= 0 ? `+${timezoneOffset}` : timezoneOffset.toString();

  return `${month} ${day} ${year} ${hours}:${minutesFormatted} ${ampm} ${timezoneString}`;
}
